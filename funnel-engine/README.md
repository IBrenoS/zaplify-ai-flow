# Funnel Engine Service

Flow execution engine for Zaplify AI Flow - handles funnel automation, conditional logic, trigger management, and action orchestration.

## Features

- **Flow Execution**: Execute complex funnel workflows with conditional branching
- **Trigger Management**: Handle webhooks, schedules, and event-based triggers
- **Action Orchestration**: Coordinate multiple actions and integrations
- **Conditional Logic**: Advanced condition evaluation with variable support
- **Queue Management**: Background job processing with retry mechanisms
- **Real-time Monitoring**: Track execution status and performance metrics
- **Scalable Architecture**: Handle multiple concurrent funnel executions

## Technology Stack

- **Framework**: Node.js + Express + TypeScript
- **Queue**: BullMQ with Redis
- **Cache**: Redis for execution context and flow state
- **Database**: Supabase/PostgreSQL for flow definitions
- **Monitoring**: Built-in metrics and logging

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server
- PostgreSQL/Supabase database

### Installation

1. Install dependencies:

```bash
npm install
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
npm run build && npm start
```

## API Endpoints

### Health Check

- `GET /health` - Service health status

### Funnel Management

- `GET /funnels` - List all funnels
- `GET /funnels/:id` - Get funnel by ID
- `POST /funnels/:id/execute` - Execute funnel

### Execution Management

- `GET /executions/:id` - Get execution context
- `POST /executions/:id/cancel` - Cancel execution
- `GET /executions` - List active executions

### Trigger Management

- `POST /triggers/:id/activate` - Activate trigger
- `POST /triggers/:id/deactivate` - Deactivate trigger
- `POST /webhook/:triggerId` - Webhook endpoint

### Metrics

- `GET /metrics` - Get execution metrics

## Funnel Structure

### Node Types

**Entry Points:**

- `trigger` - Manual trigger
- `webhook` - Webhook trigger
- `schedule` - Time-based trigger

**Actions:**

- `send_message` - Send WhatsApp/Email/SMS
- `ai_response` - AI-powered response
- `update_contact` - Update contact information
- `api_call` - External API integration

**Flow Control:**

- `condition` - Conditional branching
- `delay` - Time delay
- `branch` - Multiple path execution
- `merge` - Merge execution paths

**End Points:**

- `end` - Complete execution
- `exit` - Exit with status

### Execution Flow

```typescript
interface FunnelNode {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  connections: Connection[];
}

interface Connection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: Condition;
}
```

## Configuration

Key configuration options:

```typescript
// Execution Configuration
MAX_CONCURRENT_EXECUTIONS: 50;
EXECUTION_TIMEOUT: 300000; // 5 minutes
MAX_RETRY_ATTEMPTS: 3;
RETRY_DELAY: 5000; // 5 seconds

// Trigger Configuration
TRIGGER_CHECK_INTERVAL: 30000; // 30 seconds
WEBHOOK_TIMEOUT: 10000; // 10 seconds

// Flow Configuration
MAX_FLOW_NODES: 100;
MAX_FLOW_DEPTH: 20;
FLOW_CACHE_TTL: 3600; // 1 hour
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  Funnel Engine  │────│   Redis Queue   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌──────────────┐
                       │   Services   │
                       │ - AI Service │
                       │ - WhatsApp   │
                       │ - Analytics  │
                       └──────────────┘
```

## Core Services

### ExecutionEngine

- Manages funnel execution lifecycle
- Handles node-to-node flow
- Manages execution context and variables
- Provides error handling and retry logic

### NodeExecutorFactory

- Registers and manages node executors
- Provides type-safe node execution
- Validates node configurations
- Supports custom node types

### TriggerManager

- Manages trigger activation/deactivation
- Handles webhook processing
- Manages scheduled triggers
- Processes event-based triggers

### QueueService

- Background job processing
- Retry mechanisms
- Priority handling
- Dead letter queues

## Node Executors

### SendMessageExecutor

```typescript
// Send WhatsApp, Email, or SMS
{
  "type": "send_message",
  "config": {
    "channel": "whatsapp",
    "recipient": "{{contact.phone}}",
    "message": "Hello {{contact.name}}!"
  }
}
```

### AIResponseExecutor

```typescript
// AI-powered response
{
  "type": "ai_response",
  "config": {
    "prompt": "Respond to: {{user.message}}",
    "context": "{{conversation.history}}"
  }
}
```

### ConditionExecutor

```typescript
// Conditional branching
{
  "type": "condition",
  "config": {
    "field": "contact.score",
    "operator": "greater_than",
    "value": 80
  }
}
```

## Variable System

Execution context supports dynamic variables:

```typescript
interface ExecutionContext {
  variables: Record<string, unknown>;
  // Access with {{variable.name}} syntax
}

// Examples:
("{{contact.name}}"); // Contact name
("{{user.email}}"); // User email
("{{flow.currentStep}}"); // Current step
("{{trigger.data.event}}"); // Trigger event data
```

## Trigger Types

### Webhook Triggers

```typescript
POST /webhook/:triggerId
{
  "event": "contact_added",
  "data": {
    "contact": {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Schedule Triggers

```typescript
{
  "type": "schedule",
  "config": {
    "cron": "0 9 * * 1-5",  // Weekdays at 9 AM
    "timezone": "America/New_York"
  }
}
```

### Event Triggers

```typescript
{
  "type": "event",
  "config": {
    "event": "user_signup",
    "conditions": {
      "source": "website"
    }
  }
}
```

## Error Handling

- **Retry Logic**: Automatic retry with exponential backoff
- **Error Isolation**: Node failures don't affect other executions
- **Dead Letter Queue**: Failed jobs moved to DLQ for analysis
- **Comprehensive Logging**: Detailed execution logs and error tracking

## Monitoring

### Metrics Collected

- Execution count and success rate
- Average execution time
- Node performance metrics
- Queue depth and processing time
- Error rates by node type

### Health Checks

- Service health endpoint
- Database connectivity
- Redis connectivity
- Queue health status

## Development

### Adding Custom Node Types

1. Create executor class:

```typescript
export class CustomExecutor implements NodeExecutor {
  type: NodeType = NodeType.CUSTOM;

  async execute(
    node: FunnelNode,
    context: ExecutionContext
  ): Promise<ActionResult> {
    // Implementation
  }

  validate(config: NodeConfig): ValidationResult {
    // Validation logic
  }
}
```

2. Register executor:

```typescript
nodeExecutorFactory.registerExecutor(NodeType.CUSTOM, new CustomExecutor());
```

### Testing

```bash
npm run test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Deployment

### Docker

```bash
# Build image
docker build -t zaplify-funnel-engine .

# Run container
docker run -p 8004:8004 --env-file .env zaplify-funnel-engine
```

### Environment Variables

Required:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret
- `API_KEY`: Service API key

Optional:

- `MAX_CONCURRENT_EXECUTIONS`: Concurrent execution limit
- `EXECUTION_TIMEOUT`: Execution timeout (ms)
- `TRIGGER_CHECK_INTERVAL`: Trigger check interval (ms)

## Integration

### With API Gateway

- Routes funnel execution requests
- Handles authentication
- Provides load balancing

### With AI Service

- Processes AI response nodes
- Handles conversation context
- Manages AI model interactions

### With WhatsApp Service

- Sends WhatsApp messages
- Handles message webhooks
- Manages conversation state

### With Analytics Service

- Records execution metrics
- Tracks funnel performance
- Provides execution insights

## License

MIT License
