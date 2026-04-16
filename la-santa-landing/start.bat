@echo off
REM La Santa Landing Page - Start Script (Windows)
REM ===============================================

echo.
echo ======================================================
echo.
echo           LA SANTA - Landing Page Konzept
echo.
echo          Lealtad. Honor. Sangre.
echo.
echo ======================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker ist nicht installiert!
    echo         Bitte installiere Docker: https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker Compose ist nicht installiert!
        echo         Bitte installiere Docker Compose
        pause
        exit /b 1
    )
)

echo [INFO] Umgebung wird vorbereitet...
echo.

echo Welche Umgebung moechtest du starten?
echo.
echo   1) Development (Port 8080)
echo   2) Production (Port 80)
echo.
set /p choice="Auswahl [1/2]: "

if "%choice%"=="1" (
    echo.
    echo [INFO] Starte Development-Umgebung...
    echo.
    docker-compose down >nul 2>&1
    docker-compose up -d --build
    
    if errorlevel 1 (
        echo.
        echo [ERROR] Fehler beim Starten!
        pause
        exit /b 1
    )
    
    echo.
    echo [SUCCESS] Erfolgreich gestartet!
    echo.
    echo [INFO] Oeffne im Browser: http://localhost:8080
    echo.
    echo Nuetzliche Befehle:
    echo   docker-compose logs -f    # Logs anzeigen
    echo   docker-compose down       # Stoppen
    echo   docker-compose restart    # Neustarten
    echo.
) else if "%choice%"=="2" (
    echo.
    echo [INFO] Starte Production-Umgebung...
    echo.
    docker-compose -f docker-compose.prod.yml down >nul 2>&1
    docker-compose -f docker-compose.prod.yml up -d --build
    
    if errorlevel 1 (
        echo.
        echo [ERROR] Fehler beim Starten!
        pause
        exit /b 1
    )
    
    echo.
    echo [SUCCESS] Erfolgreich gestartet!
    echo.
    echo [INFO] Oeffne im Browser: http://localhost
    echo.
    echo Nuetzliche Befehle:
    echo   docker-compose -f docker-compose.prod.yml logs -f    # Logs anzeigen
    echo   docker-compose -f docker-compose.prod.yml down       # Stoppen
    echo   docker-compose -f docker-compose.prod.yml restart    # Neustarten
    echo.
) else (
    echo.
    echo [ERROR] Ungueltige Auswahl!
    pause
    exit /b 1
)

echo ======================================================
echo.
echo   La Santa - Desde las Sombras
echo.
echo ======================================================
echo.
pause

