import { useState, useRef, useEffect } from "react";
import { Node } from '@xyflow/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  X,
  Minimize2,
  Maximize2,
  MessageCircle,
  Zap,
  GitBranch,
  Clock,
  Rocket,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface AdvancedNodeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

type NodeStatus = 'todo' | 'in-progress' | 'completed' | 'paused' | 'problem';

const statusConfig: Record<NodeStatus, { label: string; icon: React.ReactNode; color: string }> = {
  'todo': {
    label: 'A Fazer',
    icon: <Play className="w-4 h-4" />,
    color: 'text-gray-400'
  },
  'in-progress': {
    label: 'Em Progresso',
    icon: <Play className="w-4 h-4" />,
    color: 'text-blue-400'
  },
  'completed': {
    label: 'Concluído',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-400'
  },
  'paused': {
    label: 'Pausado',
    icon: <Pause className="w-4 h-4" />,
    color: 'text-yellow-400'
  },
  'problem': {
    label: 'Com Problema',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-red-400'
  }
};

export function AdvancedNodeManager({ isOpen, onClose, selectedNode, onUpdateNode }: AdvancedNodeManagerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [nodeConfig, setNodeConfig] = useState({
    message: "",
    delay: "1",
    condition: "",
    label: "",
    notes: "",
    status: 'todo' as NodeStatus
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedNode) {
      setNodeConfig(prev => ({
        ...prev,
        label: (selectedNode.data.label as string) || "",
        notes: (selectedNode.data.notes as string) || "",
        status: (selectedNode.data.status as NodeStatus) || 'todo',
        message: (selectedNode.data.message as string) || "",
        delay: (selectedNode.data.delay as string) || "1",
        condition: (selectedNode.data.condition as string) || ""
      }));
      setTasks((selectedNode.data.tasks as Task[]) || []);
    }
  }, [selectedNode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (headerRef.current?.contains(e.target as Element)) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const getNodeTypeIcon = (): React.ReactNode => {
    if (!selectedNode) return <Rocket className="w-5 h-5" />;

    switch (selectedNode.data.type) {
      case 'trigger': return <Rocket className="w-5 h-5" />;
      case 'message': return <MessageCircle className="w-5 h-5" />;
      case 'action': return <Zap className="w-5 h-5" />;
      case 'condition': return <GitBranch className="w-5 h-5" />;
      case 'delay': return <Clock className="w-5 h-5" />;
      default: return <Rocket className="w-5 h-5" />;
    }
  };

  const handleSave = () => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, {
        ...nodeConfig,
        tasks
      });
    }
    onClose();
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        text: newTaskText.trim(),
        completed: false
      };
      setTasks(prev => [...prev, newTask]);
      setNewTaskText("");
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const removeTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  if (!isOpen || !selectedNode) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-[#0A0A0A] hover:bg-[#181818] text-white border border-[#FF4500] shadow-lg"
        >
          <div className="flex items-center space-x-2">
            {getNodeTypeIcon()}
            <span className="text-sm">{selectedNode.data.label as string}</span>
          </div>
        </Button>
      </div>
    );
  }

  const modalStyles = isMaximized
    ? { width: '95vw', height: '95vh', transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }
    : {
        width: '900px',
        height: '700px',
        transform: `translate(${position.x}px, ${position.y}px)`,
        left: '50%',
        top: '50%',
        marginLeft: '-450px',
        marginTop: '-350px'
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-[#0A0A0A] border border-[#333] rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={modalStyles}
        onMouseDown={handleMouseDown}
      >
        {/* Header with window controls */}
        <div
          ref={headerRef}
          className="bg-[#FF4500] px-4 py-3 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center space-x-3">
            <div className="text-white">
              {getNodeTypeIcon()}
            </div>
            <div className="text-white">
              <h2 className="font-semibold">Gerenciamento do Nó</h2>
              <p className="text-sm opacity-90">{selectedNode.data.label as string}</p>
            </div>
          </div>

          {/* Window Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="text-white hover:bg-white/20 w-8 h-8 p-0"
            >
              —
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMaximized(!isMaximized)}
              className="text-white hover:bg-white/20 w-8 h-8 p-0"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex bg-[#0A0A0A] text-white overflow-hidden">
          {/* Left Sidebar - Configuration */}
          <div className="w-1/3 bg-[#181818]/80 backdrop-blur-sm border-r border-[#333] p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-[#FF4500]">Configuração Principal</h3>

            <div className="space-y-4">
              {/* Nome do Nó */}
              <div className="space-y-2">
                <Label htmlFor="node-label" className="text-gray-300">Nome do Nó</Label>
                <Input
                  id="node-label"
                  placeholder="Digite um nome descritivo"
                  value={nodeConfig.label}
                  onChange={(e) => setNodeConfig(prev => ({ ...prev, label: e.target.value }))}
                  className="bg-[#0A0A0A]/50 border-[#333] text-white placeholder-gray-500"
                />
              </div>

              <Separator className="bg-[#333]" />

              {/* Status do Nó */}
              <div className="space-y-2">
                <Label className="text-gray-300">Status do Nó</Label>
                <Select value={nodeConfig.status} onValueChange={(value: NodeStatus) => setNodeConfig(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="bg-[#0A0A0A]/50 border-[#333] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-[#333]">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-[#333]">
                        <div className="flex items-center space-x-2">
                          <span className={config.color}>{config.icon}</span>
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Configurações específicas por tipo */}
              {selectedNode.data.type === 'message' && (
                <div className="space-y-2">
                  <Label htmlFor="message-content" className="text-gray-300">Conteúdo da Mensagem</Label>
                  <Textarea
                    id="message-content"
                    placeholder="Digite sua mensagem aqui..."
                    value={nodeConfig.message}
                    onChange={(e) => setNodeConfig(prev => ({ ...prev, message: e.target.value }))}
                    className="bg-[#0A0A0A]/50 border-[#333] text-white placeholder-gray-500"
                    rows={4}
                  />
                </div>
              )}

              {selectedNode.data.type === 'delay' && (
                <div className="space-y-2">
                  <Label htmlFor="delay-time" className="text-gray-300">Tempo de Espera</Label>
                  <Input
                    id="delay-time"
                    type="number"
                    placeholder="1"
                    value={nodeConfig.delay}
                    onChange={(e) => setNodeConfig(prev => ({ ...prev, delay: e.target.value }))}
                    className="bg-[#0A0A0A]/50 border-[#333] text-white placeholder-gray-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Middle Section - Notes */}
          <div className="w-1/3 bg-[#181818]/60 backdrop-blur-sm border-r border-[#333] p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-[#FF4500]">Notas Estratégicas</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="strategic-notes" className="text-gray-300">Anotações Detalhadas</Label>
                <Textarea
                  id="strategic-notes"
                  placeholder="Ex: Lembrete: Testar a copy A/B nesta etapa. O objetivo é aumentar a taxa de cliques em 10%. Verificar os resultados em 7 dias."
                  value={nodeConfig.notes}
                  onChange={(e) => setNodeConfig(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-[#0A0A0A]/50 border-[#333] text-white placeholder-gray-500 min-h-[200px]"
                  rows={10}
                />
                <p className="text-xs text-gray-500">
                  Use este espaço para documentar estratégias, lembretes e observações importantes sobre este nó.
                </p>
              </div>

              {/* Quick formatting buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNodeConfig(prev => ({
                    ...prev,
                    notes: prev.notes + '\n\n**Objetivo:** \n\n**Métricas:** \n\n**Observações:** '
                  }))}
                  className="bg-[#0A0A0A]/50 border-[#333] text-gray-300 hover:bg-[#333]"
                >
                  Adicionar Template
                </Button>
              </div>
            </div>
          </div>

          {/* Right Section - Tasks & Status */}
          <div className="w-1/3 bg-[#181818]/40 backdrop-blur-sm p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-[#FF4500]">Checklist de Tarefas</h3>

            <div className="space-y-4">
              {/* Add new task */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Nova tarefa..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  className="bg-[#0A0A0A]/50 border-[#333] text-white placeholder-gray-500 flex-1"
                />
                <Button
                  onClick={addTask}
                  size="sm"
                  className="bg-[#FF4500] hover:bg-[#FF4500]/80"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Tasks list */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center space-x-2 p-2 bg-[#0A0A0A]/50 rounded border border-[#333]">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="border-[#333]"
                    />
                    <span className={cn(
                      "flex-1 text-sm",
                      task.completed ? "line-through text-gray-500" : "text-white"
                    )}>
                      {task.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTask(task.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20 w-8 h-8 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {tasks.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">Nenhuma tarefa criada</p>
                  <p className="text-xs">Adicione tarefas para organizar seu trabalho</p>
                </div>
              )}

              <Separator className="bg-[#333]" />

              {/* Status indicator */}
              <div className="p-3 bg-[#0A0A0A]/50 rounded border border-[#333]">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={statusConfig[nodeConfig.status].color}>
                    {statusConfig[nodeConfig.status].icon}
                  </span>
                  <span className="text-sm font-medium">Status Atual</span>
                </div>
                <p className="text-sm text-gray-300">{statusConfig[nodeConfig.status].label}</p>
                {nodeConfig.status === 'problem' && (
                  <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded">
                    <p className="text-xs text-red-400">
                      ⚠️ Este nó será destacado no canvas com um indicador de problema
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#181818]/80 backdrop-blur-sm border-t border-[#333] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-[#333] text-gray-300">
              {tasks.filter(t => t.completed).length} / {tasks.length} tarefas concluídas
            </Badge>
            <div className="flex items-center space-x-2">
              <span className={statusConfig[nodeConfig.status].color}>
                {statusConfig[nodeConfig.status].icon}
              </span>
              <span className="text-sm text-gray-300">{statusConfig[nodeConfig.status].label}</span>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="border-[#333] text-gray-300 hover:bg-[#333]">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-[#FF4500] hover:bg-[#FF4500]/80">
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
