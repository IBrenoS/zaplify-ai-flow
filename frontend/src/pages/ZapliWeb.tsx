import { useState } from "react";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileConversationList } from "@/components/mobile/MobileConversationList";
import { MobileConversationView } from "@/components/mobile/MobileConversationView";
import { MobileContactDetails } from "@/components/mobile/MobileContactDetails";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  User, 
  Send, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  MoreVertical,
  Search,
  Filter,
  Lightbulb,
  Flame,
  Tag,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  isAIActive: boolean;
  status: "online" | "offline" | "away";
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai" | "client";
  timestamp: string;
  isRead: boolean;
}

const contacts: Contact[] = [
  {
    id: "1",
    name: "João Silva",
    lastMessage: "Obrigado pelo atendimento!",
    lastMessageTime: "14:32",
    unread: 0,
    isAIActive: true,
    status: "online"
  },
  {
    id: "2", 
    name: "Maria Santos",
    lastMessage: "Tenho interesse no produto...",
    lastMessageTime: "14:15",
    unread: 2,
    isAIActive: true,
    status: "online"
  },
  {
    id: "3",
    name: "Pedro Costa",
    lastMessage: "Qual o prazo de entrega?",
    lastMessageTime: "13:45",
    unread: 1,
    isAIActive: false,
    status: "away"
  }
];

const messages: Message[] = [
  {
    id: "1",
    content: "Olá! Gostaria de saber mais sobre seus produtos.",
    sender: "client",
    timestamp: "14:30",
    isRead: true
  },
  {
    id: "2",
    content: "Olá João! Fico feliz em ajudar. Temos várias opções disponíveis. Que tipo de produto você está procurando?",
    sender: "ai",
    timestamp: "14:31",
    isRead: true
  },
  {
    id: "3", 
    content: "Obrigado pelo atendimento!",
    sender: "client",
    timestamp: "14:32",
    isRead: true
  }
];

