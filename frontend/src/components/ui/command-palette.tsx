import React, { useState, useEffect, useCallback } from 'react';
import { Search, ArrowRight, MessageSquare, Bot, Plus, BarChart3, Rocket, Command, TrendingUp, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const navigationItems: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Visão geral e métricas',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'Navegação',
      action: () => { navigate('/'); onOpenChange(false); }
    },
    {
      id: 'nav-assistants',
      title: 'Assistentes',
      subtitle: 'Gerenciar assistentes de IA',
      icon: <Bot className="h-4 w-4" />,
      category: 'Navegação',
      action: () => { navigate('/assistants'); onOpenChange(false); }
    },
    {
      id: 'nav-inbox',
      title: 'Inbox WhatsApp',
      subtitle: 'Conversas em tempo real',
      icon: <MessageSquare className="h-4 w-4" />,
      category: 'Navegação',
      action: () => { navigate('/inbox'); onOpenChange(false); }
    },
    {
      id: 'nav-prospecting',
      title: 'Prospecção',
      subtitle: 'Ferramentas de prospecção',
      icon: <Rocket className="h-4 w-4" />,
      category: 'Navegação',
      action: () => { navigate('/prospecting'); onOpenChange(false); }
    },
    {
      id: 'nav-funnel',
      title: 'Funil Builder',
      subtitle: 'Construtor de funis',
      icon: <TrendingUp className="h-4 w-4" />,
      category: 'Navegação',
      action: () => { navigate('/funnel-builder'); onOpenChange(false); }
    },
    {
      id: 'nav-conversao',
      title: 'Conversão',
      subtitle: 'Análise de conversão',
      icon: <Target className="h-4 w-4" />,
      category: 'Navegação',
      action: () => { navigate('/conversao'); onOpenChange(false); }
    }
  ];

  const actionItems: CommandItem[] = [
    {
      id: 'action-new-assistant',
      title: 'Criar Novo Assistente',
      subtitle: 'Configurar um novo assistente de IA',
      icon: <Plus className="h-4 w-4" />,
      category: 'Ações Rápidas',
      action: () => { navigate('/assistants'); onOpenChange(false); }
    }
  ];

  const searchAssistants = useCallback(async (searchQuery: string) => {
    if (!user || !searchQuery.trim()) return [];

    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('id, name, description')
        .eq('user_id', user.id)
        .ilike('name', `%${searchQuery}%`)
        .limit(5);

      if (error) throw error;

      return data?.map((assistant) => ({
        id: `assistant-${assistant.id}`,
        title: assistant.name,
        subtitle: assistant.description || 'Assistente de IA',
        icon: <Bot className="h-4 w-4" />,
        category: 'Assistentes',
        action: () => { navigate(`/assistants?edit=${assistant.id}`); onOpenChange(false); }
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar assistentes:', error);
      return [];
    }
  }, [user, navigate, onOpenChange]);

  const filterItems = useCallback(async (searchQuery: string) => {
    setLoading(true);

    const lowerQuery = searchQuery.toLowerCase();

    // Filtrar itens de navegação
    const filteredNavigation = navigationItems.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.subtitle?.toLowerCase().includes(lowerQuery)
    );

    // Filtrar ações rápidas
    const filteredActions = actionItems.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      lowerQuery.includes('criar') || lowerQuery.includes('novo') || lowerQuery.includes('adicionar')
    );

    // Buscar assistentes
    const assistantResults = await searchAssistants(searchQuery);

    const allItems = [
      ...filteredNavigation,
      ...filteredActions,
      ...assistantResults
    ];

    setItems(allItems);
    setSelectedIndex(0);
    setLoading(false);
  }, [searchAssistants]);

  useEffect(() => {
    if (query.trim()) {
      filterItems(query);
    } else {
      // Mostrar sugestões iniciais
      setItems([...navigationItems.slice(0, 4), ...actionItems]);
      setSelectedIndex(0);
    }
  }, [query, filterItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground mr-3" />
          <Input
            placeholder="Buscar em toda a plataforma..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-muted-foreground"
            autoFocus
          />
          <div className="ml-2 flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-border/50">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Buscando...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-muted-foreground mb-2">
                {query.trim() ? 'Nenhum resultado encontrado' : 'Digite para buscar'}
              </div>
              {query.trim() && (
                <div className="text-sm text-muted-foreground">
                  Tente buscar por páginas, assistentes ou ações
                </div>
              )}
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {categoryItems.map((item, index) => {
                      const globalIndex = items.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                            "hover:bg-muted/50",
                            globalIndex === selectedIndex && "bg-muted/70 border-l-2 border-primary"
                          )}
                        >
                          <div className="flex-shrink-0 text-muted-foreground">
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Use ↑↓ para navegar, Enter para selecionar, Esc para fechar
        </div>
      </DialogContent>
    </Dialog>
  );
}
