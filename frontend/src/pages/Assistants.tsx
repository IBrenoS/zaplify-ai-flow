import { AssistantStudio } from "@/components/assistants/AssistantStudio";
import { EmptyState } from "@/components/assistants/EmptyState";
import { UpgradeModal } from "@/components/assistants/UpgradeModal";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Calendar,
  Copy,
  Crown,
  Eye,
  Loader2,
  MessageSquare,
  MoreVertical,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Definindo um tipo para o assistente para melhor type safety
interface Assistant {
  id: string;
  name: string;
  description: string;
  personality: string;
  objectives: string[];
  whatsapp_phone?: string;
  // Adicione outros campos que a API retorna
}

const Assistants = () => {
  const [showStudio, setShowStudio] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(
    null
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [assistantToDelete, setAssistantToDelete] = useState<Assistant | null>(
    null
  );
  const isMobile = useIsMobile();

  // Estados para gerenciar os dados locais (sem API)
  const [assistants, setAssistants] = useState<Assistant[]>([
    // Dados mock para demonstração
    {
      id: "1",
      name: "Assistente de Vendas",
      description: "Especialista em vendas e atendimento ao cliente",
      personality: "Profissional e Direto",
      objectives: ["Qualificar leads", "Agendar reuniões"],
      whatsapp_phone: "+5511999999999",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const loadAssistants = useCallback(async () => {
    // Simular carregamento sem API
    setLoading(true);
    setError(null);

    // Simular delay de carregamento
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Os assistentes já estão definidos no estado inicial
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAssistants();
  }, [loadAssistants]);

  // Simulando o plano do usuário - em produção viria do contexto/API
  const userPlan: "ignite" | "accelerate" | "performance" = "ignite";
  const assistantCount = assistants.length;

  const handleCreateNew = () => {
    // Verificar limites por plano
    if (userPlan === "ignite") {
      if (assistantCount >= 1) {
        setShowUpgradeModal(true);
        return;
      }
    } else if (userPlan === "accelerate") {
      if (assistantCount >= 3) {
        setShowUpgradeModal(true);
        return;
      }
    }

    // Permitir criação se não excedeu os limites
    setSelectedAssistant(null);
    setShowStudio(true);
  };

  const handleConfigureAssistant = (assistant: Assistant) => {
    setSelectedAssistant(assistant);
    setShowStudio(true);
  };

  const handleDuplicateAssistant = (assistant: Assistant) => {
    // Verificar se o usuário tem plano compatível para duplicação
    if (userPlan === "ignite") {
      toast({
        title: "Upgrade necessário",
        description:
          "Para duplicar assistentes, você precisa fazer upgrade para um plano superior.",
        variant: "destructive",
      });
      setShowUpgradeModal(true);
      return;
    }

    // Verificar limites por plano
    if (userPlan === "accelerate" && assistantCount >= 3) {
      toast({
        title: "Limite atingido",
        description:
          "Você atingiu o limite de 3 assistentes do plano Accelerate.",
        variant: "destructive",
      });
      setShowUpgradeModal(true);
      return;
    }

    // TODO: Implementar lógica de duplicação
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A duplicação de assistentes estará disponível em breve.",
    });
  };

  const handleDeleteConfirm = async () => {
    if (assistantToDelete) {
      // Simular exclusão local
      setAssistants((prev) =>
        prev.filter((a) => a.id !== assistantToDelete.id)
      );

      toast({
        title: "Assistente removido",
        description: `O assistente ${assistantToDelete.name} foi removido localmente.`,
      });

      setAssistantToDelete(null);
    }
  };

  if (showStudio) {
    return (
      <div className="fixed inset-0 z-50 bg-background md:relative md:z-auto">
        <AssistantStudio
          assistant={selectedAssistant}
          onClose={() => {
            setShowStudio(false);
            // Não precisa recarregar dados da API
          }}
        />
      </div>
    );
  }

  const getCreateButtonText = () => {
    if (userPlan === "ignite") {
      return "Adicionar mais Assistentes";
    }
    return "Criar Novo Assistente";
  };

  const getCreateButtonIcon = () => {
    if (userPlan === "ignite") {
      return <Crown className="w-4 h-4 mr-2" />;
    }
    return <Plus className="w-4 h-4 mr-2" />;
  };

  return (
    <ResponsiveLayout>
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-poppins font-bold mb-2 gradient-text">
                Assistentes de IA
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Gerencie e configure seus assistentes virtuais
              </p>
            </div>
            {!isMobile ? (
              <Button
                onClick={handleCreateNew}
                className={`${
                  userPlan === "ignite"
                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                    : "bg-gradient-zaplify"
                } hover:shadow-lg`}
              >
                {getCreateButtonIcon()}
                {getCreateButtonText()}
              </Button>
            ) : (
              <Button
                onClick={handleCreateNew}
                className={`fixed bottom-6 right-6 h-14 w-14 rounded-full ${
                  userPlan === "ignite"
                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                    : "bg-gradient-zaplify"
                } hover:shadow-lg z-50 p-0`}
                size="icon"
              >
                {userPlan === "ignite" ? (
                  <Crown className="w-6 h-6" />
                ) : (
                  <Plus className="w-6 h-6" />
                )}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : assistants.length === 0 ? (
            <EmptyState onCreateFirst={handleCreateNew} />
          ) : (
            <>
              {/* Layout específico para plano Ignite */}
              {userPlan === "ignite" ? (
                <div className="max-w-md mx-auto">
                  {assistants.slice(0, 1).map((assistant) => (
                    <Card
                      key={assistant.id}
                      className="hover:shadow-xl transition-all duration-300 group w-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-end mb-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDuplicateAssistant(assistant)
                                }
                                disabled={userPlan === "ignite"}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicar Assistente
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setAssistantToDelete(assistant)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deletar Assistente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center justify-center mb-4">
                          <div className="p-4 rounded-2xl bg-primary/20">
                            <Bot className="w-12 h-12 text-primary" />
                          </div>
                        </div>
                        <div className="text-center">
                          <CardTitle className="text-2xl mb-2">
                            {assistant.name}
                          </CardTitle>
                          <Badge variant="default" className="mb-3">
                            Ativo
                          </Badge>
                          <CardDescription className="text-base">
                            {assistant.description}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="text-center p-3 bg-background/50 rounded-lg">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <div className="font-bold text-xl">0</div>
                            <div className="text-xs text-muted-foreground">
                              Conversas
                            </div>
                          </div>
                          <div className="text-center p-3 bg-background/50 rounded-lg">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div className="font-bold text-xl">0</div>
                            <div className="text-xs text-muted-foreground">
                              Conversões
                            </div>
                          </div>
                        </div>
                        <div className="text-center mb-4">
                          <span className="text-sm text-muted-foreground">
                            Personalidade:
                          </span>
                          <div className="font-medium">
                            {assistant.personality}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleConfigureAssistant(assistant)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Layout em grid para planos Accelerate e Performance */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {assistants.map((assistant) => (
                    <Card
                      key={assistant.id}
                      className="hover:shadow-lg transition-all duration-300 group w-full"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                              <Bot className="w-6 h-6 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-lg truncate">
                                {assistant.name}
                              </CardTitle>
                              <Badge variant="default" className="mt-1">
                                Ativo
                              </Badge>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDuplicateAssistant(assistant)
                                }
                                disabled={userPlan === "ignite"}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicar Assistente
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setAssistantToDelete(assistant)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deletar Assistente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="mt-2 text-sm">
                          {assistant.description || "Sem descrição"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div
                          className={`space-y-3 ${
                            isMobile ? "grid grid-cols-2 gap-3" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MessageSquare className="w-4 h-4" />
                              <span className="truncate">Conversas</span>
                            </div>
                            <span className="font-medium">0</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span className="truncate">Conversões</span>
                            </div>
                            <span className="font-medium">0</span>
                          </div>
                          {!isMobile && (
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Eye className="w-4 h-4" />
                                Personalidade
                              </div>
                              <span className="font-medium text-xs">
                                {assistant.personality || "Não definida"}
                              </span>
                            </div>
                          )}
                        </div>
                        {isMobile && (
                          <div className="mt-3 text-sm">
                            <span className="text-muted-foreground">
                              Personalidade:
                            </span>
                            <div className="font-medium text-xs mt-1">
                              {assistant.personality || "Não definida"}
                            </div>
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleConfigureAssistant(assistant)}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Configurar
                          </Button>
                          {isMobile && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDuplicateAssistant(assistant)
                                  }
                                  disabled={userPlan === "ignite"}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Duplicar Assistente
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setAssistantToDelete(assistant)
                                  }
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar Assistente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={userPlan as "ignite" | "accelerate"}
      />

      <AlertDialog
        open={!!assistantToDelete}
        onOpenChange={() => setAssistantToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar permanentemente o assistente "
              {assistantToDelete?.name}". Esta ação também desconectará o número
              de WhatsApp associado e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssistantToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResponsiveLayout>
  );
};

export default Assistants;
