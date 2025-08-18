import { Bot, MessageSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateFirst: () => void;
}

export const EmptyState = ({ onCreateFirst }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center max-w-2xl mx-auto">
      {/* Ilustração Central */}
      <div className="relative mb-8">
        <div className="relative p-8 rounded-full bg-primary/10 border-2 border-primary/20">
          <Bot className="w-20 h-20 text-primary" />

          {/* Ícones de apoio */}
          <div className="absolute -top-2 -right-2 p-2 rounded-full bg-background border border-primary/30">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>

          <div className="absolute -bottom-2 -left-2 p-2 rounded-full bg-background border border-primary/30">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Headline Principal */}
      <h1 className="text-4xl md:text-5xl font-poppins font-bold mb-4 gradient-text">
        Crie seu Primeiro Assistente de IA
      </h1>

      {/* Subtítulo */}
      <p className="text-xl md:text-2xl text-muted-foreground mb-6 font-medium">
        E veja seu negócio começar a vender no automático, agora mesmo.
      </p>

      {/* Texto de Apoio */}
      <p className="text-base md:text-lg text-muted-foreground mb-10 leading-relaxed max-w-xl">
        Dê um nome ao seu assistente, alimente-o com o conhecimento do seu negócio e conecte-o ao seu WhatsApp.
        Em poucos minutos, você terá um vendedor digital trabalhando para você 24/7.
      </p>

      {/* Call-to-Action */}
      <Button
        onClick={onCreateFirst}
        size="lg"
        className="h-14 px-8 text-lg font-semibold bg-gradient-zaplify hover:shadow-xl transition-all duration-300 hover:scale-105"
      >
        + Criar meu Primeiro Assistente
      </Button>

      {/* Indicador visual sutil */}
      <div className="mt-12 flex items-center gap-2 text-xs text-muted-foreground/60">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        <span>Pronto para começar em menos de 5 minutos</span>
      </div>
    </div>
  );
};
