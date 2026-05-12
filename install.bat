@echo off
echo ===================================================
echo Agricultural Data Collection - One Click Installer
echo ===================================================

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Git is not installed or not in PATH. Please install Git first.
    pause
    exit /b 1
)

REM Check if docker is installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Docker is not installed or not in PATH. Please install Docker Desktop and start it.
    pause
    exit /b 1
)

echo [1/2] Downloading the latest source code from GitHub...
if exist "Agricultural-data-collection" (
    echo The directory "Agricultural-data-collection" already exists. Updating it...
    cd Agricultural-data-collection
    git pull origin main
) else (
    git clone https://github.com/Nono0325/Agricultural-data-collection.git
    cd Agricultural-data-collection
)

echo [2/2] Building and starting Docker containers...
docker compose up -d --build

echo ===================================================
echo Installation Complete!
echo ===================================================
echo Frontend Dashboard: http://localhost:3000
echo Backend API Docs:   http://localhost:8000/docs
echo ===================================================
pause
