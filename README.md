# Zaplify AI Flow - Frontend

Um projeto React com TypeScript usando Vite, Tailwind CSS e ShadCN/UI.

## 🚀 Como executar

1. Navegue até a pasta frontend:

```bash
cd frontend
```

2. Instale as dependências (se necessário):

```bash
npm install
```

3. Execute o projeto em modo de desenvolvimento:

```bash
npm run dev
```

4. Acesse o projeto em: http://localhost:5173

## 🛠️ Tecnologias

- **React 18** - Biblioteca para interfaces de usuário
- **TypeScript** - Superset do JavaScript com tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utilitário
- **ShadCN/UI** - Componentes de interface
- **React Router DOM** - Roteamento
- **React Hook Form** - Gerenciamento de formulários
- **Supabase** - Backend como serviço
- **React Query** - Gerenciamento de estado e cache

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── pages/         # Páginas da aplicação
│   ├── hooks/         # Custom hooks
│   ├── services/      # Integrações e APIs
│   ├── utils/         # Utilitários
│   ├── types/         # Definições de tipos
│   └── contexts/      # Contextos React
├── public/            # Arquivos estáticos
└── supabase/          # Configurações do Supabase
```

## 📜 Scripts Disponíveis

- `npm run dev` - Executa em modo de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run build:dev` - Gera build de desenvolvimento
- `npm run preview` - Visualiza o build de produção
- `npm run lint` - Executa o linter
