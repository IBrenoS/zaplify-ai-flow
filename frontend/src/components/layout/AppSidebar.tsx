
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BarChart3,
  Bot,
  Rocket,
  TestTube,
  MessageSquare,
  Calendar,
  Target,
  Zap,
  GitBranch
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Assistentes", href: "/assistants", icon: Bot },
  { name: "Prospecções", href: "/prospecting", icon: Rocket },
  { name: "Conversão", href: "/conversao", icon: Target },
  { name: "Funil de vendas", href: "/funnel-builder", icon: GitBranch, hideOnMobile: true },
  { name: "ZapliTools", href: "/zaplitools", icon: TestTube },
  { name: "ZapliWeb", href: "/zaplyweb", icon: MessageSquare },
  { name: "Agenda", href: "/agenda", icon: Calendar },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps = {}) {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  const isExpanded = isMobile ? true : isHovered;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "h-screen flex flex-col transition-all duration-300 ease-out z-50",
          isMobile
            ? "w-full bg-background border-r border-border/20"
            : (isExpanded ? "w-64 glass-nav fixed top-0 left-0" : "w-16 glass-nav fixed top-0 left-0")
        )}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center min-h-[80px]",
          isMobile ? "justify-start border-b border-border/20 px-4" : "justify-center border-b border-white/10 px-2"
        )}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-zaplify flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            {isExpanded && (
              <span className={cn(
                "font-poppins font-bold text-xl animate-fade-in",
                isMobile ? "text-foreground" : "gradient-text"
              )}>
                Zaplify
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto", isMobile ? "px-4 py-2" : "px-2 py-4")}>
          <ul className={cn("flex flex-col", isMobile ? "space-y-2" : "space-y-1")}>
            {navigation.filter(item => !isMobile || !item.hideOnMobile).map((item) => {
              const isActive = location.pathname === item.href;

              if (!isExpanded && !isMobile) {
                // Modo colapsado - ícones centralizados com tooltips
                return (
                  <li key={item.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-xl smooth-transition group mx-auto",
                            "hover:bg-white/10 relative"
                          )}
                        >
                          {/* Indicador de seleção sutil */}
                          {isActive && (
                            <div className="absolute inset-0 rounded-xl bg-primary/20 border border-primary/30" />
                          )}
                          <item.icon
                            className={cn(
                              "w-5 h-5 relative z-10",
                              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="animate-fade-in">
                        <p className="font-medium">{item.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              // Modo expandido ou mobile
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center space-x-4 px-4 py-3 rounded-xl smooth-transition group w-full",
                      isActive
                        ? isMobile
                          ? "bg-gradient-zaplify text-white shadow-lg"
                          : "bg-gradient-zaplify text-primary-foreground shadow-lg"
                        : isMobile
                          ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                          : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive && "text-white"
                      )}
                    />
                    <span className="font-inter font-medium animate-fade-in text-base">
                      {item.name}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Theme Toggle */}
        <div className={cn(
          isMobile ? "px-4 py-2 border-t border-border/20" : "px-2 py-4 border-t border-white/10"
        )}>
          {!isExpanded && !isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl hover:bg-white/10 mx-auto">
                  <ThemeToggle />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="animate-fade-in">
                <p className="font-medium">Alternar Tema</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center justify-start space-x-3">
              <ThemeToggle />
              <span className="text-sm font-medium text-foreground animate-fade-in">
                Alternar Tema
              </span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
