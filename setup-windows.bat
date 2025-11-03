@echo off
REM Perplexity Automation - Windows Setup Script
REM This script sets up the project on Windows

echo.
echo ========================================
echo Perplexity Automation - Windows Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo [INFO] Please install Node.js from https://nodejs.org/
    exit /b 1
)

echo [OK] Node.js version:
node --version
echo [OK] npm version:
npm --version
echo.

REM Install dependencies
echo [INFO] Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)

echo [OK] Dependencies installed
echo.

REM Build extension
echo [INFO] Building extension...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    exit /b 1
)

echo [OK] Build successful
echo.

REM Check if dist folder exists
if not exist "dist" (
    echo [ERROR] dist\ folder not found
    exit /b 1
)

echo [OK] Extension built in dist\ folder
echo.

REM Instructions
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Open Chrome/Edge browser
echo 2. Go to chrome://extensions (or edge://extensions)
echo 3. Enable 'Developer mode' (top right)
echo 4. Click 'Load unpacked'
echo 5. Select the 'dist\' folder from this directory
echo.
echo [INFO] Extension location: %CD%\dist
echo.
echo [INFO] To start processing:
echo    - Click extension icon
echo    - Wait 3 seconds for auto-start
echo    - Extension will process all 12 Excel files automatically
echo.
echo [OK] Setup complete!
echo.
pause

