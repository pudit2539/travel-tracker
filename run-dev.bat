@echo off
set "NODE_DIR=C:\Users\pudit.ye\AppData\Local\Programs\nodejs\node-v22.14.0-win-x64"
set "BACKUP_EXE=C:\Users\pudit.ye\AppData\Local\Programs\nodejs\backup_node\node.exe"

if not exist "%NODE_DIR%\node.exe" (
    if exist "%BACKUP_EXE%" (
        echo [Shield] Auto-restoring Node.js from secure backup...
        copy /Y "%BACKUP_EXE%" "%NODE_DIR%\node.exe" >nul
    )
)

set "PATH=%NODE_DIR%;%PATH%"
"%NODE_DIR%\node.exe" "%NODE_DIR%\node_modules\npm\bin\npm-cli.js" run dev