const ZapliWeb = () => {
  const isMobile = useIsMobile();
  const [selectedContact, setSelectedContact] = useState<Contact>(contacts[0]);
  const [isAIActive, setIsAIActive] = useState(selectedContact.isAIActive);
  const [messageInput, setMessageInput] = useState("");
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();
  
  // Estados para navegação mobile
  const [mobileView, setMobileView] = useState<'list' | 'conversation' | 'details'>('list');

  const handleToggleAI = () => {
    setIsAIActive(!isAIActive);
    
    if (!isAIActive) {
      // Ativando IA
      toast({
        title: "🤖 IA Reativada",
        description: "A Zaplify está de volta ao comando desta conversa.",
        duration: 4000,
      });
    }
  };

  const filters = [
    { id: "all", label: "Tudo", count: contacts.length },
    { id: "unread", label: "Não lidas", count: contacts.filter(c => c.unread > 0).length },
    { id: "waiting", label: "Aguardando", count: 2 },
    { id: "assigned", label: "Atribuído", count: 1 }
  ];

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsAIActive(contact.isAIActive);
    if (isMobile) {
      setMobileView('conversation');
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  const handleShowDetails = () => {
    setMobileView('details');
  };

  const handleBackToConversation = () => {
    setMobileView('conversation');
  };

  // Mobile Views
  if (isMobile) {
    if (mobileView === 'list') {
      return (
        <ResponsiveLayout>
          <MobileConversationList 
            contacts={contacts}
            onSelectContact={handleSelectContact}
          />
        </ResponsiveLayout>
      );
    }

    if (mobileView === 'conversation') {
      return (
        <ResponsiveLayout>
          <MobileConversationView
            contact={selectedContact}
            messages={messages}
            onBack={handleBackToList}
            onShowDetails={handleShowDetails}
          />
        </ResponsiveLayout>
      );
    }

    if (mobileView === 'details') {
      return (
        <ResponsiveLayout>
          <MobileContactDetails
            contact={selectedContact}
            onBack={handleBackToConversation}
          />
        </ResponsiveLayout>
      );
    }
  }

  // Desktop View
  return (
    <ResponsiveLayout>
      <div className="flex-1 flex h-screen">
        {/* Coluna 1: Lista de Contatos */}
        <div className="w-80 border-r border-border bg-card/50 backdrop-blur-sm">
          {/* Header da lista */}
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold mb-3">Conversas</h2>
            
            {/* Barra de pesquisa */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar conversas..." 
                className="pl-10 bg-background/50"
              />
            </div>
            
            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
              {filters.map((filterItem) => (
                <Button
                  key={filterItem.id}
                  variant={filter === filterItem.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(filterItem.id)}
                  className="h-7 text-xs"
                >
                  {filterItem.label}
                  {filterItem.count > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 text-xs">
                      {filterItem.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Lista de contatos */}
          <ScrollArea className="flex-1">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleSelectContact(contact)}
                className={cn(
                  "p-4 border-b border-border/50 cursor-pointer hover:bg-muted/50 smooth-transition",
                  selectedContact.id === contact.id && "bg-muted/80"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
                      contact.status === "online" && "bg-green-500",
                      contact.status === "away" && "bg-yellow-500",
                      contact.status === "offline" && "bg-gray-500"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{contact.name}</h3>
                      <div className="flex items-center gap-1">
                        {contact.isAIActive && (
                          <Bot className="w-3 h-3 text-primary" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {contact.lastMessageTime}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.lastMessage}
                      </p>
                      {contact.unread > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 text-xs">
                          {contact.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Coluna 2: Conversa Ativa */}
        <div className="flex-1 flex flex-col">
          {/* Header da conversa */}
          <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>{selectedContact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedContact.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedContact.status === "online" ? "Online" : "Visto por último há 5 min"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Botão de Toggle IA/Humano */}
                <Button
                  onClick={handleToggleAI}
                  variant={isAIActive ? "default" : "secondary"}
                  className={cn(
                    "rounded-full px-4 py-2 smooth-transition transform hover:scale-105",
                    isAIActive 
                      ? "bg-gradient-zaplify hover:shadow-lg" 
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {isAIActive ? (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">IA Ativa</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Você no Controle</span>
                    </>
                  )}
                </Button>
                
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Área de mensagens */}
          <ScrollArea className="flex-1 p-4 bg-dot-pattern">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === "client" ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-2xl",
                      message.sender === "client" && "bg-muted text-foreground",
                      message.sender === "ai" && "bg-primary text-primary-foreground",
                      message.sender === "user" && "bg-gradient-zaplify text-primary-foreground"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-70">{message.timestamp}</span>
                      {message.sender === "ai" && (
                        <Bot className="w-3 h-3 opacity-70" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {!isAIActive && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    Você assumiu o controle
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Campo de digitação */}
          <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Paperclip className="w-5 h-5" />
              </Button>
              
              <div className="flex-1 relative">
                <Input
                  placeholder={isAIActive ? "IA está no controle..." : "Digite uma mensagem..."}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={isAIActive}
                  className={cn(
                    "pr-10",
                    !isAIActive && "ring-2 ring-primary/20 border-primary/30"
                  )}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                size="icon" 
                disabled={!messageInput.trim() || isAIActive}
                className="bg-gradient-zaplify hover:shadow-lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Coluna 3: Painel de Inteligência */}
        <div className="w-80 border-l border-border glass-card p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {/* Informações do contato */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="text-lg">
                        {selectedContact.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedContact.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">+55 11 99999-9999</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      <Tag className="w-3 h-3 mr-1" />
                      Lead Quente
                    </Badge>
                    <Badge variant="outline">Cliente VIP</Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Última compra:</span>
                      <span>R$ 299,90</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total gasto:</span>
                      <span className="font-medium">R$ 1.249,70</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cliente desde:</span>
                      <span>Jan 2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Insights da IA */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    Análise da IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm">
                      💡 Este cliente mencionou 'preço' 3 vezes. 
                      <span className="font-medium"> Sugestão:</span> Ofereça o parcelamento.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-sm">Sentimento: Positivo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ótimo momento para um upsell.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm">Tempo de resposta médio</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      2 minutos (acima da média)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Histórico rápido */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico Rápido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conversas:</span>
                      <span>12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tempo médio:</span>
                      <span>5 min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Satisfação:</span>
                      <span className="text-green-600">98%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default ZapliWeb;