import { useState } from "react";
import { Menu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  return (
    <>
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

        <div className="flex items-center space-x-3 flex-1 justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-zaplify flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-poppins font-bold text-xl text-foreground">
            Zaplify
          </span>
        </div>

        <div className="w-10" /> {/* Spacer para centralizar o logo */}
      </header>
    </>
  );
}