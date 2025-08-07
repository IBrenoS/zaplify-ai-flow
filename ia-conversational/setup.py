import os
import subprocess
import sys
from pathlib import Path

def create_dockerfile():
    """Create Dockerfile for the IA Conversational service"""
    dockerfile_content = """FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    g++ \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \\
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8005/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005"]
"""

    with open("Dockerfile", "w") as f:
        f.write(dockerfile_content)

    print("✅ Dockerfile created")

def create_docker_compose():
    """Create docker-compose.yml for development"""
    docker_compose_content = """version: '3.8'

services:
  ia-conversational:
    build: .
    ports:
      - "8005:8005"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - DEBUG=true
      - LOG_LEVEL=INFO
    depends_on:
      - redis
      - qdrant
    volumes:
      - ./logs:/app/logs
    networks:
      - ia-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - ia-network

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - ia-network

volumes:
  redis_data:
  qdrant_data:

networks:
  ia-network:
    driver: bridge
"""

    with open("docker-compose.yml", "w") as f:
        f.write(docker_compose_content)

    print("✅ docker-compose.yml created")

def create_env_template():
    """Create .env.template file"""
    env_template = """# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
ANTHROPIC_MAX_TOKENS=2000
ANTHROPIC_TEMPERATURE=0.7

# Service Configuration
HOST=0.0.0.0
PORT=8005
DEBUG=true
LOG_LEVEL=INFO
API_KEY=your_api_key_here

# Redis Configuration
REDIS_URL=redis://localhost:6379
CONVERSATION_MEMORY_TTL=86400
USER_CONTEXT_TTL=604800
MAX_CONVERSATION_HISTORY=50

# Vector Database Configuration
VECTOR_DB_TYPE=qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
COLLECTION_NAME=zaplify_knowledge
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# RAG Configuration
RAG_ENABLED=true
RAG_TOP_K=5
RAG_SCORE_THRESHOLD=0.7
MAX_CONTEXT_LENGTH=4000

# Intent Classification
INTENT_CONFIDENCE_THRESHOLD=0.6
INTENT_MODEL_TYPE=pattern

# Sentiment Analysis
SENTIMENT_ENABLED=true
SENTIMENT_MODEL_TYPE=vader

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Conversation Settings
MAX_RESPONSE_LENGTH=1000
CONVERSATION_TIMEOUT=1800
ENABLE_CONVERSATION_LOGGING=true
"""

    with open(".env.template", "w") as f:
        f.write(env_template)

    print("✅ .env.template created")

def create_gitignore():
    """Create .gitignore file"""
    gitignore_content = """.env
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.so
.coverage
.pytest_cache/
*.log
logs/
data/
models/
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
Thumbs.db
"""

    with open(".gitignore", "w") as f:
        f.write(gitignore_content)

    print("✅ .gitignore created")

def create_makefile():
    """Create Makefile for common tasks"""
    makefile_content = """# IA Conversational Service Makefile

.PHONY: help install dev test lint format clean docker-build docker-run

help:  ## Show this help message
\t@echo 'Usage: make [target]'
\t@echo ''
\t@echo 'Targets:'
\t@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \\033[36m%-15s\\033[0m %s\\n", $$1, $$2}' $(MAKEFILE_LIST)

install:  ## Install dependencies
\tpip install -r requirements.txt

dev:  ## Run development server
\tpython -m uvicorn main:app --host 0.0.0.0 --port 8005 --reload

test:  ## Run tests
\tpytest tests/ -v

lint:  ## Run linting
\tflake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
\tflake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

format:  ## Format code
\tblack .
\tisort .

clean:  ## Clean cache files
\tfind . -type f -name "*.pyc" -delete
\tfind . -type d -name "__pycache__" -delete
\trm -rf .pytest_cache/
\trm -rf .coverage

docker-build:  ## Build Docker image
\tdocker build -t ia-conversational:latest .

docker-run:  ## Run with Docker Compose
\tdocker-compose up -d

docker-stop:  ## Stop Docker Compose
\tdocker-compose down

docker-logs:  ## View Docker logs
\tdocker-compose logs -f

env:  ## Copy environment template
\tcp .env.template .env
\t@echo "Don't forget to update the API keys in .env file!"
"""

    with open("Makefile", "w") as f:
        f.write(makefile_content)

    print("✅ Makefile created")

