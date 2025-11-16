@echo off
REM La Santa Landing Page - Simple Start (ohne Docker)
REM ====================================================

echo.
echo ======================================================
echo.
echo           LA SANTA - Landing Page Konzept
echo.
echo          Lealtad. Honor. Sangre.
echo.
echo ======================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python ist nicht installiert!
    echo.
    echo Bitte installiere Python von: https://www.python.org/downloads/
    echo.
    echo ODER starte Docker Desktop und nutze start.bat
    pause
    exit /b 1
)

echo [INFO] Starte lokalen Webserver...
echo.
echo [SUCCESS] Server gestartet!
echo.
echo [INFO] Oeffne im Browser: http://localhost:8080
echo.
echo Druecke Ctrl+C zum Stoppen
echo.
echo ======================================================
echo.

python -m http.server 8080

pause

