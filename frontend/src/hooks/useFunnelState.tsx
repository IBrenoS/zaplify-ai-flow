
import { useState, useCallback } from "react";
import { useNodesState, useEdgesState, addEdge, Connection, Edge, Node } from '@xyflow/react';
import { getNodeStyle, createInitialNode } from "@/lib/nodeUtils";

const initialEdges: Edge[] = [];

// Create initial nodes outside the hook to prevent recreation on every render
const initialNodes = (() => {
  try {
    return createInitialNode();
  } catch (error) {
    console.error('Error creating initial nodes:', error);
    return [{
      id: '1',
      type: 'default',
      position: { x: 300, y: 100 },
      data: { 
        label: 'Início do Funil',
        type: 'start',
        icon: '🎯'
      },
      style: {
        background: 'white',
        color: '#374151',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '180px',
        fontSize: '14px',
        fontWeight: '500'
      }
    }];
  }
})();

export const useFunnelState = () => {
  console.log('useFunnelState: Starting hook execution');
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAdvancedManagerOpen, setIsAdvancedManagerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nodeAnnotations, setNodeAnnotations] = useState<Record<string, string>>({});

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Função para remover conexões permanentemente
  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    setEdges((eds) => eds.filter((edge) => !edgesToDelete.find((delEdge) => delEdge.id === edge.id)));
  }, [setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsPanelOpen(true);
  }, []);

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsEditModalOpen(true);
    setIsPanelOpen(false);
    setIsAdvancedManagerOpen(false);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setIsPanelOpen(false);
  }, []);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [setNodes]);

  const updateAdvancedNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { 
              ...node, 
              data: { ...node.data, ...data },
              style: data.status === 'problem' 
                ? { ...node.style, border: '2px solid #ef4444', backgroundColor: '#fef2f2' }
                : getNodeStyle((node.data.type as string) || 'default')
            }
          : node
      )
    );
  }, [setNodes]);

  return {
    // State
    nodes,
    edges,
    selectedNode,
    isPanelOpen,
    isAdvancedManagerOpen,
    isEditMode,
    isToolbarOpen,
    isEditModalOpen,
    nodeAnnotations,
    
    // Setters
    setNodes,
    setSelectedNode,
    setIsPanelOpen,
    setIsAdvancedManagerOpen,
    setIsEditMode,
    setIsToolbarOpen,
    setIsEditModalOpen,
    setNodeAnnotations,
    
    // Handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgesDelete,
    onNodeClick,
    onNodeDoubleClick,
    onPaneClick,
    updateNodeData,
    updateAdvancedNodeData,
  };
};
