# Windows Test Helper Script for Eliza CLI
# Handles Windows-specific issues with Bun, process management, and test execution

param(
    [string]$TestCommand = "",
    [int]$MaxRetries = 2,
    [int]$TimeoutMinutes = 15
)

# Set error handling
$ErrorActionPreference = "Continue"

Write-Host "=== Windows CLI Test Helper ==="
Write-Host "Test Command: $TestCommand"
Write-Host "Max Retries: $MaxRetries"
Write-Host "Timeout: $TimeoutMinutes minutes"

# Function to check if a port is in use
function Test-PortInUse {
    param([int]$Port)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $connections.Count -gt 0
    } catch {
        return $false
    }
}

# Function to find and kill processes on a port
function Stop-ProcessOnPort {
    param([int]$Port)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) {
            Write-Host "Killing $($connections.Count) processes on port $Port"
            $connections | ForEach-Object { 
                try {
                    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
                } catch {
                    # Ignore errors
                }
            }
            Start-Sleep -Seconds 2
        }
    } catch {
        # Port not in use, which is fine
    }
}

# Function to cleanup test processes
function Invoke-TestCleanup {
    Write-Host "Performing comprehensive test cleanup..."
    
    # Kill test-related processes
    $processPatterns = @("*bun*", "*node*")
    
    foreach ($pattern in $processPatterns) {
        try {
            $processes = Get-Process | Where-Object { 
                $_.ProcessName -like $pattern -and 
                ($_.Path -like "*dist*index.js*" -or 
                 $_.Path -like "*eliza*" -or 
                 $_.CommandLine -like "*test*" -or
                 $_.CommandLine -like "*dist*index.js*")
            }
            
            if ($processes) {
                Write-Host "Stopping $($processes.Count) processes matching $pattern"
                $processes | Stop-Process -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "Error cleaning up $pattern processes: $($_.Exception.Message)"
        }
    }
    
    # Clean up test ports
    $testPorts = @(3000, 3100, 3001, 3101, 8080, 8081)
    foreach ($port in $testPorts) {
        Stop-ProcessOnPort -Port $port
    }
    
    # Force garbage collection
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    
    Start-Sleep -Seconds 3
    Write-Host "Cleanup completed"
}

# Function to verify Bun is working
function Test-BunInstallation {
    Write-Host "Verifying Bun installation..."
    
    try {
        $bunPath = Get-Command bun -ErrorAction SilentlyContinue
        if (-not $bunPath) {
            Write-Host "ERROR: Bun not found in PATH"
            return $false
        }
        
        Write-Host "Bun found at: $($bunPath.Source)"
        
        # Test basic functionality
        $versionOutput = & bun --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Bun version: $versionOutput"
            return $true
        } else {
            Write-Host "ERROR: Bun version check failed"
            return $false
        }
    } catch {
        Write-Host "ERROR: Exception while checking Bun: $($_.Exception.Message)"
        return $false
    }
}

# Function to run tests with retry logic
function Invoke-TestWithRetry {
    param([string]$Command)
    
    $attempt = 1
    $success = $false
    
    while ($attempt -le $MaxRetries -and -not $success) {
        Write-Host ""
        Write-Host "=== Test Attempt $attempt of $MaxRetries ==="
        
        # Pre-test cleanup
        Invoke-TestCleanup
        
        # Verify environment
        if (-not (Test-BunInstallation)) {
            Write-Host "ERROR: Bun verification failed on attempt $attempt"
            if ($attempt -eq $MaxRetries) {
                return $false
            }
            $attempt++
            continue
        }
        
        # Set environment variables
        $env:NODE_OPTIONS = "--max-old-space-size=6144 --expose-gc"
        $env:ELIZA_TEST_MODE = "true"
        $env:FORCE_COLOR = "0"
        
        try {
            Write-Host "Executing: $Command"
            
            # Create a job to run the test with timeout
            $job = Start-Job -ScriptBlock {
                param($cmd, $envVars)
                
                # Set environment variables in the job
                foreach ($env in $envVars.GetEnumerator()) {
                    Set-Item -Path "env:$($env.Key)" -Value $env.Value
                }
                
                # Execute the command
                Invoke-Expression $cmd
                return $LASTEXITCODE
            } -ArgumentList $Command, @{
                NODE_OPTIONS = $env:NODE_OPTIONS
                ELIZA_TEST_MODE = $env:ELIZA_TEST_MODE
                FORCE_COLOR = $env:FORCE_COLOR
            }
            
            # Wait for job with timeout
            $timeoutSeconds = $TimeoutMinutes * 60
            $completed = Wait-Job -Job $job -Timeout $timeoutSeconds
            
            if ($completed) {
                $result = Receive-Job -Job $job
                $exitCode = $job.ChildJobs[0].Output | Select-Object -Last 1
                
                if ($exitCode -eq 0) {
                    Write-Host "✓ Tests passed successfully on attempt $attempt"
                    $success = $true
                } else {
                    Write-Host "✗ Tests failed with exit code: $exitCode"
                }
            } else {
                Write-Host "✗ Tests timed out after $TimeoutMinutes minutes"
                Stop-Job -Job $job
            }
            
            Remove-Job -Job $job -Force
            
        } catch {
            Write-Host "✗ Test execution failed: $($_.Exception.Message)"
        }
        
        if (-not $success) {
            if ($attempt -lt $MaxRetries) {
                Write-Host "Preparing for retry..."
                Invoke-TestCleanup
                Start-Sleep -Seconds 10
            }
        }
        
        $attempt++
    }
    
    return $success
}

# Main execution
Write-Host "Starting Windows CLI test execution..."

# Initial cleanup
Invoke-TestCleanup

# Verify Bun installation
if (-not (Test-BunInstallation)) {
    Write-Host "FATAL: Bun installation verification failed"
    exit 1
}

# Run tests
if ([string]::IsNullOrEmpty($TestCommand)) {
    Write-Host "No test command provided, performing verification only"
    exit 0
}

$testSuccess = Invoke-TestWithRetry -Command $TestCommand

# Final cleanup
Invoke-TestCleanup

if ($testSuccess) {
    Write-Host ""
    Write-Host "✓ All tests completed successfully"
    exit 0
} else {
    Write-Host ""
    Write-Host "✗ Tests failed after $MaxRetries attempts"
    exit 1
}