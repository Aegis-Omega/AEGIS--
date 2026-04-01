# Zero-Labor SWARM Deployer
Write-Host "🚢 Deploying S.W.A.R.M. to Cloud Run..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\swarm_os"
.\deploy.ps1 $args
