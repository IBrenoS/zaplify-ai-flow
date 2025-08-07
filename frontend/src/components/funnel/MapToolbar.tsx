import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Facebook, Instagram, Globe, DollarSign, Target, Smartphone, FileText, ShoppingCart, MessageCircle, Bot, Tag, Clock, HelpCircle, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface MapItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  category?: string;
}

interface MapToolbarProps {
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
}

const sourcesData: MapItem[] = [
  // Paid
  { id: "facebook-ads", label: "Facebook Ads", icon: <Facebook className="w-6 h-6 text-blue-600" />, description: "Anúncios do Facebook", category: "Paid" },
  { id: "instagram-ads", label: "Instagram Ads", icon: <Instagram className="w-6 h-6 text-pink-600" />, description: "Anúncios do Instagram", category: "Paid" },
  { id: "google-ads", label: "Google Ads", icon: <Target className="w-6 h-6 text-red-600" />, description: "Anúncios do Google", category: "Paid" },
  
  // Search
  { id: "google-organic", label: "Google Orgânico", icon: <Globe className="w-6 h-6 text-green-600" />, description: "Busca orgânica", category: "Search" },
  
  // Social
  { id: "facebook-organic", label: "Facebook Orgânico", icon: <Facebook className="w-6 h-6 text-blue-500" />, description: "Posts orgânicos", category: "Social" },
  { id: "instagram-organic", label: "Instagram Orgânico", icon: <Instagram className="w-6 h-6 text-pink-500" />, description: "Posts orgânicos", category: "Social" },
  
  // Other
  { id: "direct", label: "Tráfego Direto", icon: <Globe className="w-6 h-6 text-gray-600" />, description: "Acesso direto", category: "Other" },
  { id: "email", label: "E-mail Marketing", icon: <Smartphone className="w-6 h-6 text-purple-600" />, description: "Campanhas de e-mail", category: "Other" }
];

const pagesData: MapItem[] = [
  { id: "opt-in", label: "Página de Captura", icon: <FileText className="w-6 h-6 text-blue-600" />, description: "Opt-in para leads" },
  { id: "sales-page", label: "Página de Vendas", icon: <DollarSign className="w-6 h-6 text-green-600" />, description: "Página de vendas" },
  { id: "thank-you", label: "Página de Obrigado", icon: <FileText className="w-6 h-6 text-purple-600" />, description: "Pós conversão" },
  { id: "webinar", label: "Webinar", icon: <FileText className="w-6 h-6 text-orange-600" />, description: "Evento online" }
];

const actionsData: MapItem[] = [
  // Conversion Actions
  { id: "purchase", label: "Compra", icon: <ShoppingCart className="w-6 h-6 text-green-600" />, description: "Finalizar venda", category: "Conversion" },
  { id: "schedule", label: "Agendamento", icon: <Clock className="w-6 h-6 text-blue-600" />, description: "Agendar reunião", category: "Conversion" },
  { id: "form", label: "Formulário", icon: <FileText className="w-6 h-6 text-purple-600" />, description: "Preenchimento", category: "Conversion" },
  
  // Sales Optimization Actions
  { id: "upsell", label: "Upsell", icon: <TrendingUp className="w-6 h-6 text-green-600" />, description: "Oferecer produto de maior valor", category: "Sales Optimization" },
  { id: "downsell", label: "Downsell", icon: <TrendingDown className="w-6 h-6 text-orange-600" />, description: "Oferecer produto de menor valor", category: "Sales Optimization" },
  { id: "order-bump", label: "Order Bump", icon: <Plus className="w-6 h-6 text-blue-600" />, description: "Adicionar oferta complementar", category: "Sales Optimization" },
  
  // Zaplify Actions
  { id: "whatsapp-message", label: "Enviar Mensagem", icon: <MessageCircle className="w-6 h-6 text-green-600" />, description: "Mensagem WhatsApp", category: "Zaplify" },
  { id: "ai-assistant", label: "Assistente IA", icon: <Bot className="w-6 h-6 text-blue-600" />, description: "Iniciar IA", category: "Zaplify" },
  { id: "add-tag", label: "Adicionar Etiqueta", icon: <Tag className="w-6 h-6 text-orange-600" />, description: "Etiquetar contato", category: "Zaplify" },
  { id: "wait", label: "Esperar", icon: <Clock className="w-6 h-6 text-gray-600" />, description: "Temporizador", category: "Zaplify" },
  { id: "condition", label: "Condição", icon: <HelpCircle className="w-6 h-6 text-purple-600" />, description: "IF/ELSE", category: "Zaplify" }
];

