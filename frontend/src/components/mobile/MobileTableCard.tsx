import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTableCardProps {
  title: string;
  subtitle?: string;
  status?: {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    color?: string;
  };
  stats: {
    label: string;
    value: string | number;
    icon?: ReactNode;
  }[];
  actions?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileTableCard({
  title,
  subtitle,
  status,
  stats,
  actions,
  className,
  onClick
}: MobileTableCardProps) {
  return (
    <Card
      className={cn(
        "mb-3 transition-all duration-200 active:scale-[0.98] cursor-pointer",
        onClick && "hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base truncate">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 ml-2">
            {status && (
              <Badge
                variant={status.variant}
                className={cn(
                  "whitespace-nowrap",
                  status.color && `bg-${status.color}/10 text-${status.color}-700 border-${status.color}/20`
                )}
              >
                {status.label}
              </Badge>
            )}

            {actions || (
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-2">
              {stat.icon && <div className="text-muted-foreground">{stat.icon}</div>}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p className="font-medium text-sm truncate">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente exemplo para uma campanha de prospecção
export function ProspectingCampaignCard({
  name,
  status,
  dispatched,
  responses,
  conversionRate,
  lastActivity,
  onEdit,
  onView,
  onDelete
}: {
  name: string;
  status: "active" | "paused" | "completed";
  dispatched: number;
  responses: number;
  conversionRate: string;
  lastActivity: string;
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
}) {
  const statusConfig = {
    active: { label: "Ativa", variant: "default" as const, color: "green" },
    paused: { label: "Pausada", variant: "secondary" as const, color: "yellow" },
    completed: { label: "Finalizada", variant: "outline" as const, color: "gray" }
  };

  return (
    <MobileTableCard
      title={name}
      subtitle={`Última atividade: ${lastActivity}`}
      status={statusConfig[status]}
      stats={[
        { label: "Disparos", value: dispatched.toLocaleString() },
        { label: "Respostas", value: responses.toLocaleString() },
        { label: "Taxa Conv.", value: conversionRate },
        { label: "ROI", value: "127%" }
      ]}
      actions={
        <div className="flex gap-1">
          {onView && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
              Ver
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
              Editar
            </Button>
          )}
        </div>
      }
      onClick={onView}
    />
  );
}
