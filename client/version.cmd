@echo off
setlocal enabledelayedexpansion

set "LERNA_FILE=..\lerna.json"

if not exist "%LERNA_FILE%" (
    echo Error: %LERNA_FILE% does not exist.
    exit /b 1
)

for /f "tokens=2 delims=:, " %%a in ('findstr "version" "%LERNA_FILE%"') do (
    set "VERSION=%%~a"
)

if "!VERSION!"=="" (
    echo Error: Unable to extract version from %LERNA_FILE%.
    exit /b 1
)

echo { "version": !VERSION! } > src\info.json