export function MapToolbar({ onAddNode }: MapToolbarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { theme } = useTheme();

  // Determine if we should use dark styling
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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

  const filterItems = (items: MapItem[]) => {
    return items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getToolbarStyle = () => {
    if (isDarkTheme) {
      return 'w-80 bg-[#181818] border-r border-gray-600 p-4 overflow-y-auto';
    }
    return 'w-80 bg-white/90 backdrop-blur-sm border-r border-gray-200 p-4 overflow-y-auto';
  };

  const getItemCardStyle = () => {
    if (isDarkTheme) {
      return cn(
        "p-3 rounded-lg border-2 border-dashed border-gray-600 cursor-move",
        "hover:border-primary hover:shadow-md hover:scale-[1.02]",
        "bg-[#1C1C1E]/70 backdrop-blur-sm transition-all duration-200",
        "active:scale-95"
      );
    }
    return cn(
      "p-3 rounded-lg border-2 border-dashed border-gray-300 cursor-move",
      "hover:border-primary hover:shadow-md hover:scale-[1.02]",
      "bg-white/70 backdrop-blur-sm transition-all duration-200",
      "active:scale-95"
    );
  };

  const getTabsListStyle = () => {
    if (isDarkTheme) {
      return 'grid w-full grid-cols-3 bg-gray-800';
    }
    return 'grid w-full grid-cols-3 bg-gray-100';
  };

  const renderCategory = (items: MapItem[], categoryName?: string) => {
    const categoryItems = categoryName 
      ? items.filter(item => item.category === categoryName)
      : items.filter(item => !item.category);

    if (categoryItems.length === 0) return null;

    return (
      <div className="mb-6">
        {categoryName && (
          <h4 className={cn(
            "text-xs font-medium mb-3 uppercase tracking-wide",
            isDarkTheme ? "text-gray-400" : "text-muted-foreground"
          )}>
            {categoryName}
          </h4>
        )}
        <div className="grid grid-cols-2 gap-3">
          {categoryItems.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={(e) => handleDragEnd(e, item.id)}
              className={getItemCardStyle()}
            >
              <div className="flex flex-col items-center space-y-2">
                {item.icon}
                <div className="text-center">
                  <p className={cn(
                    "font-medium text-xs leading-tight",
                    isDarkTheme ? "text-white" : "text-foreground"
                  )}>
                    {item.label}
                  </p>
                  <p className={cn(
                    "text-xs mt-1 leading-tight",
                    isDarkTheme ? "text-gray-400" : "text-muted-foreground"
                  )}>
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={getToolbarStyle()}>
      <div className="mb-6">
        <h2 className={cn(
          "text-lg font-semibold mb-2",
          isDarkTheme ? "text-white" : "text-foreground"
        )}>
          Map
        </h2>
        
        {/* Campo de Busca */}
        <div className="relative mb-4">
          <Search className={cn(
            "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
            isDarkTheme ? "text-gray-400" : "text-muted-foreground"
          )} />
          <Input
            placeholder="Buscar componentes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "pl-10",
              isDarkTheme ? "bg-gray-800/50 border-gray-600 text-white" : "bg-white/50"
            )}
          />
        </div>

        <Tabs defaultValue="sources" className="w-full">
          <TabsList className={getTabsListStyle()}>
            <TabsTrigger value="sources" className="text-xs">Sources</TabsTrigger>
            <TabsTrigger value="pages" className="text-xs">Pages</TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="mt-4">
            <div className="space-y-6">
              {renderCategory(filterItems(sourcesData), "Paid")}
              {renderCategory(filterItems(sourcesData), "Search")}
              {renderCategory(filterItems(sourcesData), "Social")}
              {renderCategory(filterItems(sourcesData), "Other")}
            </div>
          </TabsContent>

          <TabsContent value="pages" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {filterItems(pagesData).map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={(e) => handleDragEnd(e, item.id)}
                  className={getItemCardStyle()}
                >
                  <div className="flex flex-col items-center space-y-2">
                    {item.icon}
                    <div className="text-center">
                      <p className={cn(
                        "font-medium text-xs leading-tight",
                        isDarkTheme ? "text-white" : "text-foreground"
                      )}>
                        {item.label}
                      </p>
                      <p className={cn(
                        "text-xs mt-1 leading-tight",
                        isDarkTheme ? "text-gray-400" : "text-muted-foreground"
                      )}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <div className="space-y-6">
              {renderCategory(filterItems(actionsData), "Conversion")}
              {renderCategory(filterItems(actionsData), "Sales Optimization")}
              {renderCategory(filterItems(actionsData), "Zaplify")}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
