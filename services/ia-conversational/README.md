# IA Conversational Service

Microserviço de IA Conversacional para o ecossistema Zaplify. Implementa funcionalidades de conversação inteligente, análise de intenções, RAG (Retrieval-Augmented Generation) e gerenciamento de assistentes virtuais.

## 📋 Funcionalidades

### Core Features

- ✅ **Assistentes Virtuais**: CRUD completo de configurações de assistentes
- ✅ **Conversação Inteligente**: Chat com memória persistente e contexto
- ✅ **RAG (Retrieval-Augmented Generation)**: Busca semântica em base de conhecimento
- ✅ **Análise de Intenções**: Classificação automática de mensagens
- ✅ **Análise de Sentimentos**: Detecção de sentimentos em tempo real
- ✅ **Multi-tenant**: Isolamento completo por tenant
- ✅ **Feature Flags**: Degradação graceful quando serviços estão indisponíveis

### Infraestrutura

- ✅ **FastAPI** com OpenAPI/Swagger automático
- ✅ **Supabase PostgreSQL** com pgvector para embeddings
- ✅ **Redis** para cache e memória de conversas
- ✅ **OpenAI GPT** para processamento de linguagem natural
- ✅ **Logs Estruturados** em JSON com correlação
- ✅ **CORS** configurável para múltiplos domínios
- ✅ **Middleware de Correlação** para rastreabilidade
- ✅ **Health Checks** com verificação de dependências
- ✅ **Métricas Prometheus** com contadores e histogramas

## 🏗️ Arquitetura

```
app/
├── main.py                    # Bootstrap FastAPI + CORS
├── middleware/
│   └── correlation.py         # Correlation ID + Tenant ID
├── core/
│   ├── logging.py            # Logs estruturados
│   ├── database.py           # Conexão Supabase
│   └── redis.py              # Conexão Redis
├── schemas/
│   └── assistant.py          # Pydantic models (100% compatível com frontend)
├── api/
│   ├── health.py             # Health check
│   ├── assistants.py         # CRUD assistentes
│   ├── conversation.py       # Chat e conversação
│   ├── rag.py                # Busca semântica
│   ├── intent.py             # Análise de intenções
│   └── sentiment.py          # Análise de sentimentos
├── services/
│   ├── llm_service.py        # Integração OpenAI
│   ├── rag_service.py        # RAG com pgvector
│   └── memory_service.py     # Memória Redis
└── tests/                    # Testes pytest
```

## 🚀 Quick Start

### 1. Configuração do Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure as variáveis (veja seção Configuração)
vim .env
```

### 2. Instalação

```bash
# Instalar dependências
pip install -r requirements.txt

# Instalar dependências de desenvolvimento
pip install -r requirements-dev.txt
```

### 3. Configuração do Banco (Supabase)

```sql
-- Execute as migrações no Supabase SQL Editor
-- O arquivo migrations.sql contém todas as tabelas e índices necessários
```

### 4. Executar em Desenvolvimento

```bash
# Com hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Ou usando scripts
./scripts.sh dev        # Linux/Mac
./scripts.ps1 dev       # Windows
```

### 5. Executar em Produção

```bash
# Com Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001

# Ou usando scripts
./scripts.sh prod       # Linux/Mac
./scripts.ps1 prod      # Windows
```

## ⚙️ Configuração

### Variáveis de Ambiente Obrigatórias

```bash
# Ambiente
ENV=development|production

# Servidor
PORT=8001

# OpenAI (obrigatório para LLM)
OPENAI_API_KEY=sk-...

# Supabase (obrigatório para persistência)
DATABASE_URL=postgresql://postgres:password@project.supabase.co:5432/postgres
SUPABASE_URL=https://project.supabase.co
SUPABASE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Redis (obrigatório para memória)
REDIS_URL=redis://default:password@host:port
```

### Variáveis Opcionais

```bash
# CORS
CORS_ALLOW_ORIGINS=https://app.zaplify.com,https://studio.zaplify.com

# Health Checks & Monitoring
REDIS_URL=redis://localhost:6379           # For readiness checks
DATABASE_URL=postgresql://localhost/db     # For readiness checks
# Note: If REDIS_URL/DATABASE_URL are not set, readiness returns ok:true with deps marked as 'unknown'

# RAG
RAG_TENANT_ISOLATION=strategy:schema  # ou strategy:prefix
RAG_CACHE_TTL_SECONDS=3600

# Memória
MEMORY_TTL_SECONDS=604800  # 7 dias

# Logs
LOG_LEVEL=INFO
```

## 🔧 Configuração de Serviços Externos

### Supabase Setup

1. **Criar projeto no Supabase**
2. **Habilitar pgvector**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. **Executar migrações**:
   ```bash
   # Upload do arquivo migrations.sql no SQL Editor
   ```
4. **Configurar RLS** (Row Level Security) se necessário

### Redis Setup

Opções recomendadas:

- **Upstash** (serverless): `redis://default:password@host:port`
- **Railway**: `redis://default:password@host:port`
- **Local**: `redis://localhost:6379`

