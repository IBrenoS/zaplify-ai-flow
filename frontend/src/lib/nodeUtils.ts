
import { Node } from '@xyflow/react';

export const getNodeStyle = (nodeType: string, isFocusMode: boolean = false, isDarkTheme: boolean = false) => {
  if (isFocusMode) {
    return {
      background: 'rgba(24, 24, 24, 0.95)',
      color: '#ffffff',
      border: '2px solid #FF4500',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '180px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 8px 25px -5px rgba(255, 69, 0, 0.3), 0 4px 10px -2px rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.5s ease-in-out'
    };
  }
  
  if (isDarkTheme) {
    return {
      background: '#181818',
      color: '#F5F5F5',
      border: '1px solid #333',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '180px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      transition: 'all 0.5s ease-in-out'
    };
  }
  
  return {
    background: 'white',
    color: '#374151',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    minWidth: '180px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    transition: 'all 0.5s ease-in-out'
  };
};

export const createInitialNode = (): Node[] => {
  return [{
    id: '1',
    type: 'default',
    position: { x: 300, y: 100 },
    data: { 
      label: 'Início do Funil',
      type: 'start',
      icon: '🎯'
    },
    style: getNodeStyle('start')
  }];
};

export const nodeConfig: Record<string, { icon: string; label: string }> = {
  // Sources
  'facebook-ads': { icon: '📘', label: 'Facebook Ads' },
  'instagram-ads': { icon: '📸', label: 'Instagram Ads' },
  'google-ads': { icon: '🎯', label: 'Google Ads' },
  'google-organic': { icon: '🔍', label: 'Google Orgânico' },
  'facebook-organic': { icon: '📘', label: 'Facebook Orgânico' },
  'instagram-organic': { icon: '📸', label: 'Instagram Orgânico' },
  'direct': { icon: '🌐', label: 'Tráfego Direto' },
  'email': { icon: '📧', label: 'E-mail Marketing' },
  
  // Pages
  'opt-in': { icon: '📄', label: 'Página de Captura' },
  'sales-page': { icon: '💰', label: 'Página de Vendas' },
  'thank-you': { icon: '🙏', label: 'Página de Obrigado' },
  'webinar': { icon: '🎥', label: 'Webinar' },
  
  // Actions
  'purchase': { icon: '🛒', label: 'Compra' },
  'schedule': { icon: '📅', label: 'Agendamento' },
  'form': { icon: '📋', label: 'Formulário' },
  
  // Sales Optimization
  'upsell': { icon: '💲↑', label: 'Upsell' },
  'downsell': { icon: '💲↓', label: 'Downsell' },
  'order-bump': { icon: '🛒+', label: 'Order Bump' },
  
  // Zaplify Actions
  'whatsapp-message': { icon: '💬', label: 'Mensagem WhatsApp' },
  'ai-assistant': { icon: '🤖', label: 'Assistente IA' },
  'add-tag': { icon: '🏷️', label: 'Adicionar Etiqueta' },
  'wait': { icon: '⏰', label: 'Esperar' },
  'condition': { icon: '❓', label: 'Condição IF/ELSE' }
};

export const createNode = (nodeType: string, position: { x: number; y: number }, isFocusMode: boolean = false, isDarkTheme: boolean = false): Node => {
  const config = nodeConfig[nodeType] || { icon: '⭐', label: 'Novo Nó' };
  
  return {
    id: `${Date.now()}`,
    type: 'default',
    position,
    data: { 
      label: config.label,
      type: nodeType,
      icon: config.icon
    },
    style: getNodeStyle(nodeType, isFocusMode, isDarkTheme)
  };
};
