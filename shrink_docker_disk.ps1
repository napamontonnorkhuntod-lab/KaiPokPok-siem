Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   DOCKER VHDX SHRINK UTILITY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check Admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "`n[INFO] Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "`n[1/4] Stopping Docker Desktop and WSL..." -ForegroundColor Yellow
Stop-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
wsl --shutdown
Start-Sleep -Seconds 5

Write-Host "`n[2/4] Compacting docker_data.vhdx (This may take a while)..." -ForegroundColor Yellow
$diskpartScript = ".\diskpart_temp.txt"
$diskpartCmds = "select vdisk file=`"D:\DockerData\DockerDesktopWSL\disk\docker_data.vhdx`"`r`ncompact vdisk`r`nexit"
$diskpartCmds | Out-File -FilePath $diskpartScript -Encoding ascii

diskpart /s $diskpartScript | Out-Null
Remove-Item -Path $diskpartScript -ErrorAction SilentlyContinue

Write-Host "`n[3/4] Restarting Docker Desktop..." -ForegroundColor Yellow
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"

Write-Host "`n[4/4] Waiting for Docker Engine to be ready..." -ForegroundColor Yellow
$dockerReady = $false
$retryCount = 0
while (-not $dockerReady -and $retryCount -lt 30) {
    Start-Sleep -Seconds 2
    $status = docker info 2>&1
    if ($status -match "Containers:") {
        $dockerReady = $true
    } else {
        Write-Host "." -NoNewline -ForegroundColor Gray
        $retryCount++
    }
}

if ($dockerReady) {
    Write-Host "`n`n============================================" -ForegroundColor Green
    Write-Host "   DISK SHRINKING COMPLETE!" -ForegroundColor Green
    Write-Host "   Docker is now ready to use." -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
} else {
    Write-Host "`n`n[WARNING] Disk shrink complete, but Docker failed to start automatically." -ForegroundColor Red
}

Start-Sleep -Seconds 5
