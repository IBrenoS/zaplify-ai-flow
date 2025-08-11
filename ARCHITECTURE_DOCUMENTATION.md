# 📚 Documentação da Arquitetura Implementada

Este documento descreve todas as lógicas e funcionalidades que foram implementadas na estrutura inicial dos microserviços, antes da limpeza para desenvolvimento focado.

## 🗂️ Estrutura Geral Criada

```
zaplify-ai-flow/
├── services/                    # Microserviços
│   ├── api-gateway/            # Gateway centralizado (Node.js/TS)
│   ├── ai-service/             # Serviço de IA (Python/FastAPI)
│   ├── whatsapp-service/       # Integração WhatsApp (Node.js/TS)
│   ├── funnel-engine/          # Motor de funis (Node.js/TS)
│   └── analytics-service/      # Analytics e métricas (Python)
├── shared/                     # Bibliotecas compartilhadas
├── infrastructure/             # Docker e deployment (MANTIDO)
└── scripts/                    # Scripts de desenvolvimento (MANTIDO)
```

---

## 🌐 API Gateway (Node.js/TypeScript)

### 📁 Estrutura Implementada

```
services/api-gateway/
├── package.json               # Dependências e scripts
├── tsconfig.json             # Configuração TypeScript
├── .env.example              # Variáveis de ambiente
├── README.md                 # Documentação específica
└── src/
    ├── index.ts              # Entry point principal
    ├── middleware/           # Middlewares personalizados
    │   ├── errorHandler.ts   # Tratamento de erros
    │   ├── rateLimiter.ts    # Rate limiting
    │   └── requestLogger.ts  # Log de requisições
    ├── routes/               # Definição de rotas
    │   ├── auth.ts          # Rotas de autenticação
    │   ├── health.ts        # Health checks
    │   └── proxy.ts         # Proxy para microserviços
    └── utils/               # Utilitários
        └── logger.ts        # Configuração de logs
```

### 🔧 Funcionalidades Implementadas

#### **1. Entry Point (index.ts)**

- Configuração completa do Express.js
- Inicialização do Socket.io para WebSocket
- Middleware de segurança (Helmet, CORS)
- Parsing de requisições JSON/URL-encoded
- Integração de todos os middlewares customizados
- Tratamento de conexões WebSocket
- Inicialização do servidor HTTP

#### **2. Middleware Sistema**

- **Error Handler**: Tratamento padronizado de erros com logs estruturados
- **Rate Limiter**: Proteção contra abuso de API (configurável via env)
- **Request Logger**: Log detalhado de todas as requisições com timing

#### **3. Sistema de Rotas**

- **Health Routes**: Endpoints para verificação de status
- **Auth Routes**: Estrutura para autenticação (placeholders)
- **Proxy Routes**: Roteamento automático para todos os microserviços

#### **4. Utilitários**

- **Logger**: Sistema de logging com Winston, formato JSON para produção

#### **5. Configurações**

- TypeScript configurado com paths absolutos
- Dependências completas para produção
- Variáveis de ambiente documentadas

---

## 🧠 AI Service (Python/FastAPI)

### 📁 Estrutura Implementada

```
services/ai-service/
├── pyproject.toml            # Configuração Python/Poetry
├── .env.example              # Variáveis de ambiente
├── README.md                 # Documentação específica
└── src/ai_service/
    ├── main.py               # Entry point FastAPI
    ├── config.py             # Configurações via Pydantic
    ├── middleware/           # Middlewares FastAPI
    │   └── __init__.py       # Rate limiting e logging
    ├── routers/              # Endpoints da API
    │   ├── health.py         # Health checks
    │   ├── chat.py          # Conversação com IA
    │   ├── models.py        # Gerenciamento de modelos
    │   └── embeddings.py    # Embeddings e busca vetorial
    └── core/                # Funcionalidades principais
        └── logger.py        # Sistema de logging
```

