import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  personality?: string;
  knowledge_base?: string[];
  objectives?: string[];
  voice_tone?: string;
  whatsapp_phone?: string;
  advanced_settings?: any;
  created_at: string;
  updated_at: string;
}

export const useAssistants = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssistants(data || []);
    } catch (error: any) {
      console.error('Error fetching assistants:', error);
      toast({
        title: "Erro ao carregar assistentes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAssistant = async (assistantData: Omit<Assistant, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('assistants')
        .insert({
          user_id: user.id,
          ...assistantData
        })
        .select()
        .single();

      if (error) throw error;

      setAssistants(prev => [data, ...prev]);
      toast({
        title: "Assistente criado",
        description: "Seu assistente foi criado com sucesso!",
      });
      
      return data;
    } catch (error: any) {
      console.error('Error creating assistant:', error);
      toast({
        title: "Erro ao criar assistente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateAssistant = async (id: string, assistantData: Partial<Omit<Assistant, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .update(assistantData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setAssistants(prev => prev.map(assistant => 
        assistant.id === id ? data : assistant
      ));
      
      toast({
        title: "Assistente atualizado",
        description: "Suas alterações foram salvas com sucesso!",
      });
      
      return data;
    } catch (error: any) {
      console.error('Error updating assistant:', error);
      toast({
        title: "Erro ao atualizar assistente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAssistant = async (id: string) => {
    try {
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAssistants(prev => prev.filter(assistant => assistant.id !== id));
      toast({
        title: "Assistente excluído",
        description: "O assistente foi removido com sucesso.",
      });
    } catch (error: any) {
      console.error('Error deleting assistant:', error);
      toast({
        title: "Erro ao excluir assistente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, []);

  return {
    assistants,
    loading,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    refetch: fetchAssistants
  };
};