# WhatsApp Service

Microserviço robusto para integração com WhatsApp via Evolution API. Implementa logs estruturados, multi-tenancy, rate limiting, autenticação JWT opcional, idempotência e integração com Kafka.

## 🚀 Funcionalidades

- ✅ **Integração Evolution API** - Client robusto com retry e timeout
- ✅ **Multi-tenancy** - Isolamento completo por tenant_id
- ✅ **Logs estruturados** - JSON logs com correlação
- ✅ **Rate limiting** - Proteção contra abuse com Redis distribuído
- ✅ **JWT Autenticação** - Segurança opcional configurável
- ✅ **Idempotência** - Prevenção de webhooks duplicados
- ✅ **Feature flags** - Kafka, Redis, S3, JWT opcionais
- ✅ **Segurança** - Webhook HMAC validation
- ✅ **Graceful shutdown** - Fechamento limpo de conexões
- ✅ **Testes automatizados** - Cobertura com Vitest
- ✅ **Documentação OpenAPI** - Swagger UI em `/docs`
- ✅ **Hardening** - Rate limiting e autenticação para endpoints públicos

## 📦 Instalação

```bash
npm install
```

## ⚙️ Configuração

Copie o arquivo de exemplo e configure as variáveis:

```bash
cp .env.example .env
```

### Variáveis Obrigatórias

```env
# Evolution API
EVOLUTION_BASE_URL=http://localhost:3000
EVOLUTION_API_KEY=your_evolution_api_key_here
EVOLUTION_WEBHOOK_SECRET=your_webhook_secret_here_min_8_chars

# MongoDB
MONGO_URI=mongodb://localhost:27017/whatsapp_service
```

### Autenticação JWT (Opcional)

```env
# JWT Configuration
REQUIRE_JWT=false                    # Torna JWT obrigatório em endpoints públicos
JWT_SECRET=your_jwt_secret_here      # Chave para verificação JWT
```

Quando `REQUIRE_JWT=true`, endpoints `/messages/send-message` e `/media/upload` requerem header:

```http
Authorization: Bearer <jwt_token>
```

O JWT deve conter:

- `tenant_id`: ID do tenant (opcional, usa header se não especificado)
- Qualquer payload adicional necessário

### Rate Limiting

```env
# Rate Limit Configuration
RATE_LIMIT_WINDOW_MS=60000          # Janela de tempo (60s)
RATE_LIMIT_MAX=100                  # Máximo de requests por janela
RATE_LIMIT_REDIS_URL=redis://localhost:6379  # Redis para rate limit distribuído
```

### Feature Flags (Opcionais)

```env
ENABLE_KAFKA=false                  # Eventos Kafka
USE_S3=false                       # Upload mídia S3
REDIS_URL=redis://localhost:6379    # Cache/idempotência
```

## 🛠️ Desenvolvimento

```bash
# Desenvolvimento com hot reload
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start

# Testes
npm test
npm run test:watch
npm run test:coverage

# Linting
npm run lint
npm run format
```

## 📚 Documentação API

### Swagger UI

Acesse a documentação interativa em:

```
http://localhost:3001/docs
```

### OpenAPI JSON

Especificação OpenAPI disponível em:

```
http://localhost:3001/openapi.json
```

## 📡 API Endpoints

### Health Check

```http
GET /health
```

### Sessões WhatsApp

```http
# Conectar sessão
POST /sessions/connect
Content-Type: application/json
x-tenant-id: tenant-123
x-correlation-id: req-456

{
  "sessionId": "session-1"
}

# Obter QR Code
GET /sessions/qr-code?sessionId=session-1
x-tenant-id: tenant-123

# Status da sessão
GET /sessions/status?sessionId=session-1
x-tenant-id: tenant-123
```

### Envio de Mensagens (Rate Limited + JWT Opcional)

```http
POST /messages/send-message
Content-Type: application/json
Authorization: Bearer <jwt_token>     # Obrigatório se REQUIRE_JWT=true
x-tenant-id: tenant-123
x-correlation-id: req-456

{
  "sessionId": "session-1",
  "to": "5511999999999",
  "text": "Olá mundo!"
}

# Com mídia
{
  "sessionId": "session-1",
  "to": "5511999999999",
  "text": "Veja esta imagem:",
  "mediaUrl": "https://example.com/image.jpg"
}
```

### Upload de Mídia (Rate Limited + JWT Opcional)

```http
POST /media/upload
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>     # Obrigatório se REQUIRE_JWT=true
x-tenant-id: tenant-123
x-correlation-id: req-456

file: [binary data] (max 50MB)
```

### Webhooks

```http
POST /webhook
Content-Type: application/json
x-signature: sha256=hash
x-correlation-id: req-456

{
  "event": "messages.upsert",
  "data": { ... }
}
```

### Conversas

```http
GET /conversations?limit=20&offset=0
x-tenant-id: tenant-123
x-correlation-id: req-456
```

## 🔧 Headers

### Obrigatórios/Automáticos

- `x-correlation-id` - Rastreamento de requests (auto-gerado se ausente)
- `x-tenant-id` - Isolamento multi-tenant (padrão: 'default')

### Opcionais

- `Authorization: Bearer <token>` - JWT quando `REQUIRE_JWT=true`

## 🛡️ Segurança

### Rate Limiting

**Endpoints Protegidos:**

- `POST /messages/send-message`
- `POST /media/upload`

**Configuração:**

