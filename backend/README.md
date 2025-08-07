# Zaplify AI Flow - Backend

## 🚀 Backend Python com FastAPI

Este é o backend core do Zaplify AI Flow, construído com FastAPI e integração com IA conversacional.

## 📋 Funcionalidades Implementadas

### Sprint 1-2: Core de IA ✅

- [x] API FastAPI básica
- [x] Integração OpenAI/LangChain
- [x] Sistema de personalidades dos assistentes
- [x] Processamento básico de mensagens
- [x] Models Pydantic para validação
- [x] Serviços para gerenciamento de assistentes
- [x] Endpoints REST para assistentes
- [x] Integração com Supabase

### Próximos Sprints 🔄

- [ ] Sprint 3-4: WhatsApp Integration
- [ ] Sprint 5-6: Funcionalidades Avançadas

## 🛠️ Configuração do Ambiente

### 1. Instalar Dependências

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 3. Variáveis Obrigatórias

```env
# Supabase (já configurado do frontend)
SUPABASE_URL=https://tcswnrndfpmtxpyiknsg.supabase.co
SUPABASE_KEY=your_supabase_key

# OpenAI (necessário)
OPENAI_API_KEY=your_openai_api_key

# Redis (opcional - desenvolvimento local)
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your_secret_key_here
```

### 4. Executar o Servidor

```bash
# Desenvolvimento
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Ou usando o script direto
python app/main.py
```

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **Health Check**: http://localhost:8000/health

## 🏗️ Arquitetura

```
backend/
├── app/
│   ├── main.py              # FastAPI app principal
│   ├── core/
│   │   ├── config.py        # Configurações
│   │   └── database.py      # Conexão Supabase
│   ├── models/
│   │   ├── assistant.py     # Models de assistente
│   │   └── conversation.py  # Models de conversa
│   ├── services/
│   │   ├── ai_service.py    # Serviço de IA
│   │   └── assistant_service.py # Serviço de assistentes
│   └── api/
│       └── v1/
│           ├── api.py       # Router principal
│           └── endpoints/   # Endpoints específicos
├── requirements.txt         # Dependências
└── .env.example            # Template de variáveis
```

## 🔗 Endpoints Principais

### Assistentes

- `POST /api/v1/assistants` - Criar assistente
- `GET /api/v1/assistants` - Listar assistentes
- `GET /api/v1/assistants/{id}` - Obter assistente
- `PUT /api/v1/assistants/{id}` - Atualizar assistente
- `DELETE /api/v1/assistants/{id}` - Deletar assistente

### IA

- `POST /api/v1/ai/chat` - Chat com assistente
- `POST /api/v1/ai/sentiment` - Análise de sentimento
- `POST /api/v1/ai/intent` - Extração de intenção

### Conversas (Em desenvolvimento)

- `POST /api/v1/conversations` - Criar conversa
- `GET /api/v1/conversations` - Listar conversas
- `GET /api/v1/conversations/{id}` - Obter conversa
- `POST /api/v1/conversations/{id}/messages` - Enviar mensagem

## 🧪 Testando a API

### Criar um Assistente

```bash
curl -X POST "http://localhost:8000/api/v1/assistants" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Assistente de Vendas",
    "description": "Especialista em vendas e atendimento",
    "personality": "friendly",
    "objectives": ["qualify_leads", "sales"],
    "product_service": "Software de automação",
    "main_benefits": "Aumenta produtividade em 300%"
  }'
```

### Testar Chat

```bash
curl -X POST "http://localhost:8000/api/v1/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, preciso de informações sobre o produto",
    "conversation_id": "conv_123",
    "assistant_id": "assistant_id_aqui",
    "context": {}
  }'
```

## 🔄 Integração com Frontend

O backend está configurado para funcionar com o frontend React existente:

1. **CORS configurado** para `http://localhost:5173`
2. **Mesma estrutura de dados** do Supabase
3. **APIs compatíveis** com os hooks existentes

## 📈 Próximos Passos

### Sprint 3-4: WhatsApp Integration

- [ ] WhatsApp Business API setup
- [ ] Sistema de webhooks
- [ ] Gerenciamento de sessões
- [ ] Queue de mensagens com Redis

### Sprint 5-6: Funcionalidades Avançadas

- [ ] Sistema de funis
- [ ] Analytics em tempo real
- [ ] Handoff IA → Humano
- [ ] Dashboard de métricas

## 🐛 Debugging

### Logs

Os logs são exibidos no console durante desenvolvimento. Para produção, configure um sistema de logging adequado.

### Health Check

```bash
curl http://localhost:8000/health
```

### Database Connection

Verifique se as credenciais do Supabase estão corretas no `.env`

## 🚀 Deploy

Para deploy em produção:

1. Configure as variáveis de ambiente
2. Use um servidor ASGI como Gunicorn + Uvicorn
3. Configure Redis para cache
4. Implemente logs estruturados
5. Configure monitoramento

```bash
# Exemplo para produção
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```
