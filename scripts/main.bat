@echo off

set output=
set packet_size=188

set log_file=%~dp0..\log\split.log

if exist "%~dp0../bin/node.exe" (
  "%~dp0../bin/node.exe" "%~dp0../dragdrop.js" %*
) else (
  node "%~dp0../dragdrop.js" %*
)

pause
