#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infrastructure"

# Verificações rápidas
command -v docker >/dev/null 2>&1 || { echo "Docker não encontrado"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "Docker Compose v2 não encontrado"; exit 1; }

echo "➡️ Subindo Zaplify AI Flow (DEV)..."
cd "$INFRA_DIR"
docker compose up --build -d

echo "✅ Tudo no ar!"
echo "APIs:"
echo " - API Gateway:      http://localhost:8080/health"
echo " - WhatsApp Service: http://localhost:8081/health"
echo " - Funnel Engine:    http://localhost:8082/health"
echo " - IA Service:       http://localhost:8001/health"
echo " - Analytics:        http://localhost:8002/health"
