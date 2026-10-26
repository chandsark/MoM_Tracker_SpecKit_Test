<#
.SYNOPSIS
    Starts the MoM Tracker web application: the API (Express + SQLite) and the web app (Vite).

.DESCRIPTION
    Run from any PowerShell window:

        powershell -ExecutionPolicy Bypass -File .\start_web_app.ps1

    On first run it installs dependencies, creates backend\.env with a random session secret,
    applies database migrations, and seeds demo data. If the preferred ports are busy it uses the
    next free ones. It waits until both servers are healthy, opens the browser, and keeps running
    until you press Ctrl+C, which stops both servers.

    Server output is written to logs\api.log and logs\web.log.

.PARAMETER ApiPort
    Preferred API port (default 3000).

.PARAMETER WebPort
    Preferred web app port (default 5173).

.PARAMETER NoBrowser
    Do not open the browser.

.PARAMETER SkipSeed
    Do not load the demo data.

.EXAMPLE
    .\start_web_app.ps1 -ApiPort 4000 -NoBrowser
#>
[CmdletBinding()]
param(
    [int]$ApiPort = 3000,
    [int]$WebPort = 5173,
    [switch]$NoBrowser,
    [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Backend = Join-Path $Root 'backend'
$LogDir = Join-Path $Root 'logs'

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail([string]$Message) {
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

# Runs a command in a directory and stops the script if it fails.
function Invoke-Checked([string]$Directory, [string]$Command) {
    Push-Location $Directory
    try {
        & cmd.exe /d /c $Command
        if ($LASTEXITCODE -ne 0) { Fail "'$Command' failed (exit code $LASTEXITCODE)." }
    }
    finally {
        Pop-Location
    }
}

function Test-PortFree([int]$Port) {
    # The OS listening table catches IPv6/dual-stack listeners (as Node uses) that a plain IPv4
    # bind test misses on Windows.
    if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
        return $false
    }
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::IPv6Any, $Port)
        $listener.Server.DualMode = $true
        $listener.ExclusiveAddressUse = $true
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($listener) { $listener.Stop() }
    }
}

function Get-FreePort([int]$Preferred) {
    for ($port = $Preferred; $port -lt $Preferred + 50; $port++) {
        if (Test-PortFree $port) { return $port }
    }
    Fail "No free port found between $Preferred and $($Preferred + 49)."
}

function Wait-ForUrl([string]$Url, [System.Diagnostics.Process]$Process, [string]$Name, [string]$Log) {
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) { Fail "$Name stopped while starting. See $Log" }
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { return }
        }
        catch {
            # Not up yet.
        }
        Start-Sleep -Milliseconds 500
    }
    Fail "$Name did not start within 90 seconds. See $Log"
}

# Stops a server and everything it started (npm -> node -> tsx/vite).
function Stop-Tree([System.Diagnostics.Process]$Process) {
    if ($Process -and -not $Process.HasExited) {
        & taskkill.exe /PID $Process.Id /T /F 2>&1 | Out-Null
    }
}

# --- Prerequisites ---------------------------------------------------------------------------

Write-Step 'Checking prerequisites'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail 'Node.js is not installed. Install Node.js 22 LTS from https://nodejs.org and try again.'
}
$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) {
    Fail "Node.js 22 or later is required (found $(& node --version))."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Fail 'npm is not available. Reinstall Node.js 22 LTS from https://nodejs.org.'
}

# --- One-time setup --------------------------------------------------------------------------

if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
    Write-Step 'Installing dependencies (first run only, this can take a few minutes)'
    Invoke-Checked $Root 'npm install'
}

$envFile = Join-Path $Backend '.env'
if (-not (Test-Path $envFile)) {
    Write-Step 'Creating backend\.env with a random session secret'
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    $content = (Get-Content (Join-Path $Backend '.env.example') -Raw) `
        -replace '(?m)^SESSION_SECRET=.*$', "SESSION_SECRET=$secret"
    [System.IO.File]::WriteAllText($envFile, $content)
}

Write-Step 'Applying database migrations'
Invoke-Checked $Backend 'npx prisma migrate deploy'

if (-not $SkipSeed) {
    Write-Step 'Loading demo data (skipped if already present)'
    Invoke-Checked $Backend 'npm run db:seed'
}

# --- Start servers ---------------------------------------------------------------------------

$ApiPort = Get-FreePort $ApiPort
$WebPort = Get-FreePort $WebPort
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$apiLog = Join-Path $LogDir 'api.log'
$webLog = Join-Path $LogDir 'web.log'

# Child processes inherit these; backend\.env never overrides variables that are already set.
$env:PORT = "$ApiPort"
$env:API_URL = "http://localhost:$ApiPort"

$api = $null
$web = $null
try {
    Write-Step "Starting the API on port $ApiPort"
    $api = Start-Process -FilePath 'cmd.exe' -WorkingDirectory $Root -PassThru -WindowStyle Hidden `
        -ArgumentList '/d', '/c', "npm run start -w backend > `"$apiLog`" 2>&1"
    Wait-ForUrl "http://localhost:$ApiPort/api/health" $api 'The API' $apiLog

    Write-Step "Starting the web app on port $WebPort"
    $web = Start-Process -FilePath 'cmd.exe' -WorkingDirectory $Root -PassThru -WindowStyle Hidden `
        -ArgumentList '/d', '/c', "npm run dev -w frontend -- --port $WebPort --strictPort > `"$webLog`" 2>&1"
    Wait-ForUrl "http://localhost:$WebPort/api/health" $web 'The web app' $webLog

    $url = "http://localhost:$WebPort/"
    Write-Host ''
    Write-Host "MoM Tracker is running at $url" -ForegroundColor Green
    if (-not $SkipSeed) {
        Write-Host 'Demo sign-in: olivia@example.com / Password123!  (also arjun@, mei@, sam@example.com)'
    }
    Write-Host "Logs: $apiLog and $webLog"
    Write-Host 'Press Ctrl+C to stop both servers.' -ForegroundColor Yellow
    if (-not $NoBrowser) { Start-Process $url }

    while ($true) {
        if ($api.HasExited) { Fail "The API stopped unexpectedly. See $apiLog" }
        if ($web.HasExited) { Fail "The web app stopped unexpectedly. See $webLog" }
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host ''
    Write-Step 'Stopping servers'
    Stop-Tree $web
    Stop-Tree $api
}
