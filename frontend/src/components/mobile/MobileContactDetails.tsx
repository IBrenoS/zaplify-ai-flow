import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Tag,
  Lightbulb,
  Flame,
  Clock
} from "lucide-react";

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

interface MobileContactDetailsProps {
  contact: Contact;
  onBack: () => void;
}

export function MobileContactDetails({ contact, onBack }: MobileContactDetailsProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Detalhes do Contato</h1>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Informações do contato */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg">
                    {contact.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{contact.name}</CardTitle>
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
  );
}
