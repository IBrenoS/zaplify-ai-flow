
import { useState, useEffect } from "react";
import { Menu, Zap, Search, MessageSquare, HelpCircle, User, LogOut, Command } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { UserMenu } from "./UserMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "@/components/ui/command-palette";
import { useCommandPalette } from "@/hooks/useCommandPalette";

export function CustomHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setUserProfile(data);
        }
      };

      fetchUserProfile();
    }
  }, [user]);

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

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatDate = (dateStr: string) => {
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userInitial = userProfile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U';

  if (!isMobile) {
    return (
      <header className="h-16 flex items-center justify-between px-6 border-b border-border/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
        {/* Mensagem de boas-vindas */}
        <div className="flex flex-col">
          <span className="text-lg font-medium text-foreground">
            Olá <span className="font-semibold">{displayName}</span>!
          </span>
          <span className="text-sm text-muted-foreground">
            Hoje é {formatDate(currentDate)}
          </span>
        </div>

        {/* Command Palette Trigger */}
        <div className="flex-1 max-w-md mx-8">
          <button
            onClick={() => {
              console.log('Search bar clicked!');
              setCommandPaletteOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 bg-muted/50 hover:bg-muted/70 rounded-md border border-border/20 transition-colors text-left"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm flex-1">Pesquisar em toda plataforma...</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Ações do usuário */}
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </Button>

          <UserMenu userProfile={userProfile} userEmail={user?.email} />
        </div>

        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      </header>
    );
  }

  return (
    <header className="h-16 flex items-center justify-between px-4 border-b border-border/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 p-0 hover:bg-muted/50">
            <Menu className="h-6 w-6 text-foreground" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-80 bg-background border-r border-border/20"
        >
          <div className="h-full">
            <AppSidebar onNavigate={() => setIsOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-col items-center flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-gradient-zaplify flex items-center justify-center shadow-md">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-poppins font-bold text-lg text-foreground">
            Zaplify
          </span>
        </div>
        <span className="text-xs text-muted-foreground text-center">
          Olá {displayName}! Hoje é {formatDate(currentDate)}
        </span>
      </div>

      <div className="w-10 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-zaplify flex items-center justify-center shadow-sm">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-white">
                    {userInitial}
                  </span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </header>
  );
}
