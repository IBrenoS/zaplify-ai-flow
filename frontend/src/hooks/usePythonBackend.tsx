import { useState, useCallback } from 'react';
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
