// Configuração do backend Python FastAPI
// Gerado automaticamente pelo script de integração

export const backendConfig = {
  "API_BASE_URL": "http://localhost:8000/api/v1",
  "BACKEND_TYPE": "python_fastapi",
  "FEATURES": {
    "ai_chat": true,
    "assistants": true,
    "conversations": false,
    "whatsapp": false,
    "analytics": false
  }
};

export const apiClient = {
  baseURL: 'http://localhost:8000/api/v1',
  
  // Método helper para fazer requisições
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    
    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  // Métodos específicos para assistentes
  assistants: {
    async create(data: any) {
      return apiClient.request('/assistants', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    
    async list() {
      return apiClient.request('/assistants');
    },
    
    async get(id: string) {
      return apiClient.request(`/assistants/${id}`);
    },
    
    async update(id: string, data: any) {
      return apiClient.request(`/assistants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    
    async delete(id: string) {
      return apiClient.request(`/assistants/${id}`, {
        method: 'DELETE',
      });
    },
  },
  
  // Métodos para IA
  ai: {
    async chat(data: any) {
      return apiClient.request('/ai/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    
    async sentiment(text: string) {
      return apiClient.request('/ai/sentiment', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
    },
  },
};
