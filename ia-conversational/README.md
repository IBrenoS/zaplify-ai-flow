# IA Conversational Service

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
docker run -d -p 8005:8005 \
  -e OPENAI_API_KEY=your_key \
  -e REDIS_URL=redis://redis:6379 \
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
