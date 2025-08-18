import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  MessageCircle,
  GitBranch,
  Clock,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface ToolbarCategory {
  title: string;
  icon: React.ReactNode;
  items: ToolbarItem[];
}

const categories: ToolbarCategory[] = [
  {
    title: "Gatilhos",
    icon: <Rocket className="w-4 h-4" />,
    items: [
      {
        id: "trigger",
        label: "Novo Lead",
        icon: "🚀",
        description: "Inicia o funil quando um novo lead entra"
      }
    ]
  },
  {
    title: "Ações",
    icon: <Zap className="w-4 h-4" />,
    items: [
      {
        id: "message",
        label: "Enviar Mensagem",
        icon: "💬",
        description: "Envia uma mensagem para o contato"
      },
      {
        id: "action",
        label: "Adicionar Etiqueta",
        icon: "⚡",
        description: "Adiciona uma etiqueta ao contato"
      }
    ]
  },
  {
    title: "Lógica",
    icon: <GitBranch className="w-4 h-4" />,
    items: [
      {
        id: "condition",
        label: "Condição IF/ELSE",
        icon: "❓",
        description: "Cria uma condição para dividir o fluxo"
      }
    ]
  },
  {
    title: "Tempo",
    icon: <Clock className="w-4 h-4" />,
    items: [
      {
        id: "delay",
        label: "Aguardar",
        icon: "⏰",
        description: "Adiciona um delay antes da próxima ação"
      }
    ]
  }
];

interface FunnelToolbarProps {
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
}

export function FunnelToolbar({ onAddNode }: FunnelToolbarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Gatilhos"]);

  const toggleCategory = (categoryTitle: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryTitle)
        ? prev.filter(cat => cat !== categoryTitle)
        : [...prev, categoryTitle]
    );
  };

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (event: React.DragEvent, nodeType: string) => {
    const canvas = document.querySelector('.react-flow');
    if (canvas) {
      const canvasRect = canvas.getBoundingClientRect();
      const position = {
        x: event.clientX - canvasRect.left,
        y: event.clientY - canvasRect.top,
      };
      onAddNode(nodeType, position);
    }
  };

  return (
    <div className="w-80 glass-nav border-r border-white/10 p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Componentes do Funil
        </h2>
        <p className="text-sm text-muted-foreground">
          Arraste os componentes para o canvas para construir seu funil
        </p>
      </div>

      <div className="space-y-3">
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category.title);

          return (
            <Card key={category.title} className="glass-card">
              <Button
                variant="ghost"
                onClick={() => toggleCategory(category.title)}
                className="w-full flex items-center justify-between p-3 h-auto"
              >
                <div className="flex items-center space-x-2">
                  {category.icon}
                  <span className="font-medium">{category.title}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 animate-accordion-down">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragEnd={(e) => handleDragEnd(e, item.id)}
                      className={cn(
                        "p-3 rounded-lg border cursor-move transition-all duration-200",
                        "hover:border-primary hover:shadow-lg hover:scale-[1.02]",
                        "bg-card/50 backdrop-blur-sm",
                        "active:scale-95"
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-lg">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-6 p-4 glass-card rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">💡</span>
          <h3 className="font-medium text-sm">Dica</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Arraste os componentes para o canvas e conecte-os clicando nos pontos de conexão para criar seu funil automatizado.
        </p>
      </div>
    </div>
  );
}
