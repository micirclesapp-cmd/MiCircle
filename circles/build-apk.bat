@echo off
echo ========================================
echo Building Circles App APK
echo ========================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.

echo Checking eas.json...
if exist eas.json (
    echo [OK] eas.json found
) else (
    echo [ERROR] eas.json not found!
    pause
    exit /b 1
)
echo.

echo Starting EAS build...
echo This will take 15-20 minutes
echo.

eas build --platform android --profile preview --clear-cache

echo.
echo ========================================
echo Build command completed!
echo ========================================
pause
