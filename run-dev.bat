@echo off
set "NODE_DIR=C:\Users\pudit.ye\AppData\Local\Programs\nodejs\node-v22.14.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"
"%NODE_DIR%\node.exe" "%NODE_DIR%\node_modules\npm\bin\npm-cli.js" run dev
