# cria .gitignore em cada microserviço a partir da RAIZ do projeto

# Raiz do projeto (pasta acima de scripts)
$ROOT = Resolve-Path "$PSScriptRoot\.."

# Pastas dos serviços (relativas à raiz)
$services = @(
  "services/api-gateway",
  "services/whatsapp-service",
  "services/funnel-engine",
  "services/ia-conversational",
  "services/analytics-service"
)

$gitignoreContent = @"
# Dependências
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.venv/

# Builds
dist/
build/

# Env/local
.env
.env.local
.env.*.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
*.log

# IDEs
.vscode/
.idea/

# Temporários
tmp/
temp/
.DS_Store

# Uploads/sessões
uploads/
sessions/
"@

foreach ($service in $services) {
  $dir = Join-Path $ROOT $service
  if (-not (Test-Path $dir)) {
    Write-Warning "Pasta não encontrada: $dir (pulando)"
    continue
  }
  $filePath = Join-Path $dir ".gitignore"
  Set-Content -Path $filePath -Value $gitignoreContent -Encoding UTF8
  Write-Host "✅ Criado .gitignore em $service"
}

# (Opcional) .gitignore na raiz
$rootIgnore = @"
# Raiz
**/.env
**/.venv/
**/__pycache__/
**/node_modules/
**/dist/
**/build/
.DS_Store
"@
Set-Content -Path (Join-Path $ROOT ".gitignore") -Value $rootIgnore -Encoding UTF8 -NoNewline
Write-Host "✅ Atualizado .gitignore na raiz"
