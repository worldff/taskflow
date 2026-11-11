#!/usr/bin/env bash
# Deploy TaskFlow full stack memakai Podman Pod (tanpa compose).
# Tiga container (frontend, backend, db) berada dalam satu pod sehingga berbagi
# network namespace dan saling terhubung lewat localhost. Hanya port frontend
# yang dipublikasikan ke host.
set -euo pipefail

POD=taskflow-pod
DB_PASS=${POSTGRES_PASSWORD:-taskflow}
SECRET=${SECRET_KEY:-ganti-dengan-secret-acak}

echo "==> Build image backend & frontend dengan Podman"
podman build -t localhost/taskflow-backend:latest ./backend
podman build -t localhost/taskflow-frontend:latest ./frontend

echo "==> Bersihkan pod lama (jika ada)"
podman pod rm -f "$POD" 2>/dev/null || true

echo "==> Buat pod & publish port 8080 -> 80 (Nginx)"
podman pod create --name "$POD" -p 8080:80

echo "==> [1/3] PostgreSQL"
podman volume create taskflow-pgdata >/dev/null 2>&1 || true
podman run -d --pod "$POD" --name taskflow-db \
  -e POSTGRES_DB=taskflow -e POSTGRES_USER=taskflow -e POSTGRES_PASSWORD="$DB_PASS" \
  -v taskflow-pgdata:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine
until podman exec taskflow-db pg_isready -U taskflow -d taskflow >/dev/null 2>&1; do sleep 2; done

echo "==> [2/3] Backend API"
podman run -d --pod "$POD" --name taskflow-backend \
  -e DATABASE_URL="postgresql+psycopg://taskflow:${DB_PASS}@127.0.0.1:5432/taskflow" \
  -e SECRET_KEY="$SECRET" \
  -e ADMIN_EMAIL="${ADMIN_EMAIL:-admin@taskflow.id}" \
  -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}" \
  localhost/taskflow-backend:latest

echo "==> [3/3] Frontend (Nginx)"
podman run -d --pod "$POD" --name taskflow-frontend \
  -e BACKEND_URL=http://127.0.0.1:5000 \
  localhost/taskflow-frontend:latest

podman pod ps
podman ps --pod
echo "TaskFlow berjalan di http://localhost:8080"
