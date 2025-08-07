# IA Conversational Service Makefile

.PHONY: help install dev test lint format clean docker-build docker-run

help:  ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install:  ## Install dependencies
	pip install -r requirements.txt

dev:  ## Run development server
	python -m uvicorn main:app --host 0.0.0.0 --port 8005 --reload

test:  ## Run tests
	pytest tests/ -v

lint:  ## Run linting
	flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
	flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

format:  ## Format code
	black .
	isort .

clean:  ## Clean cache files
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache/
	rm -rf .coverage

docker-build:  ## Build Docker image
	docker build -t ia-conversational:latest .

docker-run:  ## Run with Docker Compose
	docker-compose up -d

docker-stop:  ## Stop Docker Compose
	docker-compose down

docker-logs:  ## View Docker logs
	docker-compose logs -f

env:  ## Copy environment template
	cp .env.template .env
	@echo "Don't forget to update the API keys in .env file!"
