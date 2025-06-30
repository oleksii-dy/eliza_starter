# PowerShell cleanup script for CLI tests on Windows
# Kills any lingering processes from test runs

Write-Host "Cleaning up test processes on Windows..."

# Function to safely kill processes
function Stop-ProcessSafely {
    param(
        [string]$ProcessName,
        [string]$PathFilter = $null
    )
    
    try {
        $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
        
        if ($PathFilter) {
            $processes = $processes | Where-Object { $_.Path -like $PathFilter }
        }
        
        if ($processes) {
            Write-Host "Stopping $($processes.Count) $ProcessName processes..."
            $processes | Stop-Process -Force -ErrorAction SilentlyContinue
            return $processes.Count
        }
        return 0
    } catch {
        Write-Host "Error stopping $ProcessName processes: $($_.Exception.Message)"
        return 0
    }
}

# Function to kill processes on specific ports
function Stop-ProcessOnPort {
    param([int]$Port)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) {
            Write-Host "Cleaning up $($connections.Count) connections on port $Port"
            $connections | ForEach-Object { 
                try {
                    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
                } catch {
                    # Ignore individual process cleanup errors
                }
            }
            return $connections.Count
        }
        return 0
    } catch {
        return 0
    }
}

# Kill bun processes running dist/index.js
$bunProcesses = Get-Process | Where-Object { 
    $_.ProcessName -like "*bun*" -and 
    ($_.Path -like "*dist*index.js*" -or $_.CommandLine -like "*dist*index.js*")
}

if ($bunProcesses) {
    Write-Host "Stopping $($bunProcesses.Count) bun processes running dist/index.js..."
    $bunProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Kill node processes running dist/index.js
$nodeProcesses = Get-Process | Where-Object { 
    $_.ProcessName -like "*node*" -and 
    ($_.Path -like "*dist*index.js*" -or $_.CommandLine -like "*dist*index.js*")
}

if ($nodeProcesses) {
    Write-Host "Stopping $($nodeProcesses.Count) node processes running dist/index.js..."
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Kill processes on common test ports
$testPorts = @(3000, 3100, 3001, 3101)
foreach ($port in $testPorts) {
    $count = Stop-ProcessOnPort -Port $port
    if ($count -gt 0) {
        Write-Host "Cleaned up $count connections on port $port"
    }
}

# Additional cleanup for any Eliza-related processes
$elizaProcesses = Get-Process | Where-Object { 
    $_.ProcessName -like "*eliza*" -or 
    $_.Path -like "*eliza*" -or 
    $_.CommandLine -like "*eliza*"
}

if ($elizaProcesses) {
    Write-Host "Stopping $($elizaProcesses.Count) Eliza-related processes..."
    $elizaProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Force garbage collection
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

# Wait a moment for cleanup to complete
Start-Sleep -Seconds 2

Write-Host "Windows cleanup complete"