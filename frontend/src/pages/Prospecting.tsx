import { useState } from "react";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProspectingCampaignCard } from "@/components/mobile/MobileTableCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Crown,
  Upload,
  Users,
  MessageSquare,
  Plus,
  Send,
  FileText,
  Sparkles,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from "lucide-react";

const Prospecting = () => {
  const [selectedAssistant, setSelectedAssistant] = useState("");
  const [messages, setMessages] = useState([""]);
  const [activeTab, setActiveTab] = useState("manual");
  const [currentStep, setCurrentStep] = useState(0);
  const isMobile = useIsMobile();

  const assistants = [
    { id: "1", name: "Vendas Pro", status: "active" },
    { id: "2", name: "Atendimento", status: "paused" },
    { id: "3", name: "Suporte", status: "active" }
  ];

  const addMessage = () => {
    setMessages([...messages, ""]);
  };

  const updateMessage = (index: number, value: string) => {
    const newMessages = [...messages];
    newMessages[index] = value;
    setMessages(newMessages);
  };

  const steps = [
    "Configuração",
    "Contatos",
    "Mensagens",
    "Agendamento"
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <ResponsiveLayout>
      <div className="p-4 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-poppins font-bold gradient-text mb-2">
              🚀 Prospecções de Clientes
            </h1>
            <p className="text-muted-foreground">
              Configure campanhas automáticas de prospecção
            </p>
          </div>

          {/* Mobile Progress */}
          {isMobile && (
            <div className="flex justify-between items-center mb-6">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    index <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-px w-8 mx-2 transition-all duration-300 ${
                      index < currentStep ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upgrade Alert */}
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Crown className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">
                    Funcionalidade Premium
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    As prospecções automáticas estão disponíveis apenas no plano Pro.
                    Faça upgrade para desbloquear campanhas ilimitadas.
                  </p>
                  <Button className="bg-gradient-zaplify hover:opacity-90">
                    <Crown className="w-4 h-4 mr-2" />
                    Fazer Upgrade
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Plan */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Plano Atual & Limites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className="text-2xl font-bold">150</div>
                  <div className="text-sm text-muted-foreground">Contatos / mês</div>
                  <div className="text-xs text-primary">43 usados</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className="text-2xl font-bold">5</div>
                  <div className="text-sm text-muted-foreground">Campanhas ativas</div>
                  <div className="text-xs text-primary">2 em execução</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className="text-2xl font-bold">Pro</div>
                  <div className="text-sm text-muted-foreground">Plano atual</div>
                  <Badge variant="secondary" className="mt-1">Ativo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assistant Selection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Selecionar Assistente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha qual assistente fará os disparos" />
                </SelectTrigger>
                <SelectContent>
                  {assistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          assistant.status === "active" ? "bg-green-500" : "bg-orange-500"
                        }`} />
                        {assistant.name}
                        <Badge variant={assistant.status === "active" ? "default" : "secondary"}>
                          {assistant.status === "active" ? "Ativo" : "Pausado"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Contact Management */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gerenciar Contatos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="csv">Upload CSV</TabsTrigger>
                  <TabsTrigger value="existing">Existentes</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Adicionar contatos manualmente</Label>
                    <Textarea
                      placeholder="Digite os números separados por vírgula ou quebra de linha&#10;Exemplo: 11999999999, 11888888888"
                      className="min-h-[120px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="csv" className="space-y-4">
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Arraste seu arquivo CSV aqui ou clique para selecionar
                    </p>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar Arquivo
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="existing" className="space-y-4">
                  <p className="text-muted-foreground">
                    Selecione contatos já cadastrados no sistema
                  </p>
                  <Button variant="outline" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Gerenciar Lista de Contatos
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Mensagens da Campanha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Mensagem {index + 1}</Label>
                    <div className="text-sm text-muted-foreground">
                      {message.length}/500 caracteres
                    </div>
                  </div>
                  <Textarea
                    value={message}
                    onChange={(e) => updateMessage(index, e.target.value)}
                    placeholder="Digite sua mensagem personalizada aqui..."
                    className="min-h-[100px]"
                    maxLength={500}
                  />
                </div>
              ))}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={addMessage}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Mensagem
                </Button>
                <Button variant="outline">
                  <Sparkles className="w-4 h-4 mr-2" />
                  IA Gerar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de início</Label>
                  <Input type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label>Intervalo entre mensagens</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolher intervalo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1min">1 minuto</SelectItem>
                      <SelectItem value="5min">5 minutos</SelectItem>
                      <SelectItem value="15min">15 minutos</SelectItem>
                      <SelectItem value="30min">30 minutos</SelectItem>
                      <SelectItem value="1h">1 hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <Button
                className="w-full bg-gradient-zaplify hover:opacity-90 h-12 text-lg"
                disabled={!selectedAssistant || messages.every(m => !m.trim())}
              >
                <Send className="w-5 h-5 mr-2" />
                Iniciar Campanha de Prospecção
              </Button>
            </CardContent>
          </Card>

          {/* Tips Footer */}
          <Card className="glass-card border-primary/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium text-foreground">Personalize</h4>
                    <p className="text-sm text-muted-foreground">
                      Use variáveis como {"{nome}"} para personalizar mensagens
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium text-foreground">Horários</h4>
                    <p className="text-sm text-muted-foreground">
                      Respeite horários comerciais (8h às 18h)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium text-foreground">Qualidade</h4>
                    <p className="text-sm text-muted-foreground">
                      Teste mensagens com poucos contatos primeiro
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Navigation */}
          {isMobile && (
            <div className="fixed bottom-4 left-4 right-4 flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1"
                >
                  Anterior
                </Button>
              )}
              {currentStep < steps.length - 1 && (
                <Button
                  onClick={nextStep}
                  className="flex-1 bg-gradient-zaplify"
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default Prospecting;
