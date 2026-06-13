#!/bin/bash

# Configuration
# Change this if your Docker Hub username is different
DOCKER_USERNAME="jsoehner"
IMAGE_NAME="${DOCKER_USERNAME}/dbsc-demo:latest"
PORT="5000"

echo "==========================================="
echo "   DBSC Security Demo - Docker Launcher    "
echo "==========================================="

echo "[*] Stopping and removing any existing demo containers..."
docker stop dbsc-demo 2>/dev/null
docker rm dbsc-demo 2>/dev/null

echo "[*] Pulling the latest image from Docker Hub: $IMAGE_NAME"
docker pull $IMAGE_NAME

if [ $? -ne 0 ]; then
    echo "[!] Error pulling image. Please make sure the GitHub action has finished publishing the image to Docker Hub."
    exit 1
fi

echo "[*] Starting the DBSC demo container on port $PORT..."
docker run -d --name dbsc-demo -p $PORT:5000 $IMAGE_NAME

if [ $? -eq 0 ]; then
    echo "==========================================="
    echo "[+] Container started successfully!"
    echo "[+] Open your web browser and navigate to: http://localhost:$PORT"
    echo "==========================================="
else
    echo "[!] Failed to start container."
fi
