# ================================================================
# PowerShell Tasks for IA Conversational Service
# ================================================================

param(
    [Parameter(Position = 0)]
    [string]$Task = "help"
)

# Variables
$ServiceName = "ia-conversational"
$DockerImage = "zaplify/$ServiceName"
$DockerTag = "latest"
$Port = 8001

function Show-Help {
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "  IA Conversational Service - Development Tasks" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Setup Commands:" -ForegroundColor Yellow
    Write-Host "  install     Install dependencies"
    Write-Host "  dev         Install dev dependencies"
    Write-Host ""
    Write-Host "Development Commands:" -ForegroundColor Yellow
    Write-Host "  run         Start development server"
    Write-Host "  test        Run tests"
    Write-Host "  test-cov    Run tests with coverage"
    Write-Host "  lint        Run linting (ruff)"
    Write-Host "  format      Format code (black + ruff)"
    Write-Host "  typecheck   Run type checking"
    Write-Host ""
    Write-Host "Docker Commands:" -ForegroundColor Yellow
    Write-Host "  docker-build    Build Docker image"
    Write-Host "  docker-run      Run Docker container"
    Write-Host "  docker-test     Test Docker container"
    Write-Host ""
    Write-Host "Utility Commands:" -ForegroundColor Yellow
    Write-Host "  health      Check service health"
    Write-Host "  clean       Clean cache files"
    Write-Host "  setup-env   Copy .env.example to .env"
    Write-Host ""
    Write-Host "Usage: .\tasks.ps1 <command>" -ForegroundColor Green
    Write-Host "Example: .\tasks.ps1 run" -ForegroundColor Green
    Write-Host ""
}

function Install-Dependencies {
    Write-Host "Installing dependencies..." -ForegroundColor Green
    pip install -r requirements.txt
}

function Install-DevDependencies {
    Write-Host "Installing development dependencies..." -ForegroundColor Green
    Install-Dependencies
    pip install -r requirements-dev.txt
}

function Start-DevServer {
    Write-Host "Starting development server on port $Port..." -ForegroundColor Green
    uvicorn app.main:app --host 0.0.0.0 --port $Port --reload
}

function Run-Tests {
    Write-Host "Running tests..." -ForegroundColor Green
    pytest app/tests/ -v
}

function Run-TestsWithCoverage {
    Write-Host "Running tests with coverage..." -ForegroundColor Green
    pytest app/tests/ -v --cov=app --cov-report=html --cov-report=term
}

function Run-Linting {
    Write-Host "Running linting..." -ForegroundColor Green
    ruff check app/
    ruff check app/ --select I --diff
}

function Format-Code {
    Write-Host "Formatting code..." -ForegroundColor Green
    black app/
    ruff check app/ --select I --fix
}

function Run-TypeCheck {
    Write-Host "Running type checking..." -ForegroundColor Green
    mypy app/ --ignore-missing-imports
}

function Build-DockerImage {
    Write-Host "Building Docker image..." -ForegroundColor Green
    docker build -t "${DockerImage}:${DockerTag}" .
}

function Run-DockerContainer {
    Write-Host "Running Docker container..." -ForegroundColor Green
    Build-DockerImage
    docker run -p "${Port}:${Port}" --env-file .env "${DockerImage}:${DockerTag}"
}

function Test-DockerContainer {
    Write-Host "Testing Docker container..." -ForegroundColor Green
    Build-DockerImage
    docker run --rm "${DockerImage}:${DockerTag}" pytest app/tests/ -v
}

function Check-Health {
    Write-Host "Checking service health..." -ForegroundColor Green
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:${Port}/health" -Method Get
        Write-Host "Service is healthy!" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 3
    }
    catch {
        Write-Host "Service is not running or unhealthy" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

function Clean-Files {
    Write-Host "Cleaning cache files..." -ForegroundColor Green

    # Remove Python cache files
    Get-ChildItem -Path . -Recurse -Name "*.pyc" | Remove-Item -Force
    Get-ChildItem -Path . -Recurse -Name "__pycache__" -Directory | Remove-Item -Recurse -Force
    Get-ChildItem -Path . -Recurse -Name "*.egg-info" -Directory | Remove-Item -Recurse -Force
    Get-ChildItem -Path . -Recurse -Name ".pytest_cache" -Directory | Remove-Item -Recurse -Force
    Get-ChildItem -Path . -Recurse -Name ".ruff_cache" -Directory | Remove-Item -Recurse -Force

    # Remove coverage files
    if (Test-Path "htmlcov") { Remove-Item -Path "htmlcov" -Recurse -Force }
    if (Test-Path ".coverage") { Remove-Item -Path ".coverage" -Force }

    Write-Host "Cleanup complete!" -ForegroundColor Green
}

function Setup-Environment {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env file from .env.example" -ForegroundColor Green
        Write-Host "Please update the values in .env" -ForegroundColor Yellow
    }
    else {
        Write-Host ".env file already exists" -ForegroundColor Yellow
    }
}

function Setup-Project {
    Write-Host "Setting up project..." -ForegroundColor Green
    Setup-Environment
    Install-DevDependencies
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "  Setup complete!" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "1. Update .env with your configuration" -ForegroundColor Yellow
    Write-Host "2. Run '.\tasks.ps1 run' to start development server" -ForegroundColor Yellow
    Write-Host "3. Visit http://localhost:${Port}/docs for API docs" -ForegroundColor Yellow
    Write-Host ""
}

function Deploy-Production {
    Write-Host "Building production image..." -ForegroundColor Green
    Build-DockerImage
    docker tag "${DockerImage}:${DockerTag}" "${DockerImage}:prod"
    Write-Host "Production image ready: ${DockerImage}:prod" -ForegroundColor Green
}

# Main task dispatcher
switch ($Task.ToLower()) {
    "help" { Show-Help }
    "install" { Install-Dependencies }
    "dev" { Install-DevDependencies }
    "run" { Start-DevServer }
    "test" { Run-Tests }
    "test-cov" { Run-TestsWithCoverage }
    "lint" { Run-Linting }
    "format" { Format-Code }
    "typecheck" { Run-TypeCheck }
    "docker-build" { Build-DockerImage }
    "docker-run" { Run-DockerContainer }
    "docker-test" { Test-DockerContainer }
    "health" { Check-Health }
    "clean" { Clean-Files }
    "setup-env" { Setup-Environment }
    "setup" { Setup-Project }
    "deploy-prod" { Deploy-Production }
    default {
        Write-Host "Unknown task: $Task" -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
}
