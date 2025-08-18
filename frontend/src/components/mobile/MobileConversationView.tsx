import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Bot,
  User,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

interface MobileConversationViewProps {
  contact: Contact;
  messages: Message[];
  onBack: () => void;
  onShowDetails: () => void;
}

export function MobileConversationView({
  contact,
  messages,
  onBack,
  onShowDetails
}: MobileConversationViewProps) {
  const [isAIActive, setIsAIActive] = useState(contact.isAIActive);
  const [messageInput, setMessageInput] = useState("");
  const { toast } = useToast();

  const handleToggleAI = () => {
    setIsAIActive(!isAIActive);

    if (!isAIActive) {
      toast({
        title: "🤖 IA Reativada",
        description: "A Zaplify está de volta ao comando desta conversa.",
        duration: 4000,
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <button
              onClick={onShowDetails}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{contact.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {contact.status === "online" ? "Online" : "Visto há 5 min"}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onShowDetails}>
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Toggle IA/Humano */}
        <div className="mt-3">
          <Button
            onClick={handleToggleAI}
            variant={isAIActive ? "default" : "secondary"}
            className={cn(
              "w-full rounded-full px-4 py-2 smooth-transition",
              isAIActive
                ? "bg-gradient-zaplify hover:shadow-lg"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {isAIActive ? (
              <>
                <Bot className="w-4 h-4 mr-2" />
                IA Ativa
              </>
            ) : (
              <>
                <User className="w-4 h-4 mr-2" />
                Você no Controle
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Área de mensagens */}
      <ScrollArea className="flex-1 p-4">
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
                  "max-w-[80%] px-4 py-2 rounded-2xl",
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
      <div className="p-4 border-t border-border bg-background">
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
  );
}
