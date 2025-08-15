# 🚀 Zaplify AI Flow - Arquitetura de Microserviços

Sistema híbrido de IA conversacional com automação de funis para WhatsApp.

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │    API GATEWAY   │    │   MICROSERVIÇOS │
│   React/TS      │◄──►│   Node.js/TS     │◄──►│                 │
│   (Existente)   │    │   (Roteamento)   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                                 │                                 │
              ┌────────▼────────┐              ┌────────▼────────┐                ┌──────▼──────┐
              │  IA SERVICE     │              │ WHATSAPP SERVICE│                │ ANALYTICS   │
              │  Python/FastAPI │              │ Node.js/TS      │                │ Python/TS   │
              └─────────────────┘              └─────────────────┘                └─────────────┘
                                                         │
                                              ┌────────▼────────┐
                                              │ FUNNEL ENGINE   │
                                              │ Node.js/TS      │
                                              └─────────────────┘
```

## 📁 Estrutura de Diretórios

```
zaplify-ai-flow/
├── frontend/                    # React + TypeScript (existente)
├── services/                    # Microserviços
│   ├── api-gateway/            # Gateway centralizado (Node.js/TS)
│   ├── ai-service/             # Serviço de IA (Python/FastAPI)
│   ├── whatsapp-service/       # Integração WhatsApp (Node.js/TS)
│   ├── funnel-engine/          # Motor de funis (Node.js/TS)
│   └── analytics-service/      # Analytics e métricas (Python)
├── shared/                     # Bibliotecas compartilhadas
│   ├── types/                  # Tipos TypeScript comuns
│   └── utils/                  # Utilitários compartilhados
├── infrastructure/             # Docker e deployment
│   ├── docker-compose.yml      # Ambiente completo
│   └── docker-compose.dev.yml  # Apenas bancos para dev
└── supabase/                   # Configurações Supabase
```

## 🛠️ Stack Tecnológica

### Frontend (Mantido)

- **React + TypeScript + Vite**
- **Tailwind CSS + shadcn/ui**
- **Zustand para estado global**

### Backend Microserviços

#### 1. API Gateway (Node.js/TypeScript)

- **Express.js** - Framework web
- **WebSocket (ws)** - WebSocket para tempo real
- **JWT** - Autenticação centralizada
- **Rate Limiting** - Proteção contra abuso
- **Proxy Middleware** - Roteamento para serviços

#### 2. AI Service (Python/FastAPI)

- **FastAPI** - Framework assíncrono
- **LangChain** - Orquestração de IA
- **OpenAI GPT** - Modelos de linguagem
- **ChromaDB** - Vector database
- **RAG** - Retrieval-Augmented Generation

#### 3. WhatsApp Service (Node.js/TypeScript)

- **Baileys** - WhatsApp Web API
- **Express.js** - API REST
- **WebSocket** - Eventos em tempo real
- **Sharp/FFmpeg** - Processamento de mídia
- **MongoDB** - Persistência de sessões

#### 4. Funnel Engine (Node.js/TypeScript)

- **Express.js** - API REST
- **Bull** - Filas de processamento
- **MongoDB** - Armazenamento de funis
- **Cron Jobs** - Agendamento de tarefas
- **JSONPath** - Processamento de condições

#### 5. Analytics Service (Python)

- **FastAPI** - API assíncrona
- **Pandas/NumPy** - Processamento de dados
- **Matplotlib/Plotly** - Visualizações
- **PostgreSQL** - Dados estruturados
- **Celery** - Tarefas em background

### Bancos de Dados

- **PostgreSQL** - Dados estruturados (usuários, analytics)
- **MongoDB** - Dados não estruturados (mensagens, sessões)
- **Redis** - Cache e filas
- **ChromaDB** - Vector database para IA

## 🚀 Quick Start

### Desenvolvimento Local

1. **Clone o repositório**

```bash
git clone https://github.com/IBrenoS/zaplify-ai-flow.git
cd zaplify-ai-flow
```

2. **Inicie os bancos de dados**

```bash
cd infrastructure
docker-compose -f docker-compose.dev.yml up -d
```

3. **Configure cada serviço**

```bash
# API Gateway
cd services/api-gateway
cp .env.example .env
npm install
npm run dev

# AI Service
cd services/ai-service
cp .env.example .env
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate no Windows
pip install -e .
uvicorn ai_service.main:app --reload --port 8001

