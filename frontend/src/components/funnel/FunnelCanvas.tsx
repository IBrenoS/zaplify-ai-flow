
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { useCallback } from 'react';

interface FunnelCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: any) => void;
  onEdgesDelete?: (edges: Edge[]) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
  isEditMode: boolean;
  isFocusMode?: boolean;
}

export const FunnelCanvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgesDelete,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  isEditMode,
  isFocusMode = false,
}: FunnelCanvasProps) => {
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  // Determine if we should use dark styling
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Handler para teclas pressionadas
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedEdges = edges.filter(edge => edge.selected);
      if (selectedEdges.length > 0 && onEdgesDelete) {
        onEdgesDelete(selectedEdges);
      }
    }
  }, [edges, onEdgesDelete]);

  // Cores e estilos baseados no modo foco ou tema escuro
  const getBackgroundColor = () => {
    if (isFocusMode) return '#0A0A0A';
    if (isDarkTheme) return '#0A0A0A';
    return '#F4F4F7';
  };

  const getDotColor = () => {
    if (isFocusMode) return 'rgba(255, 255, 255, 0.1)';
    if (isDarkTheme) return 'rgba(255, 255, 255, 0.1)';
    return 'rgba(0, 0, 0, 0.05)';
  };

  const getEdgeColor = () => {
    if (isFocusMode) return '#FF4500';
    if (isDarkTheme) return '#2AF598';
    return '#50B887';
  };

  const getMinimapNodeColor = () => {
    if (isFocusMode) return '#FF4500';
    if (isDarkTheme) return '#2AF598';
    return '#50B887';
  };

  const getControlsStyle = () => {
    if (isFocusMode) {
      return 'bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-lg shadow-lg text-white';
    }
    if (isDarkTheme) {
      return 'bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-lg shadow-lg text-white';
    }
    return 'bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm';
  };

  const getMinimapStyle = () => {
    if (isFocusMode) {
      return 'bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-lg shadow-lg';
    }
    if (isDarkTheme) {
      return 'bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-lg shadow-lg';
    }
    return 'bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm';
  };

  const backgroundColor = getBackgroundColor();
  const dotColor = getDotColor();
  const edgeColor = getEdgeColor();
  const minimapNodeColor = getMinimapNodeColor();

  return (
    <div className="h-full relative">
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out`}
        style={{ backgroundColor }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          onKeyDown={onKeyDown}
          fitView
          attributionPosition="bottom-left"
          style={{ backgroundColor }}
          panOnDrag={!isMobile || isEditMode}
          nodesDraggable={!isMobile || isEditMode}
          nodesConnectable={!isMobile || isEditMode}
          elementsSelectable={!isMobile || isEditMode}
          edgesFocusable={true}
          edgesReconnectable={false}
          deleteKeyCode={['Delete', 'Backspace']}
          defaultEdgeOptions={{
            animated: true,
            style: {
              stroke: edgeColor,
              strokeWidth: 2,
              strokeDasharray: '8 5',
            },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={25}
            size={1}
            color={dotColor}
          />
          <Controls
            className={`transition-all duration-500 ${getControlsStyle()}`}
          />
          <MiniMap
            className={`transition-all duration-500 ${getMinimapStyle()}`}
            nodeColor={minimapNodeColor}
          />

          {/* Gradiente para as conexões */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: edgeColor, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: edgeColor, stopOpacity: 0.6 }} />
            </linearGradient>
          </defs>
        </ReactFlow>
      </div>
    </div>
  );
};
