#!/bin/bash

echo "==================================================="
echo "Agricultural Data Collection - One Click Installer"
echo "==================================================="

# Check for git
if ! command -v git &> /dev/null; then
    echo "Error: Git is not installed. Please install Git first."
    exit 1
fi

# Check for docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

echo "[1/2] Downloading the latest source code from GitHub..."
if [ -d "Agricultural-data-collection" ]; then
    echo "Directory exists. Updating repository..."
    cd Agricultural-data-collection
    git pull origin main
else
    git clone https://github.com/Nono0325/Agricultural-data-collection.git
    cd Agricultural-data-collection
fi

echo "[2/2] Building and starting Docker containers..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    docker compose up -d --build
fi

echo "==================================================="
echo "Installation Complete!"
echo "==================================================="
echo "Frontend Dashboard: http://localhost:3000"
echo "Backend API Docs:   http://localhost:8000/docs"
echo "==================================================="
