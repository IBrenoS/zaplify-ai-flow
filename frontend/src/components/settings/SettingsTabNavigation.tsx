import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building, Shield, CreditCard, Bell } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface SettingsTabNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const SettingsTabNavigation = ({ activeTab, onTabChange }: SettingsTabNavigationProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  
  const tabs = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "company", label: "Empresa", icon: Building },
    { id: "security", label: "Segurança", icon: Shield },
    { id: "billing", label: "Plano e Cobrança", icon: CreditCard },
    { id: "notifications", label: "Notificações", icon: Bell },
  ];

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={onTabChange} orientation="vertical">
          <TabsList className="flex flex-col h-auto w-full bg-transparent">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "w-full justify-start gap-3 p-3 flex items-center",
                    isDarkTheme
                      ? isActive
                        ? "bg-primary/10 text-white" // Item ativo no tema escuro: texto branco
                        : "text-[#A1A1A1] hover:text-white/80" // Item inativo no tema escuro: cinza claro
                      : isActive
                        ? "bg-primary/10 text-white" // Item ativo no tema claro: texto branco
                        : "text-[#5D5753] hover:text-foreground" // Item inativo no tema claro: cinza escuro/marrom
                  )}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
};