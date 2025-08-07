import { useCallback, useState, useEffect } from "react";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import '@xyflow/react/dist/style.css';
import { MapToolbar } from "@/components/funnel/MapToolbar";
import { ConfigPanel } from "@/components/funnel/ConfigPanel";
import { AdvancedNodeManager } from "@/components/funnel/AdvancedNodeManager";
import { FunnelCanvas } from "@/components/funnel/FunnelCanvas";
import { NodeEditModal } from "@/components/funnel/NodeEditModal";
import { MobileControls } from "@/components/funnel/MobileControls";
import { useFunnelState } from "@/hooks/useFunnelState";
import { useDraggableModal } from "@/hooks/useDraggableModal";
import { createNode, getNodeStyle } from "@/lib/nodeUtils";

export default function FunnelBuilder() {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [isFocusMode, setIsFocusMode] = useState(false);
  const funnelState = useFunnelState();
  const modalState = useDraggableModal();

  // Determine if we should use dark styling
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const {
    nodes,
    edges,
    selectedNode,
    isPanelOpen,
    isAdvancedManagerOpen,
    isEditMode,
    isToolbarOpen,
    isEditModalOpen,
    nodeAnnotations,
    setNodes,
    setIsPanelOpen,
    setIsAdvancedManagerOpen,
    setIsEditMode,
    setIsToolbarOpen,
    setIsEditModalOpen,
    setNodeAnnotations,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgesDelete,
    onNodeClick,
    onNodeDoubleClick,
    onPaneClick,
    updateNodeData,
    updateAdvancedNodeData,
  } = funnelState;

  const {
    isMinimized,
    modalPosition,
    handleMouseDown,
    handleMinimize,
    handleRestore,
    centerModal,
    setIsMinimized,
  } = modalState;

  const addNodeToCanvas = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode = createNode(nodeType, position, isFocusMode, isDarkTheme);
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, isFocusMode, isDarkTheme]);

  // Atualizar estilos dos nós existentes quando o modo foco ou tema muda
  const updateNodesForThemeChange = useCallback(() => {
    setNodes((nds) => 
      nds.map((node) => ({
        ...node,
        style: getNodeStyle(
          (node.data && typeof node.data === 'object' && 'type' in node.data) 
            ? String(node.data.type) 
            : 'default', 
          isFocusMode,
          isDarkTheme
        )
      }))
    );
  }, [setNodes, isFocusMode, isDarkTheme]);

  // Efeito para atualizar nós quando modo foco ou tema mudam
  useEffect(() => {
    updateNodesForThemeChange();
  }, [updateNodesForThemeChange]);

  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: any) => {
    onNodeDoubleClick(event, node);
    centerModal();
  }, [onNodeDoubleClick, centerModal]);

  const handleSaveAnnotation = useCallback(() => {
    if (selectedNode) {
      setNodeAnnotations(prev => ({
        ...prev,
        [selectedNode.id]: nodeAnnotations[selectedNode.id] || ''
      }));
    }
    setIsEditModalOpen(false);
  }, [selectedNode, nodeAnnotations, setNodeAnnotations, setIsEditModalOpen]);

  const handleCloseModal = useCallback(() => {
    setIsEditModalOpen(false);
    setIsMinimized(false);
  }, [setIsEditModalOpen, setIsMinimized]);

  const handleAnnotationChange = useCallback((value: string) => {
    if (selectedNode) {
      setNodeAnnotations(prev => ({
        ...prev,
        [selectedNode.id]: value
      }));
    }
  }, [selectedNode, setNodeAnnotations]);

  return (
    <ResponsiveLayout>
      <div className="relative h-screen">
        {/* Header com botão de Modo Foco */}
        <div className="absolute top-4 right-4 z-20">
          <Button
            onClick={() => setIsFocusMode(!isFocusMode)}
            variant="outline"
            size="sm"
            className="bg-background/80 backdrop-blur-sm border border-border hover:bg-accent/80 transition-all duration-300"
          >
            {isFocusMode ? (
              <>
                <Minimize2 className="h-4 w-4 mr-2" />
                Sair do Foco
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 mr-2" />
                Modo Foco
              </>
            )}
          </Button>
        </div>

        {/* Desktop: Barra lateral permanente */}
        {!isMobile && (
          <div 
            className={`absolute left-0 top-0 z-10 transition-all duration-500 ease-in-out ${
              isFocusMode ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
            }`}
          >
            <MapToolbar onAddNode={addNodeToCanvas} />
          </div>
        )}
        
        {/* Canvas Principal */}
        <FunnelCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onPaneClick={onPaneClick}
          isEditMode={isEditMode}
          isFocusMode={isFocusMode}
        />

        {/* Mobile: Controles Flutuantes */}
        {isMobile && (
          <MobileControls
            isEditMode={isEditMode}
            isToolbarOpen={isToolbarOpen}
            onToggleEditMode={() => setIsEditMode(!isEditMode)}
            onToggleToolbar={setIsToolbarOpen}
            onAddNode={addNodeToCanvas}
          />
        )}
        
        {/* Painel de Configuração */}
        <ConfigPanel 
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          selectedNode={selectedNode}
          onUpdateNode={updateNodeData}
        />

        {/* Painel Avançado de Gerenciamento */}
        <AdvancedNodeManager
          isOpen={isAdvancedManagerOpen}
          onClose={() => setIsAdvancedManagerOpen(false)}
          selectedNode={selectedNode}
          onUpdateNode={updateAdvancedNodeData}
        />

        {/* Modal de Edição de Nó */}
        <NodeEditModal
          isOpen={isEditModalOpen}
          isMinimized={isMinimized}
          selectedNode={selectedNode}
          nodeAnnotations={nodeAnnotations}
          modalPosition={modalPosition}
          onMouseDown={handleMouseDown}
          onMinimize={handleMinimize}
          onRestore={handleRestore}
          onClose={handleCloseModal}
          onSave={handleSaveAnnotation}
          onAnnotationChange={handleAnnotationChange}
        />
      </div>
    </ResponsiveLayout>
  );
}
