@echo off
setlocal ENABLEDELAYEDEXPANSION

set ROOT_DIR=%~dp0..
set INFRA_DIR=%ROOT_DIR%\infrastructure

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker nao encontrado
  exit /b 1
)

echo Subindo Zaplify AI Flow (DEV)...
cd /d "%INFRA_DIR%"
docker compose up --build -d

echo OK!
echo API Gateway:      http://localhost:8080/health
echo WhatsApp Service: http://localhost:8081/health
echo Funnel Engine:    http://localhost:8082/health
echo IA Service:       http://localhost:8001/health
echo Analytics:        http://localhost:8002/health
