#!/bin/sh
set -e

echo "=== Actualizando codigo ==="
git pull

echo "=== Buildando imagen Docker ==="
docker build -t banco-de-tareas:latest .

echo "=== Re-poblando runtime files (conservando DB) ==="
docker create --name temp_deploy banco-de-tareas:latest

# Limpiar chunks viejos con hashes obsoletos
rm -rf /DATA/AppData/BancoTareas/dist/server/chunks/

for dir in dist src node_modules public; do
  docker cp temp_deploy:/app/"$dir" /DATA/AppData/BancoTareas/
done

for f in astro.config.mjs package.json package-lock.json; do
  docker cp temp_deploy:/app/"$f" /DATA/AppData/BancoTareas/
done

docker rm temp_deploy

echo "=== Reiniciando contenedor ==="
docker compose down
docker compose up -d

echo "=== Listo ==="
