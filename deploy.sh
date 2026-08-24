#!/bin/sh
set -e

echo "=== Actualizando codigo ==="
git pull

echo "=== Buildando imagen Docker ==="
docker build -t banco-de-tareas:latest .

echo "=== Reiniciando contenedor ==="
docker compose up -d

echo "=== Listo ==="
