# Zero-Labor SWARM Launcher
Write-Host "🚀 Launching S.W.A.R.M. v8.0 Architecture..." -ForegroundColor Cyan

$ProjectRoot = $PSScriptRoot
$SwarmOSDir = Join-Path $ProjectRoot "swarm_os"
$VenvDir = Join-Path $SwarmOSDir ".venv"
$VenvPython = "$VenvDir\Scripts\python.exe"
$ServerScript = "$SwarmOSDir\swarm\server.py"

# Start the server and monitor it
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$SwarmOSDir'; & '$VenvPython' '$ServerScript' --port 8000"

Write-Host "Waiting for server to bind..." -ForegroundColor DarkGray
Start-Sleep 10
Start-Process "http://localhost:8000/"
