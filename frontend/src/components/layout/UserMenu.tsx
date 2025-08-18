import { Settings, CreditCard, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserMenuProps {
  userProfile: { full_name?: string; avatar_url?: string } | null;
  userEmail?: string;
}

export function UserMenu({ userProfile, userEmail }: UserMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks

    setIsLoggingOut(true);
    console.log("🔓 Iniciando logout...");

    try {
      const { error } = await signOut();

      // Treat "session_not_found" as successful logout
      if (error && !error.message?.includes("session_not_found") && !error.message?.includes("Session not found")) {
        console.error("❌ Erro de logout:", error);
        throw error;
      }

      console.log("✅ Logout concluído");
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      navigate("/login");
    } catch (error: any) {
      console.error("❌ Erro crítico no logout:", error);
      toast({
        title: "Erro ao sair",
        description: error?.message || "Ocorreu um erro ao tentar desconectar.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = userProfile?.full_name || userEmail?.split('@')[0] || 'Usuário';
  const userInitial = userProfile?.full_name?.charAt(0) || userEmail?.charAt(0)?.toUpperCase() || 'U';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-zaplify flex items-center justify-center shadow-sm">
            {userProfile?.avatar_url ? (
              <img
                src={userProfile.avatar_url}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-white">
                {userInitial}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-foreground">
            {displayName}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-0 bg-background border shadow-lg animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        align="end"
        sideOffset={8}
      >
        {/* Seção 1: Informações do Usuário */}
        <div className="flex items-center space-x-3 p-4">
          <div className="w-10 h-10 rounded-full bg-gradient-zaplify flex items-center justify-center shadow-sm">
            {userProfile?.avatar_url ? (
              <img
                src={userProfile.avatar_url}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-base font-medium text-white">
                {userInitial}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {userEmail}
            </p>
          </div>
        </div>

        <Separator />

        {/* Seção 2: Itens de Ação */}
        <div className="py-2">
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Editar Perfil</span>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            <span>Plano e Cobrança</span>
          </button>
        </div>

        <Separator />

        {/* Seção 3: Ação de Saída */}
        <div className="py-2">
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-destructive hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