def create_test_files():
    """Create basic test files"""

    # Create tests directory
    os.makedirs("tests", exist_ok=True)

    # __init__.py
    with open("tests/__init__.py", "w") as f:
        f.write("")

    # conftest.py
    conftest_content = """import pytest
import asyncio
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
"""

    with open("tests/conftest.py", "w") as f:
        f.write(conftest_content)

    # test_main.py
    test_main_content = """import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert "services" in data

def test_conversation_without_auth():
    response = client.post("/conversation", json={
        "message": "Hello",
        "user_id": "test_user"
    })
    assert response.status_code == 401  # Should require authentication

def test_intent_classification_without_auth():
    response = client.post("/intent/classify", json={
        "message": "Hello"
    })
    assert response.status_code == 401  # Should require authentication
"""

    with open("tests/test_main.py", "w") as f:
        f.write(test_main_content)

    # test_services.py
    test_services_content = """import pytest
from services.intent_classifier import IntentClassifier
from services.memory_manager import ConversationMemory, ResponseTemplateManager

@pytest.mark.asyncio
async def test_intent_classifier():
    classifier = IntentClassifier()

    # Test greeting intent
    result = await classifier.classify_intent("olá, como vai?")
    assert result["intent"] == "greeting"
    assert result["confidence"] > 0

@pytest.mark.asyncio
async def test_conversation_memory():
    memory = ConversationMemory()

    # Test storing and retrieving messages
    await memory.store_message("test_user", "test_session", {
        "role": "user",
        "content": "Hello"
    })

    history = await memory.get_conversation_history("test_user", "test_session")
    assert len(history) == 1
    assert history[0]["content"] == "Hello"

def test_response_template_manager():
    manager = ResponseTemplateManager()

    template = manager.get_template("greeting", "first_time")
    assert "Olá" in template

    intents = manager.get_available_intents()
    assert "greeting" in intents
    assert "pricing_inquiry" in intents
"""

    with open("tests/test_services.py", "w") as f:
        f.write(test_services_content)

    print("✅ Test files created")

