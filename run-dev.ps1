$nodeDir = "C:\Users\pudit.ye\AppData\Local\Programs\nodejs\node-v22.14.0-win-x64"
$env:Path = "$nodeDir;$env:Path"
& "$nodeDir\node.exe" "$nodeDir\node_modules\npm\bin\npm-cli.js" run dev
