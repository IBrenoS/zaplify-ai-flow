import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  ShoppingCart,
  User,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface Activity {
  id: string;
  type: 'message' | 'sale' | 'transfer' | 'completion' | 'lead' | 'conversion';
  title: string;
  description: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'sale',
    title: 'Venda confirmada',
    description: 'R$ 2.500,00 - Plano Empresarial',
    time: '2 min',
    icon: ShoppingCart,
    iconColor: 'text-green-500'
  },
  {
    id: '2',
    type: 'message',
    title: 'Nova conversa iniciada',
    description: 'Cliente Maria Silva - WhatsApp',
    time: '5 min',
    icon: MessageSquare,
    iconColor: 'text-blue-500'
  },
  {
    id: '3',
    type: 'transfer',
    title: 'Transferência realizada',
    description: 'Lead enviado para equipe comercial',
    time: '12 min',
    icon: User,
    iconColor: 'text-purple-500'
  },
  {
    id: '5',
    type: 'lead',
    title: 'Novo lead capturado',
    description: 'João Santos - Formulário de contato',
    time: '22 min',
    icon: TrendingUp,
    iconColor: 'text-orange-500'
  },
  {
    id: '6',
    type: 'conversion',
    title: 'Conversão registrada',
    description: 'Lead convertido em cliente',
    time: '30 min',
    icon: AlertCircle,
    iconColor: 'text-emerald-500'
  }
];

export function RecentActivity() {
  return (
    <Card className="activity-widget-card bg-card shadow-sm border h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Atividade Recente
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Últimas interações do sistema
        </p>
      </CardHeader>
      <CardContent className="activity-list space-y-4 flex-1">
        <div className="space-y-3">
          {activities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`p-2 rounded-full bg-muted/20 ${activity.iconColor}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
      <div className="activity-footer border-t border-border/20">
        <Button
          variant="secondary"
          size="sm"
          className="text-sm text-primary hover:text-primary/80 bg-muted/40 hover:bg-muted/60"
        >
          Ver todas as atividades
        </Button>
      </div>
    </Card>
  );
}