def create_readme():
    """Create README.md file"""
    readme_content = """# IA Conversational Service

Advanced AI conversational processing service with LangChain integration for the Zaplify AI Flow platform.

## Features

- 🤖 **Advanced AI Processing**: OpenAI and Anthropic integration
- 🧠 **Intent Classification**: Intelligent message understanding
- 💭 **Sentiment Analysis**: Emotional context detection
- 📚 **RAG (Retrieval-Augmented Generation)**: Knowledge base integration
- 💾 **Conversation Memory**: Redis-backed conversation history
- 🔄 **Response Templates**: Context-aware response generation
- 📊 **Analytics**: Conversation flow tracking and insights

## Tech Stack

- **Framework**: FastAPI
- **AI/ML**: LangChain, OpenAI, Anthropic
- **Vector DB**: Qdrant
- **Memory**: Redis
- **Language**: Python 3.11+

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.template .env

# Edit .env with your API keys
nano .env
```

### 2. Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Or use make
make install
```

### 3. Development

```bash
# Run development server
make dev

# Or manually
python -m uvicorn main:app --host 0.0.0.0 --port 8005 --reload
```

### 4. Docker Development

```bash
# Build and run with Docker Compose
make docker-run

# View logs
make docker-logs

# Stop services
make docker-stop
```

## API Endpoints

### Core Endpoints

- `POST /conversation` - Main conversation processing
- `POST /intent/classify` - Intent classification
- `POST /sentiment/analyze` - Sentiment analysis
- `GET /health` - Health check

### RAG Endpoints

- `POST /rag/query` - Query knowledge base
- `POST /rag/documents` - Upload documents
- `GET /rag/documents` - List documents
- `DELETE /rag/documents/{id}` - Delete document

### Conversation Management

- `GET /conversations/{user_id}` - Get conversation history
- `DELETE /conversations/{user_id}` - Clear conversation history

### Analytics

- `GET /analytics/intents` - Intent analytics
- `GET /analytics/sentiment` - Sentiment analytics

## Configuration

Key configuration options in `.env`:

```bash
# AI Models
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key

# Service
HOST=0.0.0.0
PORT=8005
API_KEY=your_api_key

# Vector Database
QDRANT_URL=http://localhost:6333
COLLECTION_NAME=zaplify_knowledge

# Memory
REDIS_URL=redis://localhost:6379
MAX_CONVERSATION_HISTORY=50
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FastAPI App   │────│ Conversational   │────│   LangChain     │
│                 │    │      AI          │    │   Pipeline      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Intent Classifier│    │ Sentiment        │    │ RAG Service     │
│                 │    │ Analyzer         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Redis       │    │    Templates     │    │    Qdrant       │
│   (Memory)      │    │   (Responses)    │    │  (Vectors)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Development

### Running Tests

```bash
make test
```

### Code Quality

```bash
# Linting
make lint

# Formatting
make format
```

### Adding New Intents

1. Add patterns to `IntentClassifier._load_intent_patterns()`
2. Add response templates to `ResponseTemplateManager._load_default_templates()`
3. Update conversation logic in `ConversationalAI`

### Adding New Response Templates

```python
template_manager.add_custom_template(
    intent="custom_intent",
    subtype="specific_case",
    template="Your custom response template"
)
```

## Deployment

### Docker Production

```bash
# Build production image
docker build -t ia-conversational:prod .

# Run production container
docker run -d -p 8005:8005 \\
  -e OPENAI_API_KEY=your_key \\
  -e REDIS_URL=redis://redis:6379 \\
  ia-conversational:prod
```

### Environment Variables

Required for production:

- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- `REDIS_URL`
- `QDRANT_URL`
- `API_KEY` (for authentication)

## Monitoring

The service provides:

- Health checks at `/health`
- Structured logging
- Conversation analytics
- Performance metrics

## Integration

This service integrates with:

- **API Gateway** (Port 8000) - Central routing
- **WhatsApp Service** (Port 8002) - Message processing
- **Analytics Service** (Port 8003) - Data aggregation
- **Funnel Engine** (Port 8004) - Workflow automation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run quality checks: `make lint test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
"""

    with open("README.md", "w") as f:
        f.write(readme_content)

    print("✅ README.md created")

def update_requirements():
    """Update requirements.txt with additional dependencies"""
    additional_requirements = """
# Development dependencies
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
black==23.11.0
isort==5.12.0
flake8==6.1.0

# Testing
pytest-cov==4.1.0
factory-boy==3.3.0
"""

    # Read existing requirements
    try:
        with open("requirements.txt", "r") as f:
            existing = f.read()
    except FileNotFoundError:
        existing = ""

    # Append new requirements if not already present
    lines_to_add = []
    for line in additional_requirements.strip().split('\n'):
        line = line.strip()
        if line and not line.startswith('#'):
            package_name = line.split('==')[0].split('>=')[0].split('<=')[0]
            if package_name not in existing:
                lines_to_add.append(line)

    if lines_to_add:
        with open("requirements.txt", "a") as f:
            if not existing.endswith('\n'):
                f.write('\n')
            f.write('\n# Development and testing dependencies\n')
            for line in lines_to_add:
                f.write(f"{line}\n")

        print("✅ requirements.txt updated with development dependencies")
    else:
        print("ℹ️  requirements.txt already contains development dependencies")

def main():
    """Main setup function"""
    print("🚀 Setting up IA Conversational Service...")
    print("=" * 50)

    # Change to the correct directory
    os.chdir("d:\\zaplify-ai-flow\\ia-conversational")

    try:
        create_dockerfile()
        create_docker_compose()
        create_env_template()
        create_gitignore()
        create_makefile()
        create_test_files()
        create_readme()
        update_requirements()

        print("=" * 50)
        print("✅ IA Conversational Service setup complete!")
        print()
        print("Next steps:")
        print("1. Copy .env.template to .env: cp .env.template .env")
        print("2. Update API keys in .env file")
        print("3. Install dependencies: make install")
        print("4. Run development server: make dev")
        print("5. Run tests: make test")
        print()
        print("🔗 Service will be available at: http://localhost:8005")
        print("📚 API docs at: http://localhost:8005/docs")

    except Exception as e:
        print(f"❌ Error during setup: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
