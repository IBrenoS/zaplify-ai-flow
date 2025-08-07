import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  Sparkles, 
  Save, 
  Play,
  MessageCircle,
  Zap,
  GitBranch,
  Clock,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Node } from '@xyflow/react';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

export function ConfigPanel({ isOpen, onClose, selectedNode, onUpdateNode }: ConfigPanelProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiMode, setIsAiMode] = useState(false);
  const [nodeConfig, setNodeConfig] = useState({
    message: "",
    delay: "1",
    condition: "",
    label: ""
  });

  if (!isOpen || !selectedNode) return null;

  const getNodeTypeIcon = (): React.ReactNode => {
    switch (selectedNode.data.type) {
      case 'trigger': return <Rocket className="w-5 h-5" />;
      case 'message': return <MessageCircle className="w-5 h-5" />;
      case 'action': return <Zap className="w-5 h-5" />;
      case 'condition': return <GitBranch className="w-5 h-5" />;
      case 'delay': return <Clock className="w-5 h-5" />;
      default: return <Rocket className="w-5 h-5" />;
    }
  };

  const getNodeTypeColor = () => {
    return selectedNode.data.type === 'condition' 
      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      : 'bg-primary/20 text-primary border-primary/30';
  };

  const handleSave = () => {
    onUpdateNode(selectedNode.id, nodeConfig);
    onClose();
  };

  const handleAiGenerate = () => {
    // Simulação da geração por IA
    if (aiPrompt.toLowerCase().includes("boas-vindas")) {
      setNodeConfig(prev => ({
        ...prev,
        message: "Olá! 👋 Seja muito bem-vindo(a) à nossa plataforma! Estou aqui para te ajudar no que precisar.",
        label: "Mensagem de Boas-vindas"
      }));
    }
    setAiPrompt("");
    setIsAiMode(false);
  };

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 w-96 glass-nav border-l border-white/10 transform transition-transform duration-300 ease-out z-50",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-lg border", getNodeTypeColor())}>
              {getNodeTypeIcon()}
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Configurar Nó</h2>
              <p className="text-sm text-muted-foreground">{selectedNode.data.label as string}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* AI Section */}
        <div className="p-6 border-b border-white/10">
          <Button
            onClick={() => setIsAiMode(!isAiMode)}
            className="w-full bg-gradient-zaplify hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Criar com IA
          </Button>

          {isAiMode && (
            <div className="mt-4 space-y-3 animate-fade-in">
              <Label htmlFor="ai-prompt">Descreva o que você quer:</Label>
              <Textarea
                id="ai-prompt"
                placeholder="Ex: Envie uma mensagem de boas-vindas personalizada..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="glass-input"
                rows={3}
              />
              <div className="flex space-x-2">
                <Button onClick={handleAiGenerate} size="sm" className="flex-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Gerar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsAiMode(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Nome do Nó */}
          <div className="space-y-2">
            <Label htmlFor="node-label">Nome do Nó</Label>
            <Input
              id="node-label"
              placeholder="Digite um nome descritivo"
              value={nodeConfig.label}
              onChange={(e) => setNodeConfig(prev => ({ ...prev, label: e.target.value }))}
              className="glass-input"
            />
          </div>

          <Separator className="opacity-30" />

          {/* Configurações específicas por tipo */}
          {selectedNode.data.type === 'message' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message-content">Conteúdo da Mensagem</Label>
                <Textarea
                  id="message-content"
                  placeholder="Digite sua mensagem aqui..."
                  value={nodeConfig.message}
                  onChange={(e) => setNodeConfig(prev => ({ ...prev, message: e.target.value }))}
                  className="glass-input"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use variáveis como {"{primeiro_nome}"} para personalizar
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="cursor-pointer text-xs">
                  {"{primeiro_nome}"}
                </Badge>
                <Badge variant="secondary" className="cursor-pointer text-xs">
                  {"{empresa}"}
                </Badge>
                <Badge variant="secondary" className="cursor-pointer text-xs">
                  {"{telefone}"}
                </Badge>
              </div>
            </div>
          )}

          {selectedNode.data.type === 'delay' && (
            <div className="space-y-2">
              <Label htmlFor="delay-time">Tempo de Espera</Label>
              <div className="flex space-x-2">
                <Input
                  id="delay-time"
                  type="number"
                  placeholder="1"
                  value={nodeConfig.delay}
                  onChange={(e) => setNodeConfig(prev => ({ ...prev, delay: e.target.value }))}
                  className="glass-input flex-1"
                />
                <select className="px-3 py-2 glass-input rounded-md">
                  <option value="hours">Horas</option>
                  <option value="days">Dias</option>
                  <option value="minutes">Minutos</option>
                </select>
              </div>
            </div>
          )}

          {selectedNode.data.type === 'condition' && (
            <div className="space-y-2">
              <Label htmlFor="condition-rule">Regra da Condição</Label>
              <Textarea
                id="condition-rule"
                placeholder="Ex: Se o lead não respondeu em 24 horas..."
                value={nodeConfig.condition}
                onChange={(e) => setNodeConfig(prev => ({ ...prev, condition: e.target.value }))}
                className="glass-input"
                rows={3}
              />
            </div>
          )}

          {/* Sugestões da IA */}
          <div className="p-4 glass-card rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">Sugestões da IA</h3>
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full text-left justify-start h-auto p-2">
                <div className="text-xs">
                  <p className="font-medium">Adicionar follow-up</p>
                  <p className="text-muted-foreground">Enviar lembrete em 3 dias</p>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="w-full text-left justify-start h-auto p-2">
                <div className="text-xs">
                  <p className="font-medium">Personalizar mensagem</p>
                  <p className="text-muted-foreground">Usar nome e empresa do lead</p>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 space-y-3">
          <div className="flex space-x-2">
            <Button onClick={handleSave} className="flex-1 bg-gradient-zaplify">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
            <Button variant="outline" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Testar
            </Button>
          </div>
          
          <Button variant="ghost" onClick={onClose} className="w-full">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}