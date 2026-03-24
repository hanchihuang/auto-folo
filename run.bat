@echo off
setlocal
cd /d %~dp0
node .\bin\auto-folo.js run %*
endlocal
