# Analytics Service

Analytics and metrics processing service for Zaplify AI Flow platform.

## Features

- **Real-time KPI Metrics**: Dashboard metrics with caching
- **Funnel Analytics**: Detailed conversion flow analysis and bottleneck identification
- **Conversation Analytics**: Sentiment analysis, topic extraction, and engagement metrics
- **Performance Monitoring**: Assistant performance tracking and optimization
- **Data Export**: Metrics export in JSON/CSV formats
- **Caching Layer**: Redis-based caching for optimal performance

## Technology Stack

- **Framework**: FastAPI (Python)
- **Database**: Supabase/PostgreSQL
- **Cache**: Redis
- **Data Processing**: Pandas, NumPy, SciPy
- **Visualization**: Plotly, Matplotlib, Seaborn

## Quick Start

### Prerequisites

- Python 3.9+
- Redis server
- PostgreSQL/Supabase database

### Installation

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Configure environment:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the service:

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check

- `GET /health` - Service health status

### KPI Metrics

- `GET /metrics/kpi` - Dashboard KPI metrics
- `GET /metrics/conversion` - Conversion rate metrics
- `GET /metrics/performance` - Assistant performance metrics

### Funnel Analytics

- `GET /analytics/funnel/{funnel_id}` - Detailed funnel analytics
- `GET /analytics/funnel/{funnel_id}/conversion-flow` - Conversion flow visualization
- `GET /analytics/funnel/{funnel_id}/bottlenecks` - Bottleneck analysis

### Conversation Analytics

- `GET /analytics/conversations` - Conversation metrics overview
- `GET /analytics/conversations/sentiment` - Sentiment analysis
- `GET /analytics/conversations/topics` - Topic analysis

### Real-time Analytics

- `GET /analytics/real-time/activity` - Real-time activity metrics
- `GET /analytics/real-time/conversations` - Active conversations

### Data Processing

- `POST /analytics/process/batch` - Process batch analytics data
- `POST /analytics/cache/refresh` - Refresh analytics cache

### Export

- `GET /analytics/export/metrics` - Export metrics data

## Configuration

Key configuration options in `config.py`:

```python
# Service Configuration
HOST = "0.0.0.0"
PORT = 8003
DEBUG = False

# Cache Configuration
CACHE_TTL = 3600  # 1 hour
BATCH_SIZE = 1000
MAX_CONCURRENT_REQUESTS = 10

# Metrics Configuration
METRICS_RETENTION_DAYS = 90
REAL_TIME_WINDOW_MINUTES = 5
```

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   API Gateway   │────│   Analytics  │────│   Redis     │
│                 │    │   Service    │    │   Cache     │
└─────────────────┘    └──────────────┘    └─────────────┘
                              │
                       ┌──────────────┐
                       │   Supabase   │
                       │   Database   │
                       └──────────────┘
```

## Services

### MetricsService

- KPI calculations
- Performance metrics
- Real-time activity tracking
- Data export functionality

### FunnelAnalyticsService

- Funnel stage analysis
- Conversion flow mapping
- Bottleneck identification
- Optimization recommendations

### ConversationAnalyticsService

- Sentiment analysis
- Topic extraction
- Engagement metrics
- Active conversation monitoring

### CacheService

- Redis connection management
- Key-value caching
- Hash storage
- List operations
- Cache invalidation

## Development

### Running Tests

```bash
npm run test
```

### Code Formatting

```bash
npm run format
```

### API Documentation

Visit `http://localhost:8003/docs` when running the service.

## Deployment

### Docker

```bash
# Build image
docker build -t zaplify-analytics-service .

# Run container
docker run -p 8003:8003 --env-file .env zaplify-analytics-service
```

### Environment Variables

Required environment variables:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anon key
- `REDIS_URL`: Redis connection URL
- `SECRET_KEY`: Service secret key

## Monitoring

The service provides comprehensive logging and metrics:

- Request/response logging
- Performance metrics
- Error tracking
- Cache hit/miss ratios
- Database query performance

## Integration

### With API Gateway

The service integrates with the API Gateway for:

- Authentication forwarding
- Request routing
- Load balancing

### With AI Service

Receives data from AI service for:

- Conversation metrics
- Performance tracking
- Usage analytics

### With WhatsApp Service

Analyzes data from WhatsApp service for:

- Message analytics
- Engagement metrics
- Channel performance

## License

MIT License