### 🔧 Funcionalidades Implementadas

#### **1. FastAPI Application (main.py)**

- Configuração completa do FastAPI
- Lifecycle management com startup/shutdown
- Middleware de segurança (CORS, TrustedHost)
- Rate limiting customizado
- Documentação automática (Swagger/ReDoc)

#### **2. Sistema de Configuração (config.py)**

- Configurações via Pydantic Settings
- Suporte a variáveis de ambiente
- Configurações para IA, databases, APIs externas
- Validação automática de tipos

#### **3. Routers Especializados**

- **Health**: Verificação de modelos e dependências
- **Chat**: Estrutura para conversação com IA (placeholders)
- **Models**: Listagem e validação de modelos IA
- **Embeddings**: Geração de embeddings e busca semântica

#### **4. Middleware Sistema**

- Rate limiting em memória (configurável para Redis)
- Request logging estruturado
- Tratamento de erros padronizado

#### **5. Core Components**

- Logger configurável com JSON/texto
- Integração com múltiplos provedores de IA

---

## 💬 WhatsApp Service (Node.js/TypeScript)

### 📁 Estrutura Implementada

```
services/whatsapp-service/
├── package.json              # Dependências especializadas
├── tsconfig.json            # Configuração TypeScript
├── .env.example             # Configurações WhatsApp
├── README.md                # Documentação específica
└── src/
    ├── index.ts             # Entry point principal
    ├── services/            # Serviços principais
    │   └── whatsappManager.ts # Gerenciador de conexões
    ├── routes/              # Endpoints da API
    │   ├── health.ts        # Health checks
    │   ├── connection.ts    # Gerenciamento de conexões
    │   ├── message.ts       # Envio/recebimento mensagens
    │   ├── media.ts         # Upload/download mídias
    │   └── whatsapp.ts      # Operações gerais
    ├── middleware/          # Middlewares personalizados
    └── utils/              # Utilitários
        └── logger.ts       # Sistema de logging
```

### 🔧 Funcionalidades Implementadas

#### **1. WhatsApp Manager (whatsappManager.ts)**

- Classe para gerenciamento de múltiplas sessões
- Estrutura para integração com Baileys
- Controle de status de conexões
- Geração de QR codes (estrutura)

#### **2. Sistema de Rotas**

- **Connection**: Conectar/desconectar sessões WhatsApp
- **Message**: Envio de mensagens e histórico
- **Media**: Upload e download de arquivos
- **Health**: Status das sessões WhatsApp

#### **3. Dependências Especializadas**

- Baileys para WhatsApp Web
- Sharp para processamento de imagens
- FFmpeg para vídeos/áudios
- Socket.io para eventos em tempo real

---

## ⚡ Funnel Engine (Node.js/TypeScript)

### 📁 Estrutura Implementada

```
services/funnel-engine/
├── package.json              # Dependências para automação
├── tsconfig.json            # Configuração TypeScript
├── .env.example             # Configurações do engine
└── src/
    ├── index.ts             # Entry point principal
    ├── engine/              # Motor de funis
    │   └── funnelEngine.ts  # Engine principal
    └── routes/              # Endpoints da API
        ├── health.ts        # Health checks
        ├── funnel.ts        # Gerenciamento de funis
        ├── flow.ts          # Execução de fluxos
        ├── trigger.ts       # Sistema de triggers
        ├── condition.ts     # Processamento de condições
        └── action.ts        # Execução de ações
```

### 🔧 Funcionalidades Implementadas

#### **1. Funnel Engine (funnelEngine.ts)**

- Classe principal para execução de funis
- Sistema de inicialização
- Controle de funis ativos
- Validação de estruturas de funil

#### **2. Sistema de Rotas Especializado**

- **Funnel**: CRUD de funis
- **Flow**: Execução de fluxos
- **Trigger**: Sistema de gatilhos
- **Condition**: Processamento de condições
- **Action**: Execução de ações

