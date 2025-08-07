/**
 * Exemplo de como integrar o backend Python FastAPI com o frontend React
 * Este arquivo demonstra como usar o hook usePythonBackend nos componentes existentes
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePythonBackend } from "@/hooks/usePythonBackend";
import { useEffect, useState } from "react";

/**
 * Exemplo 1: Componente para testar criação de assistente
 */
export const TestAssistantCreation = () => {
  const { createAssistant, loading } = usePythonBackend();
  const { toast } = useToast();

  const handleCreateTest = async () => {
    try {
      const testAssistant = {
        name: "Assistente Teste",
        description: "Criado via backend Python",
        personality: "friendly",
        objectives: ["qualify_leads", "sales"],
        product_service: "Software de automação",
        main_benefits: "Aumenta produtividade",
        target_audience: "Empresas médias",
        can_schedule: true,
        can_sell: true,
        formality_level: 7,
        detail_level: 6,
        emoji_usage: 4,
      };

      const result = await createAssistant(testAssistant);
      console.log("Assistente criado:", result);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Teste Backend Python</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleCreateTest}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Criando..." : "Criar Assistente Teste"}
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Exemplo 2: Chat com IA
 */
export const TestAIChat = () => {
  const { chatWithAI, loading } = usePythonBackend();
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [assistantId, setAssistantId] = useState("");

  const handleChat = async () => {
    if (!message || !assistantId) return;

    try {
      const result = await chatWithAI({
        message,
        conversation_id: "test_conv_" + Date.now(),
        assistant_id: assistantId,
        context: { source: "web_test" },
      });

      setResponse(result.response);
      setMessage("");
    } catch (error) {
      console.error("Erro no chat:", error);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Teste Chat IA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="ID do Assistente"
          value={assistantId}
          onChange={(e) => setAssistantId(e.target.value)}
        />
        <Textarea
          placeholder="Digite sua mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          onClick={handleChat}
          disabled={loading || !message || !assistantId}
          className="w-full"
        >
          {loading ? "Enviando..." : "Enviar Mensagem"}
        </Button>

        {response && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Resposta da IA:</h4>
            <p className="text-sm">{response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Exemplo 3: Como modificar o AssistantStudio existente para usar o backend Python
 */
export const ModifiedAssistantStudioExample = () => {
  // No componente AssistantStudio.tsx existente, você pode substituir:

  /*
  // ANTES (simulação local):
  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Assistente salvo!",
        description: `O assistente "${formData.name}" foi configurado localmente.`,
      });
      onClose();
    } catch (error) {
      // error handling
    } finally {
      setSaving(false);
    }
  };

  // DEPOIS (backend Python real):
  const { createAssistant, updateAssistant } = usePythonBackend();

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "O nome do assistente é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (assistant) {
        // Editando assistente existente
        await updateAssistant(assistant.id, formData);
      } else {
        // Criando novo assistente
        await createAssistant(formData);
      }

      onClose();
    } catch (error: unknown) {
      console.error("Erro ao salvar assistente:", error);
    } finally {
      setSaving(false);
    }
  };
  */

  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      <h3 className="font-medium mb-2">
        Como modificar componentes existentes:
      </h3>
      <ol className="text-sm space-y-1 list-decimal list-inside">
        <li>
          Importe o hook:{" "}
          <code>
            import {`{usePythonBackend}`} from '@/hooks/usePythonBackend'
          </code>
        </li>
        <li>Substitua as funções de simulação pelas funções reais do hook</li>
        <li>Mantenha a mesma interface de usuário</li>
        <li>O backend Python cuidará da persistência e IA</li>
      </ol>
    </div>
  );
};

/**
 * Exemplo 4: Listar assistentes do backend
 */
export const TestAssistantList = () => {
  const { getAssistants, loading } = usePythonBackend();
  const [assistants, setAssistants] = useState([]);

  const loadAssistants = async () => {
    try {
      const result = await getAssistants();
      setAssistants(result);
    } catch (error) {
      console.error("Erro ao carregar assistentes:", error);
    }
  };

  useEffect(() => {
    loadAssistants();
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Assistentes do Backend</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={loadAssistants}
          disabled={loading}
          className="w-full mb-4"
        >
          {loading ? "Carregando..." : "Atualizar Lista"}
        </Button>

        <div className="space-y-2">
          {assistants.map((assistant: any) => (
            <div key={assistant.id} className="p-2 border rounded">
              <div className="font-medium">{assistant.name}</div>
              <div className="text-sm text-muted-foreground">
                {assistant.description}
              </div>
              <div className="text-xs text-muted-foreground">
                ID: {assistant.id}
              </div>
            </div>
          ))}

          {assistants.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center">
              Nenhum assistente encontrado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Para usar estes componentes, adicione em uma página de teste:
export const BackendTestPage = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Teste do Backend Python</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TestAssistantCreation />
        <TestAIChat />
        <TestAssistantList />
        <ModifiedAssistantStudioExample />
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">Status do Backend:</h3>
        <ul className="text-sm space-y-1">
          <li>✅ FastAPI rodando em http://localhost:8000</li>
          <li>✅ Documentação em http://localhost:8000/api/v1/docs</li>
          <li>✅ Integração com Supabase ativa</li>
          <li>⚠️ Configure OPENAI_API_KEY para usar IA</li>
        </ul>
      </div>
    </div>
  );
};
