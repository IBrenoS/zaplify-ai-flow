import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlurredValueCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  showValue: boolean;
  className?: string;
}

export function BlurredValueCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  showValue,
  className
}: BlurredValueCardProps) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-lg",
      "shadow-[0px_4px_12px_rgba(0,0,0,0.05)] dark:shadow-elegant",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-inter font-medium text-muted-foreground mb-2">
            {title}
          </p>
          
          <div className="relative">
            <p className={cn(
              "text-3xl font-lexend font-bold text-foreground mb-2 transition-all duration-300",
              !showValue && "blur-md select-none"
            )}>
              {showValue ? value : "R$ ••••••••"}
            </p>
            
            {!showValue && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">•••</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <span
              className={cn(
                "text-sm font-medium transition-all duration-300",
                changeType === "positive" && "text-primary",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground",
                !showValue && "blur-sm"
              )}
            >
              {showValue ? change : "••••"}
            </span>
            <span className="text-xs text-muted-foreground">vs ontem</span>
          </div>
        </div>
        
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}