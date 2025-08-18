
import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { CustomHeader } from "./CustomHeader";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsiveLayoutProps {
  children: ReactNode;
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const isMobile = useIsMobile();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <CustomHeader />
        <main className="flex-1 pb-safe">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background">
      <div
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <AppSidebar />
      </div>
      <div
        className={`flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isSidebarHovered ? 'ml-64' : 'ml-16'
        }`}
      >
        <CustomHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
