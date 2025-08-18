import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MapToolbar } from "@/components/funnel/MapToolbar";
import { Edit3, Plus } from "lucide-react";

interface MobileControlsProps {
  isEditMode: boolean;
  isToolbarOpen: boolean;
  onToggleEditMode: () => void;
  onToggleToolbar: (open: boolean) => void;
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
}

export const MobileControls = ({
  isEditMode,
  isToolbarOpen,
  onToggleEditMode,
  onToggleToolbar,
  onAddNode,
}: MobileControlsProps) => {
  return (
    <>
      {/* Botão de Edição */}
      <Button
        onClick={onToggleEditMode}
        size="icon"
        className={`fixed bottom-20 right-4 z-20 rounded-full w-14 h-14 shadow-lg ${
          isEditMode ? 'bg-green-500 hover:bg-green-600' : 'bg-primary hover:bg-primary/90'
        }`}
      >
        <Edit3 className="w-6 h-6" />
      </Button>

      {/* Botão de Adicionar Nós (só aparece no modo edição) */}
      {isEditMode && (
        <Sheet open={isToolbarOpen} onOpenChange={onToggleToolbar}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-36 right-4 z-20 rounded-full w-14 h-14 shadow-lg bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <div className="mt-6">
              <MapToolbar onAddNode={(nodeType, position) => {
                onAddNode(nodeType, position);
                onToggleToolbar(false);
              }} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Indicador de Modo */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          isEditMode
            ? 'bg-green-500/20 text-green-700 border border-green-500/30'
            : 'bg-blue-500/20 text-blue-700 border border-blue-500/30'
        }`}>
          {isEditMode ? '✏️ Modo Edição' : '👁️ Modo Visualização'}
        </div>
      </div>
    </>
  );
};