# WhatsApp Service
cd services/whatsapp-service
cp .env.example .env
npm install
npm run dev

# Funnel Engine
cd services/funnel-engine
cp .env.example .env
npm install
npm run dev

# Analytics Service
cd services/analytics-service
cp .env.example .env
pip install -e .
uvicorn analytics_service.main:app --reload --port 8002

# Frontend (existente)
cd frontend
npm run dev
```

### Docker Completo

```bash
cd infrastructure
docker-compose up -d
```

## 📊 Endpoints dos Serviços

### API Gateway (http://localhost:3000)

- `GET /health` - Status do gateway
- `POST /auth/login` - Autenticação
- `/api/ai/*` → AI Service
- `/api/whatsapp/*` → WhatsApp Service
- `/api/funnel/*` → Funnel Engine
- `/api/analytics/*` → Analytics Service

### AI Service (http://localhost:8001)

- `POST /chat/` - Conversação com IA
- `POST /embeddings/` - Gerar embeddings
- `GET /models/` - Modelos disponíveis

### WhatsApp Service (http://localhost:3002)

- `POST /connection/connect/:sessionId` - Conectar WhatsApp
- `POST /messages/send` - Enviar mensagem
- `GET /connection/qr/:sessionId` - QR Code

### Funnel Engine (http://localhost:3003)

- `POST /funnels/` - Criar funil
- `POST /funnels/:id/execute` - Executar funil
- `GET /flows/:id/status` - Status do fluxo

### Analytics Service (http://localhost:8002)

- `GET /metrics/kpis` - KPIs principais
- `POST /reports/generate` - Gerar relatório
- `GET /dashboards/:id` - Dashboard

## 🔧 Configuração de Desenvolvimento

### Variáveis de Ambiente

Cada serviço possui um arquivo `.env.example` com todas as configurações necessárias.

### Bancos de Dados

- **PostgreSQL**: `localhost:5432`
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`

### Ferramentas de Desenvolvimento

- **pgAdmin**: http://localhost:5050 (admin@zaplify.com / admin)
- **Mongo Express**: http://localhost:8081
- **Redis Commander**: http://localhost:8082

## 📈 Próximos Passos

1. **Implementar lógica de negócio** em cada serviço
2. **Configurar autenticação JWT** no API Gateway
3. **Implementar conexão WhatsApp** com Baileys
4. **Desenvolver engine de IA** com LangChain
5. **Criar sistema de funis** inteligentes
6. **Implementar analytics** em tempo real

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

**Desenvolvido pela equipe Zaplify** 🚀

<div align="center">
  <img src="public/placeholder.svg" alt="Zaplify AI Flow Logo" width="120" />
  <h3 align="center">Intelligent Conversational Sales & Marketing Platform</h3>
</div>

## 📑 Índice

- [Visão Geral](#visão-geral)
- [Recursos Principais](#recursos-principais)
- [Arquitetura Técnica](#arquitetura-técnica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Requisitos do Sistema](#requisitos-do-sistema)
- [Instalação e Configuração](#instalação-e-configuração)
- [Desenvolvimento](#desenvolvimento)
- [Implantação](#implantação)
- [Planos de Assinatura](#planos-de-assinatura)
- [FAQ](#faq)

## 📋 Visão Geral

**Zaplify AI Flow** é uma plataforma de automação de vendas e marketing conversacional, projetada para capacitar empresas a criar, gerenciar e otimizar interações com clientes por meio de assistentes de IA avançados. A solução oferece um conjunto integrado de ferramentas que vão desde a criação de assistentes personalizáveis e a construção de funis de vendas visuais até a análise detalhada de desempenho e a gestão centralizada de conversas.

Com uma arquitetura robusta e uma interface de usuário intuitiva construída em React, a plataforma permite a automação de processos de qualificação de leads, agendamento, vendas e suporte, conectando-se diretamente ao WhatsApp para engajamento em tempo real. O objetivo é maximizar a eficiência operacional, aumentar as taxas de conversão e fornecer uma experiência de cliente excepcional e consistente.

## ✨ Recursos Principais

A plataforma é dividida em módulos poderosos, cada um focado em uma área estratégica do processo de vendas e marketing:

### 🤖 Assistentes de IA (Assistant Studio)

- **Criação e Gestão de Assistentes**: Interface dedicada para criar e configurar múltiplos assistentes, cada um com personalidade, base de conhecimento e objetivos distintos.
- **Base de Conhecimento Externa**: Capacidade de alimentar os assistentes com documentos, URLs e outras fontes de dados para garantir respostas precisas e contextuais.
- **Integração Direta com WhatsApp via qrcode**: Conecte assistentes a números de WhatsApp via qrcode para automatizar conversas com clientes em tempo real.
- **Handoff Inteligente**: Sistema para transferir conversas de forma transparente da IA para um atendente humano quando a complexidade ou a necessidade do cliente exigir.

### 💬 Gestão de Conversas (ZapliWeb & Inbox)

- **Inbox Centralizado**: Um painel unificado para visualizar e gerenciar todas as conversas ativas e passadas, permitindo que a equipe humana monitore e intervenha quando necessário.
- **Alternância IA/Humano**: Assuma o controle de uma conversa iniciada por um assistente com um único clique, garantindo uma transição fluida.
- **Histórico e Análise de Conversas**: Acesso completo ao histórico de interações, com insights e sugestões geradas por IA para otimizar futuras abordagens.
- **Análise de Sentimento**: Monitoramento em tempo real do tom da conversa para avaliar a satisfação do cliente e identificar oportunidades ou riscos.

### 🛠️ Ferramentas de Vendas e Marketing

- **Construtor de Funil Visual (FunnelBuilder)**: Ferramenta drag-and-drop baseada em nós (nodes) para desenhar, personalizar e implementar fluxos de vendas e marketing complexos.
- **Prospecção Automatizada**: Crie e gerencie campanhas de prospecção para geração de leads, com acompanhamento inteligente e automatizado.
- **Agendamento Integrado**: Sincronize calendários e automatize o agendamento de reuniões, demonstrações e follow-ups diretamente no fluxo da conversa.

### 📊 Análise e Desempenho

- **Dashboard de Performance**: Painel principal com KPIs (Key Performance Indicators) sobre vendas, atividades recentes e desempenho geral dos assistentes.
- **Análise de Conversão**: Gráficos detalhados e métricas sobre cada etapa do funil de vendas, incluindo taxas de conversão, engajamento e performance de cada assistente.
- **Análise de Objeções**: Seção dedicada para identificar e analisar as principais objeções levantadas pelos clientes durante as conversas, fornecendo insights valiosos para refinar argumentos de venda e a base de conhecimento da IA.

### 🧪 Testes e Otimização (ZapliTools)

- **Simulador de Conversas**: Um ambiente de testes para interagir com os assistentes antes de implantá-los no ambiente de produção, garantindo que os fluxos funcionem conforme o esperado.
- **Otimização de Conhecimento**: Interface para gerenciar e refinar a base de conhecimento dos assistentes com base nas interações reais e nos resultados de performance.

## 🛠️ Arquitetura Técnica

O Zaplify AI Flow é construído com tecnologias modernas e de alta performance:

- **Frontend**: React com TypeScript
- **Ferramenta de Build**: Vite
- **Estilização**: Tailwind CSS com componentes shadcn/ui
- **Gráficos e Visualizações**: Recharts
- **Manipulação de Formulários**: React Hook Form com Zod
- **Fluxos Interativos**: XY Flow (React Flow)
- **Banco de Dados**: Supabase
- **Autenticação**: Sistema de autenticação integrado com Supabase

## 📁 Estrutura do Projeto

```
zaplify-ai-flow/
├── src/
│   ├── components/      # Componentes UI organizados por funcionalidade
│   │   ├── assistants/  # Componentes relacionados a assistentes de IA
│   │   ├── auth/        # Componentes de autenticação
│   │   ├── conversao/   # Componentes de análise de conversão
│   │   ├── dashboard/   # Widgets e gráficos do painel principal
│   │   ├── funnel/      # Componentes do construtor de funil de vendas
│   │   ├── layout/      # Componentes de layout e estrutura
│   │   ├── mobile/      # Interfaces otimizadas para dispositivos móveis
│   │   └── ui/          # Componentes UI reutilizáveis
│   ├── contexts/        # Provedores de contexto React
│   ├── data/            # Modelos de dados e conteúdo estático
│   ├── hooks/           # Hooks React customizados
│   ├── integrations/    # Integrações com serviços externos
│   ├── lib/             # Bibliotecas de utilidades
│   ├── pages/           # Páginas principais da aplicação
│   └── utils/           # Funções auxiliares
└── supabase/            # Configuração do banco de dados
```

## 🖥️ Requisitos do Sistema

- Node.js 18+ e npm 8+
- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Conexão à internet para integrações com Supabase e WhatsApp

## ⚙️ Instalação e Configuração

```bash
# Clone o repositório
git clone https://github.com/cristiantate/zaplify-ai-flow.git

# Navegue para o diretório do projeto
cd zaplify-ai-flow

# Instale as dependências
npm install

# Configure as variáveis de ambiente
# Crie um arquivo .env baseado no exemplo
cp .env.example .env

# Inicie o servidor de desenvolvimento
npm run dev
```

## 🧩 Desenvolvimento

O projeto segue as melhores práticas modernas de React:

- Componentes funcionais com hooks
- Gerenciamento de estado com Context API
- Design responsivo para dispositivos móveis e desktop
- Arquitetura baseada em componentes com elementos UI reutilizáveis
- Validação de formulários com React Hook Form e Zod

## 🚀 Implantação

Construa os arquivos de produção otimizados:

```bash
npm run build
```

Os arquivos compilados serão gerados no diretório `dist`, prontos para implantação em qualquer serviço de hospedagem estática como Vercel, Netlify ou servidores tradicionais.

## 💎 Planos de Assinatura

A plataforma oferece planos escalonáveis para diferentes necessidades de negócio:

### Plano Ignite

- 1 assistente de IA
- Integração básica com WhatsApp
- Acesso ao ZapliWeb
- 500 interações mensais

### Plano Accelerate

- Até 3 assistentes de IA
- Integração completa com WhatsApp
- Acesso ao ZapliWeb e FunnelBuilder
- 5.000 interações mensais
- Análises avançadas de conversão

### Plano Performance

- Assistentes ilimitados
- Todas as integrações disponíveis
- Acesso a todas as ferramentas
- 20.000+ interações mensais
- API personalizada e suporte dedicado

## ❓ FAQ

**P: O sistema funciona com outras plataformas além do WhatsApp?**
R: Atualmente, o foco principal é a integração com WhatsApp, mas estamos trabalhando em integrações adicionais para futuras versões.

**P: É possível personalizar completamente os assistentes?**
R: Sim, os assistentes podem ser personalizados com diferentes personalidades, bases de conhecimento e fluxos de conversação específicos para cada caso de uso.

**P: Como funciona a transferência de IA para humano?**
R: O sistema detecta automaticamente quando uma conversa requer intervenção humana com base em gatilhos personalizáveis, como consultas complexas ou sentimento negativo do cliente.

**P: O sistema é multilíngue?**
R: Sim, os assistentes podem ser configurados para operar em múltiplos idiomas, com suporte completo para português e inglês.

---

© 2025 Zaplify AI Flow. Todos os direitos reservados.

A ideia é criar chatbot completo com o python.

## 🐍 **Backend Python FastAPI - IMPLEMENTADO**

O backend Python com IA conversacional foi implementado seguindo a arquitetura híbrida recomendada:

### ✅ Sprint 1-2: Core de IA (CONCLUÍDO)

- [x] API FastAPI básica
- [x] Integração OpenAI/LangChain
- [x] Sistema de personalidades dos assistentes
- [x] Processamento básico de mensagens
- [x] Integração com Supabase existente
- [x] Endpoints REST completos
- [x] Configuração de desenvolvimento

### 🚀 Como usar o Backend

```bash
# 1. Navegue para o backend
cd backend

# 2. Configure sua chave OpenAI
# Edite o arquivo .env e adicione:
OPENAI_API_KEY=sua_chave_aqui

# 3. Inicie o backend
python start.py

# 4. Acesse a documentação
# http://localhost:8000/api/v1/docs
```

### 🔗 Integração Frontend/Backend

O backend já está integrado com o frontend React:

- ✅ Hook `usePythonBackend` criado
- ✅ Cliente API configurado
- ✅ Endpoints compatíveis com estrutura existente
- ✅ Tipos TypeScript gerados

### 📋 Próximos Sprints

**Sprint 3-4: WhatsApp Integration**

- [ ] WhatsApp Business API setup
- [ ] Sistema de webhooks
- [ ] Gerenciamento de sessões
- [ ] Queue de mensagens

**Sprint 5-6: Funcionalidades Avançadas**

- [ ] Sistema de funis
- [ ] Analytics em tempo real
- [ ] Handoff IA → Humano
- [ ] Dashboard de métricas
