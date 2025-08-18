import { useRef } from "react";
import { Node } from '@xyflow/react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Minus, Square, Save } from "lucide-react";

interface NodeEditModalProps {
  isOpen: boolean;
  isMinimized: boolean;
  selectedNode: Node | null;
  nodeAnnotations: Record<string, string>;
  modalPosition: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent) => void;
  onMinimize: () => void;
  onRestore: () => void;
  onClose: () => void;
  onSave: () => void;
  onAnnotationChange: (value: string) => void;
}

export const NodeEditModal = ({
  isOpen,
  isMinimized,
  selectedNode,
  nodeAnnotations,
  modalPosition,
  onMouseDown,
  onMinimize,
  onRestore,
  onClose,
  onSave,
  onAnnotationChange,
}: NodeEditModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-20 z-50">
        <Button
          onClick={onRestore}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Square className="h-4 w-4" />
          {String(selectedNode?.data.label || '')}
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed z-50 bg-background/95 backdrop-blur-sm rounded-lg shadow-2xl border border-border"
      style={{
        left: modalPosition.x,
        top: modalPosition.y,
        width: '600px',
        minHeight: '400px'
      }}
    >
      {/* Header com controles */}
      <div
        className="flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-t-lg cursor-move"
        onMouseDown={onMouseDown}
      >
        <h3 className="font-semibold flex items-center gap-2">
          <span>{String(selectedNode?.data.icon || '')}</span>
          Editar: {String(selectedNode?.data.label || '')}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onMinimize}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conteúdo do Modal */}
      <div className="p-6 space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Anotações
          </label>
          <Textarea
            placeholder="Digite suas anotações sobre este nó..."
            className="min-h-[200px] resize-none"
            value={nodeAnnotations[selectedNode?.id || ''] || ''}
            onChange={(e) => onAnnotationChange(e.target.value)}
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};