- Padrão: 100 requests/minuto por IP
- Redis distribuído quando `RATE_LIMIT_REDIS_URL` configurado
- Fallback para memória local
- Resposta `429 Too Many Requests` quando excedido

**Headers de Rate Limit:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1634567890
```

### JWT Authentication

**Configuração:**

```env
REQUIRE_JWT=true
JWT_SECRET=sua_chave_secreta_aqui
```

**Token JWT deve conter:**

```json
{
  "tenant_id": "tenant-123", // Opcional, usa header se não especificado
  "user_id": "user-456", // Informações adicionais
  "exp": 1634567890 // Expiração obrigatória
}
```

**Resposta 401 Unauthorized:**

```json
{
  "ok": false,
  "error": "Unauthorized",
  "correlation_id": "req-123"
}
```

### Webhook Authentication

Webhooks são validados via HMAC SHA256:

```javascript
const signature = createHmac('sha256', EVOLUTION_WEBHOOK_SECRET)
  .update(JSON.stringify(body))
  .digest('hex');
```

## 📊 Logs Estruturados

Formato JSON padronizado:

```json
{
  "level": "info",
  "message": "Message sent successfully",
  "service": "whatsapp-service",
  "timestamp": "2025-08-14T17:30:00.000Z",
  "correlation_id": "abc-123",
  "tenant_id": "tenant-456",
  "messageId": "msg-789"
}
```

## 🔄 Idempotência

Webhooks são dedupificados por `messageId` usando:

- Redis (quando disponível)
- Fallback para memória
- TTL: 5 minutos

## 📈 Monitoramento

### Health Endpoints

- `/health` - Status básico do serviço

### Metrics

Logs estruturados incluem:

- Request timing
- Error rates
- Evolution API status
- Rate limit hits
- JWT validation failures

### Kafka Events

Eventos enviados quando `ENABLE_KAFKA=true`:

```json
// whatsapp.message.sent
{
  "event_type": "whatsapp.message.sent",
  "tenant_id": "tenant-123",
  "session_id": "session-1",
  "message_id": "msg-456",
  "to": "5511999999999",
  "text": "Mensagem enviada",
  "timestamp": "2025-08-14T17:30:00.000Z"
}

// whatsapp.message.received
{
  "event_type": "whatsapp.message.received",
  "tenant_id": "tenant-123",
  "session_id": "session-1",
  "message_id": "msg-789",
  "from": "5511999999999",
  "text": "Mensagem recebida",
  "timestamp": "2025-08-14T17:30:00.000Z"
}
```

## 🧪 Testes

```bash
# Todos os testes
npm test

# Com coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Testes específicos
npm test -- rate-limit
npm test -- jwt
```

### Cenários de Teste

**Rate Limiting:**

- Limites respeitados
- Headers corretos
- Resposta 429
- Redis vs memória

**JWT Authentication:**

- Token válido/inválido
- Tenant override
- REQUIRE_JWT flag
- Resposta 401

**Integração:**

- Evolution API
- MongoDB
- Kafka events
- Webhook HMAC

## 🐳 Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

**Variáveis Docker:**

```yaml
environment:
  - NODE_ENV=production
  - PORT=3001
  - EVOLUTION_BASE_URL=http://evolution-api:3000
  - MONGO_URI=mongodb://mongo:27017/whatsapp_service
  - REDIS_URL=redis://redis:6379
  - REQUIRE_JWT=false
```

## 🔧 Troubleshooting

### Erro de configuração

```
❌ Erro na validação de configuração:
  - EVOLUTION_BASE_URL: Required
```

**Solução:** Configure todas as variáveis obrigatórias no `.env`

### Rate limit excedido

```
HTTP 429: Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
```

**Solução:**

- Aguarde reset do limite
- Ajuste `RATE_LIMIT_MAX` ou `RATE_LIMIT_WINDOW_MS`
- Configure Redis distribuído

### JWT Authentication error

```
HTTP 401: Unauthorized - Invalid token
```

**Solução:**

- Verifique `JWT_SECRET` configurado
- Token não expirado
- Header `Authorization: Bearer <token>` correto
- Se opcional, configure `REQUIRE_JWT=false`

### Evolution API indisponível

```
Error sending message: Evolution API error: 500
```

**Solução:** Verifique se Evolution API está rodando e acessível

## 🚀 Deploy

### Variáveis de Produção

```env
# Obrigatórias
NODE_ENV=production
EVOLUTION_BASE_URL=https://your-evolution-api.com
EVOLUTION_API_KEY=prod_api_key
EVOLUTION_WEBHOOK_SECRET=webhook_secret_min_8_chars
MONGO_URI=mongodb://mongo-cluster/whatsapp_service

# Segurança
REQUIRE_JWT=true
JWT_SECRET=secure_jwt_secret_here

# Performance
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_REDIS_URL=redis://redis-cluster:6379

# Features
ENABLE_KAFKA=true
KAFKA_BROKERS=kafka1:9092,kafka2:9092
```

### Health Checks

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
  interval: 30s
  timeout: 10s
  retries: 3
```

## 📚 Recursos Adicionais

- **Swagger UI:** `/docs` - Documentação interativa
- **OpenAPI Spec:** `/openapi.json` - Especificação completa
- **Postman:** Importe OpenAPI JSON
- **Logs:** Formato estruturado JSON para análise

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit (`git commit -m 'Add: nova funcionalidade'`)
4. Push (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 License

Este projeto está sob licença MIT. Veja `LICENSE` para detalhes.