### OpenAI Setup

1. Criar conta na OpenAI
2. Gerar API Key
3. Configurar `OPENAI_API_KEY=sk-...`

## 📡 API Endpoints

### Health Check

```http
GET /health           # Comprehensive health status with dependencies
GET /health/live      # Simple liveness check (ok: true)
GET /health/ready     # Readiness check with Redis/DB verification
```

### Metrics

```http
GET /metrics          # Prometheus metrics endpoint
```

**Available Metrics:**

- `messages_processed_total{tenant_id, assistant_type}` - Total messages processed
- `errors_total{endpoint, error_type, tenant_id}` - Total errors by type
- `response_latency_seconds{endpoint, method, tenant_id}` - Response time histogram

### Assistentes

```http
POST /assistants/          # Criar assistente
GET  /assistants/{id}      # Obter assistente
PUT  /assistants/{id}      # Atualizar assistente
DELETE /assistants/{id}    # Deletar assistente
```

### Conversação

```http
POST /conversation/send    # Enviar mensagem
```

### RAG

```http
POST /rag/query           # Busca semântica
```

### Análises

```http
POST /intent              # Análise de intenção
POST /sentiment           # Análise de sentimento
```

## 🔒 Multi-tenant & Segurança

### Headers Obrigatórios

```http
x-tenant-id: demo          # ID do tenant
x-correlation-id: uuid     # ID de correlação (auto-gerado se ausente)
```

### Isolamento de Dados

- **Esquemas**: `tenant_<id>.tabela`
- **Prefixos**: `rag_<tenant_id>_tabela`
- **Redis**: `<tenant_id>:<resource_id>`

### Logs de Auditoria

Todos os logs incluem `correlation_id` e `tenant_id` para rastreabilidade completa.

## 🧪 Testes

```bash
# Executar todos os testes
pytest

# Com coverage
pytest --cov=app

# Testes específicos
pytest app/tests/test_health.py
pytest app/tests/test_assistants.py
pytest app/tests/test_middleware.py
```

## 🐳 Docker

```bash
# Build
docker build -t ia-conversational .

# Run
docker run -p 8001:8001 --env-file .env ia-conversational
```

## 📊 Monitoramento

### Health Check

```bash
curl http://localhost:8001/health
```

### Métricas Disponíveis

- Status dos serviços (OpenAI, Supabase, Redis)
- Tempo de resposta
- Contadores de requests
- Feature flags ativas

### Logs Estruturados

```json
{
  "timestamp": 1234567890,
  "service": "ia-conversational",
  "level": "INFO",
  "message": "Request processed",
  "correlation_id": "uuid",
  "tenant_id": "demo",
  "method": "POST",
  "path": "/conversation/send"
}
```

## 🎯 Schema do Assistente

O schema `AssistantConfig` é **100% compatível** com o frontend `assistantStudio.tsx`:

```python
class AssistantConfig(BaseModel):
    # Identidade
    name: str
    description: Optional[str]

    # Personalidade
    selected_archetype: Optional[PersonalityArchetype]
    personality_instructions: Optional[str]

    # Capacidades
    can_schedule: bool = False
    can_sell: bool = False
    can_qualify: bool = True
    can_capture_data: bool = True

    # Conhecimento
    product_service: Optional[str]
    main_benefits: Optional[str]
    target_audience: Optional[str]
    competitive_differentials: Optional[str]
    products_and_prices: Optional[str]
    payment_link: Optional[HttpUrl]

    # Estilo (1-10)
    formality_level: int = 5
    detail_level: int = 5
    emoji_usage: int = 3

    # WhatsApp
    whatsapp_connected: bool = False
    connected_number: Optional[str]

    # ... mais campos conforme frontend
```

## 🔄 Feature Flags & Degradação

### Quando DATABASE_URL ausente:

- ❌ Endpoints que dependem de DB retornam 503
- ✅ Logs estruturados com aviso
- ✅ Health check indica status

### Quando REDIS_URL ausente:

- 🟡 Em dev: fallback para memória in-process
- ❌ Em prod: endpoints de conversa retornam 503

### Quando OPENAI_API_KEY ausente:

- 🟡 Respostas determinísticas de fallback
- ✅ Logs claros sobre modo degradado

## 🚀 Deploy

### Variáveis de Produção

```bash
ENV=production
DATABASE_URL=postgresql://postgres:...@...supabase.co:5432/postgres
REDIS_URL=redis://default:...@...upstash.io:...
OPENAI_API_KEY=sk-...
CORS_ALLOW_ORIGINS=https://app.zaplify.com
LOG_LEVEL=INFO
```

### Comando de Produção

```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```

## 📚 Próximos Passos

- [ ] Implementar embeddings reais no RAG
- [ ] Adicionar rate limiting
- [ ] Implementar cache inteligente
- [ ] Melhorar análise de intenções
- [ ] Adicionar suporte a anexos
- [ ] Implementar webhooks
- [ ] Adicionar métricas Prometheus

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Faça commit: `git commit -m 'Add nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Desenvolvido com ❤️ pela equipe Zaplify**
