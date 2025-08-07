import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  className
}: KPICardProps) {
  return (
    <div className={cn("glass-card p-6 hover-lift", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-inter text-muted-foreground mb-1">
            {title}
          </p>
          <p className="text-3xl font-poppins font-bold gradient-text mb-2">
            {value}
          </p>
          <div className="flex items-center space-x-1">
            <span
              className={cn(
                "text-sm font-medium",
                changeType === "positive" && "text-green-400",
                changeType === "negative" && "text-red-400",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </span>
            <span className="text-xs text-muted-foreground">vs mês anterior</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-zaplify/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}