#### **3. Dependências para Automação**

- Bull para filas de processamento
- JSONPath para condições complexas
- Cron jobs para agendamento
- Lodash para manipulação de dados

---

## 📊 Analytics Service (Python)

### 📁 Estrutura Implementada

```
services/analytics-service/
├── pyproject.toml            # Configuração Python avançada
├── .env.example              # Configurações analytics
└── src/analytics_service/
    ├── main.py               # Entry point FastAPI
    └── routers/              # Endpoints especializados
        ├── health.py         # Health checks
        ├── metrics.py        # KPIs e métricas
        ├── reports.py        # Geração de relatórios
        ├── dashboards.py     # Dashboards dinâmicos
        └── alerts.py         # Sistema de alertas
```

### 🔧 Funcionalidades Implementadas

#### **1. FastAPI Especializado**

- Configuração para processamento de dados
- Integração com bancos híbridos
- Sistema de analytics engine
- Background tasks com Celery

#### **2. Routers para Analytics**

- **Metrics**: KPIs e métricas em tempo real
- **Reports**: Geração de relatórios customizados
- **Dashboards**: Dashboards interativos
- **Alerts**: Sistema de alertas inteligentes

#### **3. Dependências Data Science**

- Pandas/NumPy para processamento
- Matplotlib/Plotly para visualizações
- Scikit-learn para ML
- SQLAlchemy para ORM

---

## 📚 Shared Libraries

### 📁 Estrutura Implementada

```
shared/
├── types/
│   └── common.ts             # Tipos TypeScript compartilhados
└── utils/
    └── validation.ts         # Schemas de validação Joi
```

### 🔧 Funcionalidades Implementadas

#### **1. Common Types (common.ts)**

- ApiResponse padronizada
- PaginatedResponse
- Interfaces para User, Message, Conversation
- Estruturas de Funnel e FunnelStep
- AIContext para IA

#### **2. Validation Utils (validation.ts)**

- Schemas Joi para validação
- Schemas para User, Message, Funnel
- Helpers de validação
- Paginação padronizada

---

## 🔧 Configurações Técnicas Implementadas

### **TypeScript (Node.js Services)**

- Configuração strict mode
- Paths absolutos configurados
- Source maps para debugging
- Build otimizado para produção

### **Python Services**

- Pyproject.toml moderno
- Dependências opcionais (dev, ml)
- Type checking com MyPy
- Formatação com Black/isort

### **Environment Variables**

- Arquivos .env.example completos
- Configurações para desenvolvimento/produção
- Documentação de cada variável
- Valores padrão seguros

### **Logging Estruturado**

- JSON format para produção
- Níveis configuráveis
- Correlação entre serviços
- Timestamps padronizados

### **Error Handling**

- Tratamento padronizado
- Stack traces em desenvolvimento
- Status codes apropriados
- Logging de erros estruturado

---

## 🚫 O que será REMOVIDO na Limpeza

### **Lógicas de Negócio**

- Implementações específicas de rotas (manter apenas estrutura)
- Classes complexas (simplificar para esqueletos)
- Validações específicas
- Integrações com APIs externas

### **O que será MANTIDO**

- Estrutura de pastas
- Configurações básicas (package.json, tsconfig.json, etc.)
- Arquivos de ambiente (.env.example)
- Documentação (READMEs)
- Entry points básicos
- Configurações de logging
- Estrutura de middleware

---

## 🎯 Objetivo da Limpeza

Deixar cada microserviço com:

1. **Estrutura organizacional** ✅
2. **Configurações básicas** ✅
3. **Entry point funcional** ✅
4. **Sistema de logging** ✅
5. **Health check básico** ✅
6. **Esqueletos de rotas** (sem lógica)
7. **Documentação para desenvolvimento** ✅

Desta forma, cada serviço pode ser desenvolvido independentemente com foco na lógica de negócio específica, sem perder a arquitetura e organização já estabelecida.
