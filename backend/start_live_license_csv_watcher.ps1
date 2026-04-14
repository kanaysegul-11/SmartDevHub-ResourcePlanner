$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Resolve-Path (Join-Path $scriptDir "..")
$csvDir = Join-Path $projectDir "sample-data\live-licenses"
$logFile = Join-Path $scriptDir "live_license_csv_watcher.log"
$venvPython = Join-Path $projectDir "venv\Scripts\python.exe"
$dotVenvPython = Join-Path $projectDir ".venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    $pythonExe = $venvPython
} elseif (Test-Path $dotVenvPython) {
    $pythonExe = $dotVenvPython
} else {
    $pythonExe = "python"
}

Set-Location $scriptDir

Write-Host "Live CSV watcher starting..." -ForegroundColor Cyan
Write-Host "Python: $pythonExe"
Write-Host "CSV directory: $csvDir"
Write-Host "Log file: $logFile"
Write-Host "Watcher will keep this terminal open. Stop with Ctrl+C." -ForegroundColor Yellow

& $pythonExe manage.py watch_live_license_csvs --directory $csvDir --interval 5 2>&1 |
    Tee-Object -FilePath $logFile -Append
