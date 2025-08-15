#!/bin/bash
# Shell script for IA Conversational service management

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${GREEN}🚀 $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "app/main.py" ]; then
    print_error "This script must be run from the ia-conversational service directory"
    exit 1
fi

# Check command argument
if [ $# -eq 0 ]; then
    print_error "No command provided"
    print_info "Available commands: dev, prod, test, lint, format, install, health"
    exit 1
fi

case "$1" in
    "install")
        print_header "Installing Python dependencies..."

        # Check if Python is available
        if ! command -v python3 &> /dev/null; then
            print_error "Python3 not found in PATH"
            exit 1
        fi

        python_version=$(python3 --version)
        print_info "Using $python_version"

        # Install main dependencies
        print_info "Installing main dependencies..."
        python3 -m pip install -r requirements.txt

        # Install dev dependencies
        print_info "Installing dev dependencies..."
        python3 -m pip install -r requirements-dev.txt

        print_header "✅ Dependencies installed successfully!"
        ;;

    "dev")
        print_header "Starting IA Conversational service in development mode..."

        # Check for .env file
        if [ ! -f ".env" ]; then
            print_warning "No .env file found. Copy .env.example to .env and configure it."
        fi

        print_info "Starting uvicorn with hot-reload on port 8001..."
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
        ;;

    "prod")
        print_header "Starting IA Conversational service in production mode..."

        # Check for required environment variables
        if [ -z "$DATABASE_URL" ]; then
            print_error "DATABASE_URL environment variable is required for production"
            exit 1
        fi

        if [ -z "$REDIS_URL" ]; then
            print_error "REDIS_URL environment variable is required for production"
            exit 1
        fi

        if [ -z "$OPENAI_API_KEY" ]; then
            print_warning "OPENAI_API_KEY not set - LLM features will be disabled"
        fi

        print_info "Starting gunicorn with 4 workers..."
        gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
        ;;

    "test")
        print_header "Running tests..."

        # Check if pytest is available
        if ! command -v pytest &> /dev/null; then
            print_error "pytest not found. Run './scripts.sh install' first"
            exit 1
        fi

        print_info "Running pytest with coverage..."
        pytest --cov=app --cov-report=term-missing --cov-report=html -v

        print_header "✅ Tests completed!"
        ;;

    "lint")
        print_header "Running code linting..."

        print_info "Running ruff linter..."
        ruff check app/

        print_info "Running black format check..."
        black --check app/

        print_header "✅ Linting completed!"
        ;;

    "format")
        print_header "Formatting code..."

        print_info "Running black formatter..."
        black app/

        print_info "Running ruff auto-fix..."
        ruff check app/ --fix

        print_header "✅ Code formatted!"
        ;;

    "health")
        print_header "Checking service health..."

        port=8001
        url="http://localhost:$port/health"

        print_info "Testing health endpoint at $url..."

        if command -v curl &> /dev/null; then
            response=$(curl -s -w "%{http_code}" $url)
            http_code="${response: -3}"

            if [ "$http_code" = "200" ]; then
                echo -e "${GREEN}🟢 Service is healthy!${NC}"
                echo "$response" | head -c -3 | jq '.' 2>/dev/null || echo "$response" | head -c -3
            else
                print_error "Service returned HTTP $http_code"
                exit 1
            fi
        else
            print_error "curl not found. Please install curl to test the health endpoint"
            exit 1
        fi
        ;;

    *)
        print_error "Unknown command: $1"
        print_info "Available commands: dev, prod, test, lint, format, install, health"
        exit 1
        ;;
esac

print_header "🎉 Operation completed successfully!"
