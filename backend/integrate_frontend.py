"""
Script para integrar o backend Python com o frontend React existente
"""

import os
import json
from pathlib import Path

def update_frontend_config():
    """Atualiza configurações do frontend para usar o backend Python"""

    # Caminho para o frontend
    frontend_path = Path("../src/lib")

    if not frontend_path.exists():
        print("❌ Diretório do frontend não encontrado")
        return False

    # Criar arquivo de configuração da API
    api_config = {
        "API_BASE_URL": "http://localhost:8000/api/v1",
        "BACKEND_TYPE": "python_fastapi",
        "FEATURES": {
            "ai_chat": True,
            "assistants": True,
            "conversations": False,  # Em desenvolvimento
            "whatsapp": False,       # Próximo sprint
            "analytics": False       # Futuro
        }
    }

    config_file = frontend_path / "backend-config.ts"

    config_content = f"""// Configuração do backend Python FastAPI
// Gerado automaticamente pelo script de integração

export const backendConfig = {json.dumps(api_config, indent=2)};

export const apiClient = {{
  baseURL: '{api_config["API_BASE_URL"]}',

  // Método helper para fazer requisições
  async request(endpoint: string, options: RequestInit = {{}}) {{
    const url = `${{this.baseURL}}${{endpoint}}`;

    const defaultOptions: RequestInit = {{
      headers: {{
        'Content-Type': 'application/json',
        ...options.headers,
      }},
      ...options,
    }};

    try {{
      const response = await fetch(url, defaultOptions);

      if (!response.ok) {{
        throw new Error(`HTTP error! status: ${{response.status}}`);
      }}

      return await response.json();
    }} catch (error) {{
      console.error('API request failed:', error);
      throw error;
    }}
  }},

  // Métodos específicos para assistentes
  assistants: {{
    async create(data: any) {{
      return apiClient.request('/assistants', {{
        method: 'POST',
        body: JSON.stringify(data),
      }});
    }},

    async list() {{
      return apiClient.request('/assistants');
    }},

    async get(id: string) {{
      return apiClient.request(`/assistants/${{id}}`);
    }},

    async update(id: string, data: any) {{
      return apiClient.request(`/assistants/${{id}}`, {{
        method: 'PUT',
        body: JSON.stringify(data),
      }});
    }},

    async delete(id: string) {{
      return apiClient.request(`/assistants/${{id}}`, {{
        method: 'DELETE',
      }});
    }},
  }},

  // Métodos para IA
  ai: {{
    async chat(data: any) {{
      return apiClient.request('/ai/chat', {{
        method: 'POST',
        body: JSON.stringify(data),
      }});
    }},

    async sentiment(text: string) {{
      return apiClient.request('/ai/sentiment', {{
        method: 'POST',
        body: JSON.stringify({{ text }}),
      }});
    }},
  }},
}};
"""

    try:
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(config_content)

        print(f"✅ Arquivo de configuração criado: {config_file}")
        return True

    except Exception as e:
        print(f"❌ Erro ao criar arquivo de configuração: {e}")
        return False

def create_integration_hook():
    """Cria hook React para usar o backend Python"""

    frontend_path = Path("../src/hooks")

    if not frontend_path.exists():
        print("❌ Diretório de hooks não encontrado")
        return False

    hook_content = """import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/backend-config';
import { useToast } from '@/hooks/use-toast';

export interface PythonAssistant {
  id: string;
  name: string;
  description?: string;
  personality?: string;
  objectives?: string[];
  knowledge_base?: string[];
  whatsapp_phone?: string;
  advanced_settings?: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const usePythonBackend = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Assistentes
  const createAssistant = useCallback(async (data: any) => {
    try {
      setLoading(true);
      const assistant = await apiClient.assistants.create(data);

      toast({
        title: "Assistente criado!",
        description: "Seu assistente foi criado no backend Python.",
      });

      return assistant;
    } catch (error: any) {
      toast({
        title: "Erro ao criar assistente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getAssistants = useCallback(async () => {
    try {
      setLoading(true);
      return await apiClient.assistants.list();
    } catch (error: any) {
      toast({
        title: "Erro ao carregar assistentes",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateAssistant = useCallback(async (id: string, data: any) => {
    try {
      setLoading(true);
      const assistant = await apiClient.assistants.update(id, data);

      toast({
        title: "Assistente atualizado!",
        description: "Suas alterações foram salvas.",
      });

      return assistant;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar assistente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteAssistant = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await apiClient.assistants.delete(id);

      toast({
        title: "Assistente removido",
        description: "O assistente foi removido com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover assistente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Chat com IA
  const chatWithAI = useCallback(async (data: {
    message: string;
    conversation_id: string;
    assistant_id: string;
    context?: any;
  }) => {
    try {
      setLoading(true);
      return await apiClient.ai.chat(data);
    } catch (error: any) {
      toast({
        title: "Erro no chat",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    // Assistentes
    createAssistant,
    getAssistants,
    updateAssistant,
    deleteAssistant,
    // IA
    chatWithAI,
  };
};
"""

    hook_file = frontend_path / "usePythonBackend.tsx"

    try:
        with open(hook_file, 'w', encoding='utf-8') as f:
            f.write(hook_content)

        print(f"✅ Hook React criado: {hook_file}")
        return True

    except Exception as e:
        print(f"❌ Erro ao criar hook: {e}")
        return False

def main():
    """Função principal"""
    print("🔗 Zaplify AI Flow - Integração Frontend/Backend")
    print("=" * 50)

    print("📝 Criando configuração da API...")
    if update_frontend_config():
        print("✅ Configuração da API criada")

    print("\n🎣 Criando hook React...")
    if create_integration_hook():
        print("✅ Hook React criado")

    print("\n📋 Próximos passos:")
    print("1. No frontend, importe o hook: import { usePythonBackend } from '@/hooks/usePythonBackend'")
    print("2. Use o hook nos componentes de assistentes")
    print("3. Configure sua OPENAI_API_KEY no backend/.env")
    print("4. Inicie o backend: cd backend && python start.py")
    print("5. Teste a integração!")

if __name__ == "__main__":
    main()
