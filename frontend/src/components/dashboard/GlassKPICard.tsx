
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface GlassKPICardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  showValue?: boolean;
  sparklineData?: number[];
  className?: string;
  championDay?: {
    day: string;
    sales: string;
  };
}

export function GlassKPICard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  showValue = true,
  sparklineData = [12, 19, 15, 27, 32, 25, 35, 42, 38, 45, 52, 48],
  className,
  championDay
}: GlassKPICardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const changeColor = changeType === "positive" ? "hsl(var(--primary))" : 
                     changeType === "negative" ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
  
  const sparklineColor = changeType === "positive" ? "#50B887" : 
                        changeType === "negative" ? "#E57373" : "#8E8E93";

  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden border border-white/10",
      "bg-glass backdrop-blur-xl p-6 transition-all duration-300 hover:bg-white/5",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-inter font-medium text-muted-foreground">
              {title}
            </p>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="relative">
            <p className={cn(
              "text-3xl font-inter font-bold text-foreground mb-2 transition-all duration-300",
              !showValue && "blur-md select-none"
            )}>
              {showValue ? value : "••••••••"}
            </p>
            
            {!showValue && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-white/60">•••</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1 mb-3">
            <span
              className={cn(
                "text-sm font-inter font-semibold transition-all duration-300",
                !showValue && "blur-sm"
              )}
              style={{ color: showValue ? changeColor : "hsl(var(--muted-foreground))" }}
            >
              {showValue ? change : "••••"}
            </span>
            <span className="text-xs font-inter font-regular text-muted-foreground opacity-70">vs mês anterior</span>
          </div>

          {/* Champion Day Information */}
          {championDay && (
            <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs font-inter font-medium text-muted-foreground mb-1">
                Dia campeão em vendas
              </p>
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-sm font-inter font-bold text-foreground transition-all duration-300",
                  !showValue && "blur-sm"
                )}>
                  {showValue ? championDay.day : "••/••"}
                </span>
                <span className={cn(
                  "text-sm font-inter font-semibold text-primary transition-all duration-300",
                  !showValue && "blur-sm"
                )}>
                  {showValue ? championDay.sales : "•••••"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sparkline Simples e Confiável */}
      <div className="h-16 w-full">
        <svg className="w-full h-full" viewBox="0 0 120 64" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${title.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={sparklineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={sparklineColor} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Área preenchida */}
          <path
            d={`M 0 64 ${sparklineData.map((point, index) => 
              `L ${(index / (sparklineData.length - 1)) * 120} ${64 - (point / Math.max(...sparklineData)) * 48}`
            ).join(' ')} L 120 64 Z`}
            fill={`url(#gradient-${title.replace(/\s+/g, '')})`}
            className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            style={{ transformOrigin: 'bottom' }}
          />
          
          {/* Linha principal */}
          <path
            d={`M 0 ${64 - (sparklineData[0] / Math.max(...sparklineData)) * 48} ${sparklineData.map((point, index) => 
              `L ${(index / (sparklineData.length - 1)) * 120} ${64 - (point / Math.max(...sparklineData)) * 48}`
            ).join(' ')}`}
            fill="none"
            stroke={sparklineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{
              strokeDasharray: '200',
              strokeDashoffset: isVisible ? '0' : '200',
              transitionDelay: '0.3s'
            }}
          />
        </svg>
      </div>
    </div>
  );
}
