import { Bot, Clock, UserCheck, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

export const KPICards = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <Card className="bg-card shadow-sm border p-4 md:p-6">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground break-words">
                Conversas Gerenciadas pela IA
              </p>
              <p className="text-xl md:text-2xl font-bold text-foreground">1.854</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+15%</span>
            <span className="text-xs text-muted-foreground">vs. mês anterior</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Total de interações que seus assistentes cuidaram por você
          </p>
        </div>
      </Card>

      <Card className="bg-card shadow-sm border p-4 md:p-6">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground break-words">
                Horas de Trabalho Economizadas
              </p>
              <p className="text-xl md:text-2xl font-bold text-foreground">74 Horas</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Estimativa de tempo que você e sua equipe economizaram
          </p>
        </div>
      </Card>

      <Card className="bg-card shadow-sm border p-4 md:p-6">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground break-words">
                Leads Qualificados pela IA
              </p>
              <p className="text-xl md:text-2xl font-bold text-foreground">482</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+22%</span>
            <span className="text-xs text-muted-foreground">vs. mês anterior</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Prospects que a IA identificou como prontos para comprar ou agendar
          </p>
        </div>
      </Card>

      <Card className="bg-card shadow-sm border p-4 md:p-6">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground break-words">
                Agendamentos Feitos pela IA
              </p>
              <p className="text-xl md:text-2xl font-bold text-foreground">128</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+30%</span>
            <span className="text-xs text-muted-foreground">vs. mês anterior</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Reuniões e serviços agendados 100% no automático
          </p>
        </div>
      </Card>
    </div>
  );
};
