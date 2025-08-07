
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell, BarChart, Bot, Megaphone, Mail, Smartphone } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";

interface NotificationOption {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

interface NotificationCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  options: NotificationOption[];
}

export const NotificationsTab = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [notifications, setNotifications] = useState<NotificationCategory[]>([
    {
      id: "performance",
      title: "Resumos de Performance",
      icon: BarChart,
      options: [
        {
          id: "weekly-summary",
          label: "Resumo semanal por e-mail",
          description: "Receba um relatório detalhado toda segunda-feira",
          email: true,
          push: false
        },
        {
          id: "monthly-report",
          label: "Relatório mensal completo",
          description: "Análise aprofundada dos resultados do mês",
          email: true,
          push: true
        },
        {
          id: "goal-achieved",
          label: "Metas alcançadas",
          description: "Notificações quando suas metas forem atingidas",
          email: false,
          push: true
        }
      ]
    },
    {
      id: "ai-alerts",
      title: "Alertas da IA",
      icon: Bot,
      options: [
        {
          id: "qualified-leads",
          label: "Novos leads qualificados",
          description: "Quando a IA identifica leads com alta probabilidade de conversão",
          email: true,
          push: true
        },
        {
          id: "opportunity-alerts",
          label: "Oportunidades perdidas",
          description: "Alertas sobre leads que podem estar se afastando",
          email: true,
          push: false
        },
        {
          id: "ai-insights",
          label: "Insights da IA",
          description: "Sugestões e recomendações baseadas em dados",
          email: false,
          push: true
        }
      ]
    },
    {
      id: "platform-news",
      title: "Novidades da Plataforma",
      icon: Megaphone,
      options: [
        {
          id: "new-features",
          label: "Novas funcionalidades",
          description: "Seja o primeiro a saber sobre novos recursos",
          email: true,
          push: true
        },
        {
          id: "system-updates",
          label: "Atualizações do sistema",
          description: "Notificações sobre manutenções e melhorias",
          email: true,
          push: false
        },
        {
          id: "tips-tricks",
          label: "Dicas e truques",
          description: "Conteúdo educativo para otimizar seu uso da plataforma",
          email: false,
          push: false
        }
      ]
    }
  ]);

  const handleNotificationToggle = (
    categoryId: string, 
    optionId: string, 
    type: 'email' | 'push', 
    value: boolean
  ) => {
    setNotifications(prev => 
      prev.map(category => 
        category.id === categoryId 
          ? {
              ...category,
              options: category.options.map(option =>
                option.id === optionId
                  ? { ...option, [type]: value }
                  : option
              )
            }
          : category
      )
    );

    toast.success(`Notificação ${value ? 'ativada' : 'desativada'} com sucesso!`);
  };

  return (
    <div className="space-y-6">
      {notifications.map((category) => {
        const IconComponent = category.icon;
        return (
          <Card 
            key={category.id}
            className={`${
              isDark 
                ? "bg-card/60 backdrop-blur-lg border-white/10" 
                : "bg-white shadow-sm border-border"
            }`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <IconComponent className="h-5 w-5" />
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {category.options.map((option) => (
                <div 
                  key={option.id}
                  className={`p-4 rounded-lg border ${
                    isDark 
                      ? "bg-muted/20 border-white/10" 
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground">{option.label}</h4>
                      <p className="text-sm text-foreground/60 mt-1">{option.description}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Email Notification Toggle */}
                      <div className="flex items-center justify-between sm:justify-start gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">E-mail</span>
                        </div>
                        <Switch
                          checked={option.email}
                          onCheckedChange={(value) => 
                            handleNotificationToggle(category.id, option.id, 'email', value)
                          }
                          className={`${
                            option.email 
                              ? isDark 
                                ? "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-pink-500" 
                                : "data-[state=checked]:bg-primary"
                              : ""
                          }`}
                        />
                      </div>

                      {/* Push Notification Toggle */}
                      <div className="flex items-center justify-between sm:justify-start gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Push</span>
                        </div>
                        <Switch
                          checked={option.push}
                          onCheckedChange={(value) => 
                            handleNotificationToggle(category.id, option.id, 'push', value)
                          }
                          className={`${
                            option.push 
                              ? isDark 
                                ? "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-pink-500" 
                                : "data-[state=checked]:bg-primary"
                              : ""
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
