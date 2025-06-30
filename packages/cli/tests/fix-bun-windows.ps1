# Windows Bun Installation Fixer
# Addresses common Bun issues on Windows CI environments

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "=== Windows Bun Installation Fixer ==="

# Function to test if Bun is working
function Test-BunWorking {
    try {
        $bunPath = Get-Command bun -ErrorAction SilentlyContinue
        if (-not $bunPath) {
            Write-Verbose "Bun not found in PATH"
            return $false
        }
        
        Write-Verbose "Bun found at: $($bunPath.Source)"
        
        # Test basic functionality
        $versionOutput = & bun --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Bun is working: $versionOutput"
            return $true
        } else {
            Write-Verbose "Bun version check failed"
            return $false
        }
    } catch {
        Write-Verbose "Exception testing Bun: $($_.Exception.Message)"
        return $false
    }
}

# Function to fix Bun PATH issues
function Repair-BunPath {
    Write-Host "Attempting to fix Bun PATH issues..."
    
    # Common Bun installation paths
    $bunPaths = @(
        "$env:USERPROFILE\.bun\bin",
        "$env:LOCALAPPDATA\bun\bin",
        "$env:APPDATA\bun\bin",
        "$env:ProgramFiles\bun\bin",
        "$env:ProgramFiles(x86)\bun\bin"
    )
    
    foreach ($path in $bunPaths) {
        if (Test-Path "$path\bun.exe") {
            Write-Host "Found Bun at: $path"
            
            # Add to PATH for current session
            $env:PATH = "$path;$env:PATH"
            
            # Test if it works now
            if (Test-BunWorking) {
                Write-Host "✓ Successfully added Bun to PATH"
                return $true
            }
        }
    }
    
    return $false
}

# Function to reinstall Bun if needed
function Reinstall-Bun {
    Write-Host "Attempting to reinstall Bun..."
    
    try {
        # Download and run Bun installer
        $installScript = Invoke-WebRequest -Uri "https://bun.sh/install.ps1" -UseBasicParsing
        
        if ($installScript.StatusCode -eq 200) {
            Write-Host "Downloaded Bun installer, executing..."
            
            # Execute the installer
            Invoke-Expression $installScript.Content
            
            # Wait a moment for installation
            Start-Sleep -Seconds 5
            
            # Test if it works now
            if (Test-BunWorking) {
                Write-Host "✓ Bun reinstallation successful"
                return $true
            } else {
                # Try PATH repair after reinstall
                return Repair-BunPath
            }
        }
    } catch {
        Write-Host "Error during Bun reinstallation: $($_.Exception.Message)"
    }
    
    return $false
}

# Function to fix Bun cache issues
function Fix-BunCache {
    Write-Host "Clearing Bun cache..."
    
    $cachePaths = @(
        "$env:USERPROFILE\.bun\install\cache",
        "$env:LOCALAPPDATA\bun\cache",
        "$env:TEMP\bun-cache"
    )
    
    foreach ($cachePath in $cachePaths) {
        if (Test-Path $cachePath) {
            try {
                Write-Host "Clearing cache: $cachePath"
                Remove-Item -Recurse -Force $cachePath -ErrorAction SilentlyContinue
            } catch {
                Write-Verbose "Could not clear cache at $cachePath"
            }
        }
    }
}

# Function to fix file permissions
function Fix-BunPermissions {
    Write-Host "Checking Bun file permissions..."
    
    try {
        $bunPath = Get-Command bun -ErrorAction SilentlyContinue
        if ($bunPath) {
            $bunFile = $bunPath.Source
            
            # Check if file is executable
            $acl = Get-Acl $bunFile
            Write-Verbose "Current ACL for $bunFile : $($acl.Access.Count) entries"
            
            # Try to ensure execute permissions
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
                [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
                "FullControl",
                "Allow"
            )
            
            $acl.SetAccessRule($accessRule)
            Set-Acl -Path $bunFile -AclObject $acl
            
            Write-Host "✓ Updated Bun file permissions"
        }
    } catch {
        Write-Verbose "Could not update Bun permissions: $($_.Exception.Message)"
    }
}

# Main execution
Write-Host "Checking current Bun status..."

if (Test-BunWorking -and -not $Force) {
    Write-Host "✓ Bun is already working correctly"
    exit 0
}

Write-Host "Bun needs fixing, starting repair process..."

# Step 1: Try PATH repair
if (Repair-BunPath) {
    exit 0
}

# Step 2: Clear cache and try again
Fix-BunCache
if (Test-BunWorking) {
    Write-Host "✓ Bun fixed after cache clearing"
    exit 0
}

# Step 3: Fix permissions
Fix-BunPermissions
if (Test-BunWorking) {
    Write-Host "✓ Bun fixed after permission repair"
    exit 0
}

# Step 4: Reinstall if needed
if ($Force -or -not (Test-BunWorking)) {
    if (Reinstall-Bun) {
        exit 0
    }
}

# Final check
if (Test-BunWorking) {
    Write-Host "✓ Bun is now working correctly"
    exit 0
} else {
    Write-Host "✗ Could not fix Bun installation"
    
    # Diagnostic information
    Write-Host ""
    Write-Host "=== DIAGNOSTIC INFORMATION ==="
    Write-Host "PATH: $env:PATH"
    Write-Host "User Profile: $env:USERPROFILE"
    Write-Host "Local AppData: $env:LOCALAPPDATA"
    
    # Check for any bun.exe files
    Write-Host "Searching for bun.exe files..."
    $bunFiles = Get-ChildItem -Path $env:USERPROFILE -Name "bun.exe" -Recurse -ErrorAction SilentlyContinue
    if ($bunFiles) {
        Write-Host "Found bun.exe files:"
        $bunFiles | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "No bun.exe files found in user profile"
    }
    
    Write-Host "=============================="
    exit 1
}