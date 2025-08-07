import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Bot, 
  Search,
  Filter,
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

interface MobileConversationListProps {
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
}

export function MobileConversationList({ contacts, onSelectContact }: MobileConversationListProps) {
  const [filter, setFilter] = useState("all");

  const filters = [
    { id: "all", label: "Tudo", count: contacts.length },
    { id: "unread", label: "Não lidas", count: contacts.filter(c => c.unread > 0).length },
    { id: "waiting", label: "Aguardando", count: 2 },
    { id: "assigned", label: "Atribuído", count: 1 }
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h1 className="text-xl font-semibold mb-3">Conversas</h1>
        
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
              className="h-8 text-xs"
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
            onClick={() => onSelectContact(contact)}
            className="p-4 border-b border-border/50 active:bg-muted/50 transition-colors"
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
  );
}