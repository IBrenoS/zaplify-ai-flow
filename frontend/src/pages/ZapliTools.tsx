import { useState } from "react";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Lightbulb, TestTube, MessageSquare, Bot, TrendingUp, AlertTriangle, Trophy, Crown, Settings, Wrench } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = "hub" | "simulator" | "analytics";

const ZapliTools = () => {
  const [currentView, setCurrentView] = useState<ViewMode>("hub");
  const [selectedAssistant, setSelectedAssistant] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{id: number, sender: "user" | "assistant", message: string, timestamp: string}>>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [simulationMode, setSimulationMode] = useState<"manual" | "ai">("manual");
  const [currentStep, setCurrentStep] = useState(1);
  const isMobile = useIsMobile();

  const assistants = [
    { id: "1", name: "Assistente Vendas" },
    { id: "2", name: "Assistente Suporte" },
    { id: "3", name: "Assistente Agendamento" }
  ];

  const personas = [
    { id: "1", name: "Cliente Decidido", description: "Cliente que já tem interesse em comprar" },
    { id: "2", name: "Cliente com Dúvidas sobre Preço", description: "Cliente interessado mas preocupado com valor" },
    { id: "3", name: "Cliente Irritado", description: "Cliente insatisfeito que precisa de atenção especial" }
  ];

  const insights = [
    {
      id: 1,
      type: "opportunity",
      title: " Oportunidade de Otimização",
      message: "O tempo de resposta para a pergunta 'Qual o valor?' no seu funil 'Vendas Diretas' é 30% maior que a média. Isso pode estar esfriando seus leads.",
      actions: ["Otimizar Agora", "Ver Conversas"]
    },
    {
      id: 2,
      type: "strength",
      title: " Ponto Forte Detectado",
      message: "Parabéns! Sua mensagem de recuperação de boleto tem uma taxa de conversão 25% acima da média dos nossos usuários. Excelente trabalho!",
      actions: ["Compartilhar Estratégia"]
    },
    {
      id: 3,
      type: "critical",
      title: " Alerta Crítico",
      message: "Seu assistente 'Boas-Vindas' não está conseguindo responder perguntas sobre a política de devolução, resultando em 3 transferências para humanos nas últimas 24h.",
      actions: ["Adicionar ao Conhecimento"]
    }
  ];

  const sendMessage = () => {
    if (!currentMessage.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: "user" as const,
      message: currentMessage,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setCurrentMessage("");

    // Simulate assistant response
    setTimeout(() => {
      const assistantResponse = {
        id: Date.now() + 1,
        sender: "assistant" as const,
        message: "Olá! Como posso ajudá-lo hoje?",
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, assistantResponse]);
    }, 1000);
  };

  const renderHub = () => (
    <div className="text-center max-w-6xl mx-auto">
      <div className="mb-12">
        <div className="flex items-center justify-center mb-4">
          <TestTube className="w-8 h-8 text-primary mr-3" />
          <h1 className="text-4xl font-poppins font-bold gradient-text">
            ZapliTools
          </h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Teste e otimize seus assistentes antes de colocá-los no ar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Simulador de Conversa Card */}
        <Card className="glass-card p-8 text-left hover-lift">
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <MessageSquare className="w-8 h-8 text-primary mr-3" />
              <h3 className="text-2xl font-semibold text-foreground">
                Simulador de Conversa
              </h3>
            </div>
            <p className="text-muted-foreground text-lg mb-6">
              Teste diferentes cenários de conversação e refine as respostas do seu assistente.
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-6">
            <p className="text-sm text-muted-foreground">
              ✓ Teste conversas em tempo real<br/>
              ✓ Simule diferentes personas de clientes<br/>
              ✓ Identifique pontos de melhoria
            </p>
          </div>

          <Button
            onClick={() => setCurrentView("simulator")}
            variant="secondary"
            className="w-full"
          >
            Acessar Simulador
          </Button>
        </Card>

        {/* ZaplifyIA Analytics Card */}
        <Card className="glass-card p-8 text-left hover-lift">
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <Bot className="w-8 h-8 text-primary mr-3" />
              <h3 className="text-2xl font-semibold text-foreground">
                ZaplifyIA Analytics
              </h3>
            </div>
            <p className="text-muted-foreground text-lg mb-6">
              Receba insights e sugestões proativas da nossa IA para melhorar a performance dos seus funis.
            </p>
          </div>

          <div className="bg-semantic-positive rounded-lg p-4 border border-primary/20 mb-6">
            <div className="flex items-center">
              <Lightbulb className="w-5 h-5 text-primary mr-2" />
              <p className="text-sm font-medium text-primary">
                "Seu funil 'Lançamento X' está perdendo 38% dos leads no primeiro contato."
              </p>
            </div>
          </div>

          <Button
            onClick={() => setCurrentView("analytics")}
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Ver todos os Insights
          </Button>
        </Card>
      </div>
    </div>
  );

  const renderSimulator = () => (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => setCurrentView("hub")}
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-poppins font-bold text-foreground">
         Simulador de Conversa
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel de Controles */}
        <div className="lg:col-span-1">
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Configurações</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Selecionar Assistente
                </label>
                <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um assistente" />
                  </SelectTrigger>
                  <SelectContent>
                    {assistants.map(assistant => (
                      <SelectItem key={assistant.id} value={assistant.id}>
                        {assistant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Modo de Simulação
                </label>
                <div className="flex space-x-2">
                  <Button
                    variant={simulationMode === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSimulationMode("manual")}
                  >
                    Manual
                  </Button>
                  <Button
                    variant={simulationMode === "ai" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSimulationMode("ai")}
                  >
                    IA
                  </Button>
                </div>
              </div>

              {simulationMode === "ai" && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Persona de Teste
                  </label>
                  <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map(persona => (
                        <SelectItem key={persona.id} value={persona.id}>
                          {persona.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Contexto Inicial
                </label>
                <Textarea
                  placeholder="Ex: Cliente veio de anúncio do Facebook sobre promoção..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-[600px] flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-foreground">Chat de Teste</h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-3 rounded-lg ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/10 text-foreground"
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => setCurrentView("hub")}
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-poppins font-bold text-foreground">
          ZaplifyIA Analytics
        </h1>
      </div>

      <div className="flex items-center space-x-4 mb-8">
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por Funil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Funis</SelectItem>
            <SelectItem value="vendas">Vendas Diretas</SelectItem>
            <SelectItem value="lancamento">Lançamento X</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por Assistente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Assistentes</SelectItem>
            {assistants.map(assistant => (
              <SelectItem key={assistant.id} value={assistant.id}>
                {assistant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {insights.map(insight => (
          <Card key={insight.id} className={`glass-card p-6 ${
            insight.type === "opportunity" ? "bg-semantic-positive" :
            insight.type === "strength" ? "border-primary" :
            "bg-semantic-negative"
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {insight.title}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {insight.message}
                </p>
                <div className="flex space-x-3">
                  {insight.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={index === 0 ? "default" : "outline"}
                      size="sm"
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="ml-4">
                {insight.type === "opportunity" && <TrendingUp className="w-6 h-6 text-primary" />}
                {insight.type === "strength" && <Trophy className="w-6 h-6 text-primary" />}
                {insight.type === "critical" && <AlertTriangle className="w-6 h-6 text-destructive" />}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );


  return (
    <ResponsiveLayout>
      <main className="p-4 md:p-8">
        {currentView === "hub" && renderHub()}
        {currentView === "simulator" && renderSimulator()}
        {currentView === "analytics" && renderAnalytics()}
      </main>
    </ResponsiveLayout>
  );
};

export default ZapliTools;
