import { AppSidebar } from "@/components/layout/AppSidebar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Brain,
  Eye,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  Mic,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { WhatsAppConnectionModal } from "./WhatsAppConnectionModal";

interface Assistant {
  id: string;
  name: string;
  description: string;
  personality: string;
  objectives: string[];
  whatsapp_phone?: string;
}

interface PersonalityArchetype {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

interface AssistantStudioProps {
  assistant?: Assistant;
  onClose: () => void;
}

const personalityArchetypes: PersonalityArchetype[] = [
  {
    id: "friendly",
    title: "Amigável e Casual",
    description: "Conversa de forma descontraída e próxima",
    prompt:
      "Você é um assistente amigável e casual. Use linguagem descontraída, seja empático e crie uma conexão pessoal com o cliente.",
  },
  {
    id: "professional",
    title: "Profissional e Direto",
    description: "Objetivo, claro e focado em resultados",
    prompt:
      "Você é um assistente profissional e direto. Seja objetivo, use linguagem formal adequada e foque em eficiência e resultados.",
  },
  {
    id: "enthusiastic",
    title: "Entusiasmado e Persuasivo",
    description: "Motivador e convincente nas interações",
    prompt:
      "Você é um assistente entusiasmado e persuasivo. Demonstre energia positiva, motive o cliente e use técnicas de persuasão ética.",
  },
  {
    id: "expert",
    title: "Especialista e Consultivo",
    description: "Técnico, detalhista e orientado a consulta",
    prompt:
      "Você é um assistente especialista e consultivo. Forneça informações técnicas precisas, faça perguntas diagnósticas e ofereça soluções baseadas em expertise.",
  },
];

export const AssistantStudio = ({
  assistant,
  onClose,
}: AssistantStudioProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("identity");
  const [formData, setFormData] = useState({
    name: assistant?.name || "",
    description: assistant?.description || "",
    selectedArchetype: assistant?.personality || "",
    personalityInstructions: assistant?.personality || "",
    objective: assistant?.objectives?.[0] || "",
    canSchedule: false,
    canSell: false,
    canQualify: true,
    canCaptureData: true,
    uploadedFiles: [] as File[],
    knowledgeSources: [] as { name: string; type: string; active: boolean }[],
    hardRules: "",
    voiceReference: null as File | null,
    quickResponses: [] as { trigger: string; response: string }[],
    formalityLevel: [5],
    detailLevel: [5],
    emojiUsage: [3],
    whatsappConnected: assistant?.whatsapp_phone || false,
    connectedNumber: assistant?.whatsapp_phone || "",
    // Novos campos do formulário guiado
    productService: "",
    mainBenefits: "",
    targetAudience: "",
    competitiveDifferentials: "",
    productsAndPrices: "",
    paymentLink: "",
  });

  // Carregar dados do assistente se estiver editando
  useEffect(() => {
    if (assistant) {
      setFormData({
        name: assistant.name || "",
        description: assistant.description || "",
        selectedArchetype: assistant.personality || "",
        personalityInstructions: assistant.personality || "",
        objective: assistant.objectives?.[0] || "",
        canSchedule: false,
        canSell: false,
        canQualify: true,
        canCaptureData: true,
        uploadedFiles: [],
        knowledgeSources: [],
        hardRules: "",
        voiceReference: null,
        quickResponses: [],
        formalityLevel: [5],
        detailLevel: [5],
        emojiUsage: [3],
        whatsappConnected: !!assistant.whatsapp_phone,
        connectedNumber: assistant.whatsapp_phone || "",
        // Novos campos do formulário guiado
        productService: "",
        mainBenefits: "",
        targetAudience: "",
        competitiveDifferentials: "",
        productsAndPrices: "",
        paymentLink: "",
      });
    }
  }, [assistant]);

  const handleArchetypeSelect = (archetype: PersonalityArchetype) => {
    setFormData((prev) => ({
      ...prev,
      selectedArchetype: archetype.id,
      personalityInstructions: archetype.prompt,
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData((prev) => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...files],
    }));
  };

  const handleFileRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index),
    }));
  };

  const handleWhatsAppSuccess = (phoneNumber: string) => {
    setFormData((prev) => ({
      ...prev,
      whatsappConnected: true,
      connectedNumber: phoneNumber,
    }));
    setShowWhatsAppModal(false);
  };

  const handleKnowledgeSourceToggle = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      knowledgeSources: prev.knowledgeSources.map((source, i) =>
        i === index ? { ...source, active: !source.active } : source
      ),
    }));
  };

  const handleKnowledgeSourceDelete = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      knowledgeSources: prev.knowledgeSources.filter((_, i) => i !== index),
    }));
  };

  const handleQuickResponseAdd = () => {
    setFormData((prev) => ({
      ...prev,
      quickResponses: [...prev.quickResponses, { trigger: "", response: "" }],
    }));
  };

  const handleQuickResponseUpdate = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      quickResponses: prev.quickResponses.map((qr, i) =>
        i === index ? { ...qr, [field]: value } : qr
      ),
    }));
  };

  const handleQuickResponseDelete = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      quickResponses: prev.quickResponses.filter((_, i) => i !== index),
    }));
  };

  const handleVoiceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, voiceReference: file }));
    }
  };

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
      // Simular salvamento por agora
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Assistente salvo!",
        description: `O assistente "${formData.name}" foi configurado localmente.`,
      });

      onClose();
    } catch (error: unknown) {
      console.error("Erro ao salvar assistente:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o assistente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background w-full">
        {/* Header padrão responsivo da Zaplify */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 p-0 hover:bg-muted/50"
          >
            <ArrowLeft className="h-6 w-6 text-foreground" />
            <span className="sr-only">Voltar</span>
          </Button>
          <div className="flex items-center space-x-3 flex-1 justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-zaplify flex items-center justify-center shadow-md">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-poppins font-bold text-xl text-foreground">
              Zaplify
            </span>
          </div>
          <div className="w-10" /> {/* Spacer para centralizar o logo */}
        </div>

        {/* Título da página abaixo do header */}
        <div className="p-4 pb-2">
          <h1 className="text-xl font-bold text-foreground">
            {assistant ? `Editar ${assistant.name}` : "Criar Novo Assistente"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure personalidade, conhecimento e objetivos
          </p>
        </div>

        {/* Navigation dropdown para abas */}
        <div className="px-4 pb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
          >
            <option value="identity">👤 Identidade</option>
            <option value="knowledge">📚 Conhecimento</option>
            <option value="advanced">⚙️ Recursos Avançados</option>
            <option value="communication">💬 Comunicação</option>
          </select>
        </div>

        {/* Botões de ação fixos no mobile */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t p-4 flex flex-col gap-3 sm:flex-row sm:gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:flex-1 h-12 text-base font-medium"
          >
            Descartar
          </Button>
          <Button
            className="bg-gradient-zaplify hover:shadow-lg w-full sm:flex-1 h-12 text-base font-medium"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Assistente
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
          {/* Conteúdo das abas baseado no dropdown */}
          {activeTab === "identity" && (
            <Card>
              <CardHeader>
                <CardTitle>Identidade e Personalidade</CardTitle>
                <CardDescription>
                  Defina como seu assistente se apresenta e interage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Assistente</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Assistente de Vendas"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Breve descrição do assistente..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-3">
                  <Label>Arquétipo de Personalidade</Label>
                  <div className="flex flex-col gap-3">
                    {personalityArchetypes.map((archetype) => (
                      <div
                        key={archetype.id}
                        className={`w-full p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          formData.selectedArchetype === archetype.id
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                        }`}
                        onClick={() => handleArchetypeSelect(archetype)}
                      >
                        <h4 className="font-medium text-foreground mb-1">
                          {archetype.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {archetype.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalityInstructions">
                    Instruções de Personalidade
                  </Label>
                  <Textarea
                    id="personalityInstructions"
                    placeholder="Instruções específicas sobre como o assistente deve se comportar..."
                    rows={4}
                    value={formData.personalityInstructions}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        personalityInstructions: e.target.value,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "advanced" && (
            <Card>
              <CardHeader>
                <CardTitle>Objetivos e Capacidades</CardTitle>
                <CardDescription>
                  Configure o que seu assistente pode fazer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="objective">Objetivo Principal</Label>
                  <Input
                    id="objective"
                    placeholder="Ex: Qualificar leads e agendar reuniões"
                    value={formData.objective}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        objective: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-4">
                  <Label>Capacidades do Assistente</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Agendar Reuniões</div>
                        <div className="text-sm text-muted-foreground">
                          Permitir que o assistente agende reuniões
                          automaticamente
                        </div>
                      </div>
                      <Switch
                        checked={formData.canSchedule}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            canSchedule: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Vender Produtos</div>
                        <div className="text-sm text-muted-foreground">
                          Habilitar funcionalidades de vendas diretas
                        </div>
                      </div>
                      <Switch
                        checked={formData.canSell}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, canSell: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div>
                        <div className="font-medium">Qualificar Leads</div>
                        <div className="text-sm text-muted-foreground">
                          Fazer perguntas para qualificar o interesse do cliente
                        </div>
                      </div>
                      <Switch checked disabled />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div>
                        <div className="font-medium">Capturar Dados</div>
                        <div className="text-sm text-muted-foreground">
                          Coletar informações de contato e preferências
                        </div>
                      </div>
                      <Switch checked disabled />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "knowledge" && (
            <Card>
              <CardHeader>
                <CardTitle>Base de Conhecimento</CardTitle>
                <CardDescription>
                  Upload de arquivos e configuração de fontes de conhecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Faça upload dos seus arquivos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Suporte para PDF, TXT, DOC, XLS. Máximo 10MB por
                        arquivo.
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.txt,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      className="mt-3 block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </div>

                  {formData.uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Arquivos Enviados</Label>
                      <div className="space-y-2">
                        {formData.uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span className="text-sm">{file.name}</span>
                              <Badge variant="secondary">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileRemove(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <Label>Fontes de Conhecimento Externas</Label>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="font-medium">
                              Website da Empresa
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Extrair informações do site automaticamente
                            </div>
                          </div>
                        </div>
                        <Switch />
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-5 h-5 text-green-500" />
                          <div>
                            <div className="font-medium">
                              Conversas Anteriores
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Aprender com interações passadas
                            </div>
                          </div>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "communication" && (
            <Card>
              <CardHeader>
                <CardTitle>Integração WhatsApp</CardTitle>
                <CardDescription>
                  Configure a conexão do assistente com o WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="whatsapp">
                    <AccordionTrigger>
                      Configuração do WhatsApp
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {formData.whatsappConnected ? (
                        <div className="flex items-center justify-between p-3 border rounded-lg border-green-200 bg-green-50">
                          <div>
                            <p className="font-medium text-green-800">
                              ✅ Conectado
                            </p>
                            <p className="text-sm text-green-600">
                              Número: {formData.connectedNumber}
                            </p>
                          </div>
                          <div className="space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Ver QR Code
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  whatsappConnected: false,
                                  connectedNumber: "",
                                }))
                              }
                            >
                              Desconectar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50">
                          <div>
                            <p className="font-medium text-orange-800">
                              ⚠️ Desconectado
                            </p>
                            <p className="text-sm text-orange-600">
                              Nenhum número conectado
                            </p>
                          </div>
                          <Button
                            onClick={() => setShowWhatsAppModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            Conectar ao WhatsApp
                          </Button>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>

        <WhatsAppConnectionModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          onSuccess={handleWhatsAppSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar />

      <main className="flex-1 w-full">
        {/* Header fixo */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4 md:p-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold truncate">
                  {assistant
                    ? `Editar ${assistant.name}`
                    : "Criar Novo Assistente"}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  Configure personalidade, conhecimento e funcionalidades
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Descartar
              </Button>
              <Button
                className="bg-gradient-zaplify hover:shadow-lg"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Assistente
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="identity" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Identidade
              </TabsTrigger>
              <TabsTrigger
                value="knowledge"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Conhecimento
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Recursos Avançados
              </TabsTrigger>
              <TabsTrigger
                value="communication"
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Comunicação
              </TabsTrigger>
            </TabsList>

            {/* Aba 1: Identidade do Assistente */}
            <TabsContent value="identity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Identidade do Assistente
                  </CardTitle>
                  <CardDescription>
                    Defina como seu assistente se apresenta e interage com os
                    clientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Assistente</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Sofia - Assistente de Vendas"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="objective">Objetivo Principal</Label>
                      <Input
                        id="objective"
                        placeholder="Ex: Qualificar leads e agendar reuniões"
                        value={formData.objective}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            objective: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Arquétipo de Personalidade</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {personalityArchetypes.map((archetype) => (
                        <Card
                          key={archetype.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            formData.selectedArchetype === archetype.id
                              ? "ring-2 ring-primary bg-primary/5"
                              : ""
                          }`}
                          onClick={() => handleArchetypeSelect(archetype)}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-1">
                              {archetype.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {archetype.description}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">
                      Instruções de Personalidade Customizadas
                    </Label>
                    <Textarea
                      id="instructions"
                      placeholder="Descreva como o assistente deve se comportar, seu tom de voz e estilo de comunicação..."
                      className="min-h-[120px]"
                      value={formData.personalityInstructions}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          personalityInstructions: e.target.value,
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 2: Conhecimento e Produto */}
            <TabsContent value="knowledge" className="space-y-6">
              {/* Formulário Guiado - Seção Principal */}
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">
                    Formulário Guiado
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Responda às perguntas abaixo para ensinar ao seu assistente
                    sobre seu negócio
                  </p>
                </div>

                {/* Sobre o Produto ou Serviço */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Sobre o Produto ou Serviço *
                    </CardTitle>
                    <CardDescription>
                      Descreva detalhadamente o que você oferece
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Descreva seu produto ou serviço principal, suas características, como funciona e para que serve..."
                      value={formData.productService}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          productService: e.target.value,
                        }))
                      }
                      className="min-h-[120px] resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formData.productService.length}/500 caracteres
                      </span>
                      <span
                        className={`text-xs ${
                          formData.productService.length >= 80 &&
                          formData.productService.length <= 200
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formData.productService.length >= 80 &&
                        formData.productService.length <= 200
                          ? "Boa"
                          : "80-200 recomendado"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Principais Benefícios */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Principais Benefícios
                    </CardTitle>
                    <CardDescription>
                      Liste as vantagens e benefícios que seu produto oferece
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Liste os principais benefícios e vantagens que seu produto oferece aos clientes..."
                      value={formData.mainBenefits}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          mainBenefits: e.target.value,
                        }))
                      }
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formData.mainBenefits.length}/300 caracteres
                      </span>
                      <span
                        className={`text-xs ${
                          formData.mainBenefits.length >= 50 &&
                          formData.mainBenefits.length <= 150
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formData.mainBenefits.length >= 50 &&
                        formData.mainBenefits.length <= 150
                          ? "Boa"
                          : "50-150 recomendado"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Público-alvo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Público-alvo</CardTitle>
                    <CardDescription>
                      Descreva quem são seus clientes ideais
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Descreva seu público-alvo: idade, gênero, profissão, interesses, necessidades..."
                      value={formData.targetAudience}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetAudience: e.target.value,
                        }))
                      }
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formData.targetAudience.length}/300 caracteres
                      </span>
                      <span
                        className={`text-xs ${
                          formData.targetAudience.length >= 50 &&
                          formData.targetAudience.length <= 150
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formData.targetAudience.length >= 50 &&
                        formData.targetAudience.length <= 150
                          ? "Boa"
                          : "50-150 recomendado"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Diferenciais Competitivos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Diferenciais Competitivos
                    </CardTitle>
                    <CardDescription>
                      O que te diferencia da concorrência
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="O que torna seu produto único? Por que escolher você ao invés da concorrência?"
                      value={formData.competitiveDifferentials}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          competitiveDifferentials: e.target.value,
                        }))
                      }
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formData.competitiveDifferentials.length}/300
                        caracteres
                      </span>
                      <span
                        className={`text-xs ${
                          formData.competitiveDifferentials.length >= 50 &&
                          formData.competitiveDifferentials.length <= 150
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formData.competitiveDifferentials.length >= 50 &&
                        formData.competitiveDifferentials.length <= 150
                          ? "Boa"
                          : "50-150 recomendado"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de Produtos/Serviços e Preços */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Lista de Produtos/Serviços e Preços
                    </CardTitle>
                    <CardDescription>
                      Informe os produtos e valores para o assistente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Produto A - R$ 99,00&#10;Produto B - R$ 149,00&#10;Serviço Premium - R$ 299,00"
                      value={formData.productsAndPrices}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          productsAndPrices: e.target.value,
                        }))
                      }
                      className="min-h-[120px] resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formData.productsAndPrices.length}/500 caracteres
                      </span>
                      <span
                        className={`text-xs ${
                          formData.productsAndPrices.length >= 30 &&
                          formData.productsAndPrices.length <= 200
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formData.productsAndPrices.length >= 30 &&
                        formData.productsAndPrices.length <= 200
                          ? "Boa"
                          : "30-200 recomendado"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Link de Pagamento */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Link de Pagamento ou Compra
                    </CardTitle>
                    <CardDescription>
                      URL para onde direcionar os clientes interessados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="url"
                      placeholder="https://sua-loja.com/checkout"
                      value={formData.paymentLink}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentLink: e.target.value,
                        }))
                      }
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        URL válida para vendas
                      </span>
                      <span
                        className={`text-xs ${
                          formData.paymentLink.includes("http")
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formData.paymentLink.includes("http")
                          ? "Válida"
                          : "URL necessária"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="my-8" />

              {/* Base de Conhecimento Suplementar - Seção Secundária */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Base de Conhecimento Suplementar
                  </CardTitle>
                  <CardDescription>
                    Complementar: Adicione documentos para informações extras
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload de Documentos - Agora menor */}
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.xlsx,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Upload de Documentos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOCX, TXT, XLSX, CSV
                      </p>
                    </label>
                  </div>

                  {/* Lista de Arquivos Carregados */}
                  {formData.uploadedFiles.length > 0 && (
                    <div className="space-y-3">
                      <Label>Arquivos Carregados</Label>
                      <div className="space-y-2">
                        {formData.uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {file.type} - {(file.size / 1024).toFixed(2)}{" "}
                                  KB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleFileRemove(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 3: Recursos Avançados */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Recursos Avançados
                  </CardTitle>
                  <CardDescription>
                    Controle fino sobre o comportamento técnico do assistente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Regras Inquebráveis */}
                  <div className="space-y-2">
                    <Label htmlFor="hardRules">
                      Regras Inquebráveis (Hard Rules)
                    </Label>
                    <Textarea
                      id="hardRules"
                      placeholder="Defina aqui as regras que seu assistente NUNCA deve quebrar. Ex: 'Nunca ofereça descontos acima de 10%', 'Sempre transfira para um humano se a palavra 'reclamação' for mencionada'"
                      className="min-h-[120px]"
                      value={formData.hardRules}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hardRules: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <Separator />

                  {/* Upload de Áudio para Tom de Voz */}
                  <div className="space-y-4">
                    <Label>Referência de Tom de Voz</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept=".mp3,.wav,.m4a"
                        onChange={handleVoiceUpload}
                        className="hidden"
                        id="voice-upload"
                      />
                      <label htmlFor="voice-upload" className="cursor-pointer">
                        <Mic className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Upload de Áudio Referência
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MP3, WAV - até 1 minuto para análise de tom e ritmo
                        </p>
                      </label>
                    </div>
                    {formData.voiceReference && (
                      <div className="flex items-center gap-2 p-2 border rounded">
                        <Mic className="w-4 h-4" />
                        <span className="text-sm">
                          {formData.voiceReference.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              voiceReference: null,
                            }))
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Habilidades do Assistente */}
                  <div className="space-y-4">
                    <Label>Habilidades Habilitadas</Label>
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Agendar Compromissos</p>
                          <p className="text-sm text-muted-foreground">
                            Marcar reuniões e consultas
                          </p>
                        </div>
                        <Switch
                          checked={formData.canSchedule}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              canSchedule: checked,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            Vender Produtos e Serviços
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Processar vendas diretas
                          </p>
                        </div>
                        <Switch
                          checked={formData.canSell}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              canSell: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 4: Comunicação e Personalidade */}
            <TabsContent value="communication" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Comunicação e Personalidade
                  </CardTitle>
                  <CardDescription>
                    Personalize profundamente a forma como o assistente interage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Estilo de Conversa com Sliders */}
                  <div className="space-y-6">
                    <Label>Estilo de Conversa</Label>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Formalidade</span>
                          <span className="text-sm text-muted-foreground">
                            {formData.formalityLevel[0]}/10
                          </span>
                        </div>
                        <Slider
                          value={formData.formalityLevel}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              formalityLevel: value,
                            }))
                          }
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Casual</span>
                          <span>Formal</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Nível de Detalhe</span>
                          <span className="text-sm text-muted-foreground">
                            {formData.detailLevel[0]}/10
                          </span>
                        </div>
                        <Slider
                          value={formData.detailLevel}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              detailLevel: value,
                            }))
                          }
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Conciso</span>
                          <span>Detalhado</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Uso de Emojis</span>
                          <span className="text-sm text-muted-foreground">
                            {formData.emojiUsage[0]}/10
                          </span>
                        </div>
                        <Slider
                          value={formData.emojiUsage}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              emojiUsage: value,
                            }))
                          }
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Nunca</span>
                          <span>Frequentemente</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Mapeamento de Gatilhos e Respostas */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Gatilhos e Respostas Rápidas</Label>
                      <Button
                        onClick={handleQuickResponseAdd}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>

                    {formData.quickResponses.length > 0 && (
                      <div className="space-y-3">
                        {formData.quickResponses.map((qr, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg"
                          >
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Se o cliente disser...
                              </Label>
                              <Input
                                placeholder="Ex: Quanto custa o frete?"
                                value={qr.trigger}
                                onChange={(e) =>
                                  handleQuickResponseUpdate(
                                    index,
                                    "trigger",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">
                                  O assistente responde...
                                </Label>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleQuickResponseDelete(index)
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <Textarea
                                placeholder="Ex: O frete é grátis para todo o Brasil em compras acima de R$ 200!"
                                value={qr.response}
                                onChange={(e) =>
                                  handleQuickResponseUpdate(
                                    index,
                                    "response",
                                    e.target.value
                                  )
                                }
                                rows={2}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.quickResponses.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          Nenhuma resposta rápida configurada
                        </p>
                        <p className="text-xs">
                          Clique em "Adicionar" para criar gatilhos
                          personalizados
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Integração WhatsApp */}
                  <div className="space-y-4">
                    <Label>Integração WhatsApp</Label>
                    {formData.whatsappConnected ? (
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200">
                        <div>
                          <p className="font-medium text-green-800">
                            ✔️ Conectado
                          </p>
                          <p className="text-sm text-green-600">
                            {formData.connectedNumber}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowWhatsAppModal(true)}
                          >
                            Alterar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                whatsappConnected: false,
                                connectedNumber: "",
                              }))
                            }
                          >
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50">
                        <div>
                          <p className="font-medium text-orange-800">
                            ⚠️ Desconectado
                          </p>
                          <p className="text-sm text-orange-600">
                            Nenhum número conectado
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowWhatsAppModal(true)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          Conectar ao WhatsApp
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <WhatsAppConnectionModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onSuccess={handleWhatsAppSuccess}
      />
    </div>
  );
};
