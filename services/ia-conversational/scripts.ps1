#!/usr/bin/env pwsh
# PowerShell script for IA Conversational service management

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod", "test", "lint", "format", "install", "health")]
    [string]$Command
)

function Write-Header {
    param([string]$Message)
    Write-Host "🚀 $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

# Check if we're in the right directory
if (-not (Test-Path "app/main.py")) {
    Write-Error "This script must be run from the ia-conversational service directory"
    exit 1
}

switch ($Command) {
    "install" {
        Write-Header "Installing Python dependencies..."

        # Check if Python is available
        try {
            $pythonVersion = python --version 2>&1
            Write-Info "Using $pythonVersion"
        } catch {
            Write-Error "Python not found in PATH"
            exit 1
        }

        # Install main dependencies
        Write-Info "Installing main dependencies..."
        python -m pip install -r requirements.txt

        # Install dev dependencies
        Write-Info "Installing dev dependencies..."
        python -m pip install -r requirements-dev.txt

        Write-Header "✅ Dependencies installed successfully!"
    }

    "dev" {
        Write-Header "Starting IA Conversational service in development mode..."

        # Check for .env file
        if (-not (Test-Path ".env")) {
            Write-Warning "No .env file found. Copy .env.example to .env and configure it."
        }

        Write-Info "Starting uvicorn with hot-reload on port 8001..."
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
    }

    "prod" {
        Write-Header "Starting IA Conversational service in production mode..."

        # Check for required environment variables
        if (-not $env:DATABASE_URL) {
            Write-Error "DATABASE_URL environment variable is required for production"
            exit 1
        }

        if (-not $env:REDIS_URL) {
            Write-Error "REDIS_URL environment variable is required for production"
            exit 1
        }

        if (-not $env:OPENAI_API_KEY) {
            Write-Warning "OPENAI_API_KEY not set - LLM features will be disabled"
        }

        Write-Info "Starting gunicorn with 4 workers..."
        gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
    }

    "test" {
        Write-Header "Running tests..."

        # Check if pytest is available
        try {
            pytest --version | Out-Null
        } catch {
            Write-Error "pytest not found. Run './scripts.ps1 install' first"
            exit 1
        }

        Write-Info "Running pytest with coverage..."
        pytest --cov=app --cov-report=term-missing --cov-report=html -v

        Write-Header "✅ Tests completed!"
    }

    "lint" {
        Write-Header "Running code linting..."

        Write-Info "Running ruff linter..."
        ruff check app/

        Write-Info "Running black format check..."
        black --check app/

        Write-Header "✅ Linting completed!"
    }

    "format" {
        Write-Header "Formatting code..."

        Write-Info "Running black formatter..."
        black app/

        Write-Info "Running ruff auto-fix..."
        ruff check app/ --fix

        Write-Header "✅ Code formatted!"
    }

    "health" {
        Write-Header "Checking service health..."

        $port = 8001
        $url = "http://localhost:$port/health"

        try {
            Write-Info "Testing health endpoint at $url..."
            $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10

            Write-Host "🟢 Service is healthy!" -ForegroundColor Green
            Write-Host "Service: $($response.service)" -ForegroundColor Green
            Write-Host "Status: $($response.status)" -ForegroundColor Green
            Write-Host "Version: $($response.version)" -ForegroundColor Green
            Write-Host "Environment: $($response.environment)" -ForegroundColor Green

            Write-Info "Feature availability:"
            foreach ($feature in $response.features.PSObject.Properties) {
                $status = if ($feature.Value) { "✅" } else { "❌" }
                Write-Host "  $status $($feature.Name)" -ForegroundColor $(if ($feature.Value) { "Green" } else { "Red" })
            }

        } catch {
            Write-Error "Service is not responding at $url"
            Write-Error "Make sure the service is running: ./scripts.ps1 dev"
            exit 1
        }
    }

    default {
        Write-Error "Unknown command: $Command"
        Write-Info "Available commands: dev, prod, test, lint, format, install, health"
        exit 1
    }
}

Write-Header "🎉 Operation completed successfully!"
