# 🛣️ API Gateway - Padronização de Rotas

## 📋 Resumo da Padronização

Este documento resume a padronização das rotas do API Gateway, eliminando inconsistências entre documentação e implementação.

## ✅ **Convenção Escolhida: Rotas Diretas**

**Decisão:** Utilizar rotas diretas sem prefixo `/proxy/` para seguir princípios REST simples e manter consistência com a implementação existente.

### **❌ Antes (Inconsistente):**

```
Implementação:     /api/v1/ai/conversation
Documentação:      /api/v1/proxy/ai/conversation
Exemplos cURL:     /api/v1/proxy/ai
```

### **✅ Depois (Padronizado):**

```
Implementação:     /api/v1/ai/conversation
Documentação:      /api/v1/ai/conversation
Exemplos cURL:     /api/v1/ai/conversation
Testes:            /api/v1/ai/conversation
OpenAPI/Swagger:   /api/v1/ai/conversation
```

## 🎯 **Rotas Padronizadas**

### **Rotas de Proxy para Microserviços:**

| **Endpoint**                  | **Método** | **Escopo Necessário** | **Serviço Downstream**    |
| ----------------------------- | ---------- | --------------------- | ------------------------- |
| `/api/v1/ai/conversation`     | POST       | `ai:conversation`     | IA Conversational Service |
| `/api/v1/whatsapp/status`     | GET        | `whatsapp:read`       | WhatsApp Service Status   |
| `/api/v1/funnel/execute`      | POST       | `funnel:execute`      | Funnel Engine Execution   |
| `/api/v1/analytics/real-time` | GET        | `analytics:read`      | Analytics Real-time Data  |

### **Rotas de API REST (WebSocket):**

| **Endpoint**             | **Método** | **Escopo Necessário** | **Descrição**            |
| ------------------------ | ---------- | --------------------- | ------------------------ |
| `/api/v1/ws/broadcast`   | POST       | `ws:broadcast`        | Broadcast para sala      |
| `/api/v1/ws/rooms`       | GET        | `ws:read`             | Listar salas ativas      |
| `/api/v1/ws/connections` | GET        | `ws:read`             | Contar conexões por sala |

### **Rotas de Funcionalidades (Protected):**

| **Endpoint**                    | **Método** | **Escopo Necessário** | **Descrição**           |
| ------------------------------- | ---------- | --------------------- | ----------------------- |
| `/api/v1/whatsapp/send-message` | POST       | `whatsapp:send`       | Envio WhatsApp          |
| `/api/v1/analytics/export`      | POST       | `analytics:export`    | Exportação de analytics |

### **Rotas Públicas:**

| **Endpoint** | **Método** | **Escopo Necessário** | **Descrição**         |
| ------------ | ---------- | --------------------- | --------------------- |
| `/health`    | GET        | Público               | Health check agregado |
| `/docs`      | GET        | Público (dev only)    | Swagger UI            |

## 🔧 **Arquivos Atualizados**

### **✅ README.md:**

- ❌ Removidas todas as referências a `/api/v1/proxy/*`
- ✅ Atualizadas tabelas de endpoints
- ✅ Corrigidos exemplos cURL
- ✅ Atualizados cenários de teste
- ✅ Padronizada seção de OpenAPI

### **✅ Implementação (Já Correta):**

- ✅ `src/routes/proxy.ts` - Rotas diretas implementadas
- ✅ `src/routes/protected.ts` - Rotas protegidas corretas
- ✅ `src/index.ts` - Registros de rotas consistentes

### **✅ Testes (Já Corretos):**

- ✅ `src/routes/proxy.test.ts` - 44 testes passando
- ✅ Todos os testes usam rotas diretas
- ✅ Cobertura 100% das rotas padronizadas

### **✅ Documentação OpenAPI (Já Correta):**

- ✅ `src/config/swagger.ts` - Especificação OpenAPI correta
- ✅ Todas as rotas documentadas com rotas diretas
- ✅ Swagger UI acessível em `/docs`

## 📝 **Exemplos de Uso Padronizados**

### **cURL Examples:**

```bash
# IA Conversational
curl -X POST http://localhost:8080/api/v1/ai/conversation \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello AI!"}'

# WhatsApp Status
curl -X GET http://localhost:8080/api/v1/whatsapp/status \
  -H "Authorization: Bearer <token>"

# Funnel Execution
curl -X POST http://localhost:8080/api/v1/funnel/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"funnel_id": "lead_nurturing_001"}'

# Analytics Real-time
curl -X GET http://localhost:8080/api/v1/analytics/real-time \
  -H "Authorization: Bearer <token>"

# WebSocket Broadcast
curl -X POST http://localhost:8080/api/v1/ws/broadcast \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"room": "tenant_acme-corp", "event": "notification", "data": {"message": "Test"}}'
```

### **JavaScript/TypeScript Examples:**

```typescript
// Frontend API Client
const apiClient = {
  baseURL: 'http://localhost:8080/api/v1',

  // IA Conversational
  async sendMessage(message: string, token: string) {
    return fetch(`${this.baseURL}/ai/conversation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
  },

  // WhatsApp Status
  async getWhatsAppStatus(token: string) {
    return fetch(`${this.baseURL}/whatsapp/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Funnel Execution
  async executeFunnel(funnelId: string, triggerData: any, token: string) {
    return fetch(`${this.baseURL}/funnel/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ funnel_id: funnelId, trigger_data: triggerData }),
    });
  },

  // Analytics Real-time
  async getAnalytics(token: string) {
    return fetch(`${this.baseURL}/analytics/real-time`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
```

## ✅ **Benefícios da Padronização**

### **1. Consistência Total:**

- Documentação e código usam a mesma convenção
- Testes refletem a implementação real
- Exemplos funcionam sem modificação

### **2. Developer Experience Melhorada:**

- URLs mais limpos e intuitivos
- Padrão REST tradicional
- Menos confusão para equipes frontend/QA

### **3. Manutenibilidade:**

- Uma única fonte de verdade para rotas
- Documentação sempre atualizada
- Facilita debugging e troubleshooting

### **4. Escalabilidade:**

- Padrão claro para novas rotas
- Facilita integração de novos microserviços
- Suporte a versionamento (`/api/v1/`, `/api/v2/`)

## 🚀 **Próximos Passos**

### **Implementação Completa ✅**

- [x] Padronização escolhida e implementada
- [x] Documentação atualizada
- [x] Testes validados (44/44 passando)
- [x] Build TypeScript funcionando
- [x] OpenAPI/Swagger consistente

### **Recomendações Futuras:**

1. **Versionamento de API:** Considerar `/api/v2/` para mudanças breaking
2. **Rate Limiting por Rota:** Aplicar limites específicos por endpoint
3. **Métricas por Rota:** Monitoramento individual de cada endpoint
4. **Cache Headers:** Implementar cache appropriado para rotas GET
5. **Documentação Interativa:** Expandir exemplos no Swagger UI

---

## 📊 **Status Final**

✅ **PADRONIZAÇÃO COMPLETA** - API Gateway agora usa **rotas diretas** de forma consistente em:

- ✅ Implementação de código
- ✅ Documentação (README.md)
- ✅ Testes automatizados
- ✅ Especificação OpenAPI
- ✅ Exemplos de uso

**Convenção padrão:** `/api/v1/{service}/{action}` (sem prefixo `/proxy/`)
