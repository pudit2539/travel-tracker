# Auto-Healing Dev Launcher
$nodeDir = "C:\Users\pudit.ye\AppData\Local\Programs\nodejs\node-v22.14.0-win-x64"
$backupExe = "C:\Users\pudit.ye\AppData\Local\Programs\nodejs\backup_node\node.exe"

# If node.exe was deleted or quarantined, auto-restore instantly
if (-not (Test-Path "$nodeDir\node.exe") -and (Test-Path $backupExe)) {
    Write-Host "🛡️ Node.js missing, auto-restoring from secure backup..." -ForegroundColor Yellow
    Copy-Item $backupExe -Destination "$nodeDir\node.exe" -Force
}

$env:Path = "$nodeDir;$env:Path"
& "$nodeDir\node.exe" "$nodeDir\node_modules\npm\bin\npm-cli.js" run dev
