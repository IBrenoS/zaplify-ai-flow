# ================================================================
# Makefile for IA Conversational Service
# ================================================================

.DEFAULT_GOAL := help
.PHONY: help install dev test lint format clean build run docker-build docker-run health

# Variables
PYTHON := python
PIP := pip
PYTEST := pytest
RUFF := ruff
BLACK := black
SERVICE_NAME := ia-conversational
DOCKER_IMAGE := zaplify/$(SERVICE_NAME)
DOCKER_TAG := latest
PORT := 8001

## Help - Display available commands
help:
	@echo "=================================================="
	@echo "  IA Conversational Service - Development Tasks"
	@echo "=================================================="
	@echo ""
	@echo "Setup Commands:"
	@echo "  install     Install dependencies"
	@echo "  dev         Install dev dependencies"
	@echo ""
	@echo "Development Commands:"
	@echo "  run         Start development server"
	@echo "  test        Run tests"
	@echo "  test-cov    Run tests with coverage"
	@echo "  lint        Run linting (ruff)"
	@echo "  format      Format code (black + ruff)"
	@echo "  typecheck   Run type checking"
	@echo ""
	@echo "Docker Commands:"
	@echo "  docker-build    Build Docker image"
	@echo "  docker-run      Run Docker container"
	@echo "  docker-test     Test Docker container"
	@echo ""
	@echo "Utility Commands:"
	@echo "  health      Check service health"
	@echo "  clean       Clean cache files"
	@echo "  setup-env   Copy .env.example to .env"
	@echo ""

## Install dependencies
install:
	$(PIP) install -r requirements.txt

## Install development dependencies
dev: install
	$(PIP) install -r requirements-dev.txt

## Start development server
run:
	uvicorn app.main:app --host 0.0.0.0 --port $(PORT) --reload

## Run tests
test:
	$(PYTEST) app/tests/ -v

## Run tests with coverage
test-cov:
	$(PYTEST) app/tests/ -v --cov=app --cov-report=html --cov-report=term

## Run linting
lint:
	$(RUFF) check app/
	$(RUFF) check app/ --select I --diff

## Format code
format:
	$(BLACK) app/
	$(RUFF) check app/ --select I --fix

## Type checking
typecheck:
	mypy app/ --ignore-missing-imports

## Build Docker image
docker-build:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

## Run Docker container
docker-run: docker-build
	docker run -p $(PORT):$(PORT) --env-file .env $(DOCKER_IMAGE):$(DOCKER_TAG)

## Test Docker container
docker-test: docker-build
	docker run --rm $(DOCKER_IMAGE):$(DOCKER_TAG) pytest app/tests/ -v

## Check service health
health:
	@echo "Checking service health..."
	@curl -f http://localhost:$(PORT)/health || echo "Service not running"

## Clean cache files
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	rm -rf htmlcov/
	rm -rf .coverage

## Setup environment file
setup-env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file from .env.example"; \
		echo "Please update the values in .env"; \
	else \
		echo ".env file already exists"; \
	fi

## Quick development setup
setup: setup-env dev
	@echo "=================================================="
	@echo "  Setup complete!"
	@echo "=================================================="
	@echo "1. Update .env with your configuration"
	@echo "2. Run 'make run' to start development server"
	@echo "3. Visit http://localhost:$(PORT)/docs for API docs"
	@echo ""

## Production deployment
deploy-prod: docker-build
	@echo "Building production image..."
	docker tag $(DOCKER_IMAGE):$(DOCKER_TAG) $(DOCKER_IMAGE):prod
	@echo "Production image ready: $(DOCKER_IMAGE):prod"
