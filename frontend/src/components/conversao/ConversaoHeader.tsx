import { Button } from "@/components/ui/button";

export const ConversaoHeader = () => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-poppins font-bold gradient-text mb-2">
          Relatório de Performance da IA
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Acompanhe o valor gerado pela automação e assistentes de IA da Zaplify
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
        <Button variant="outline" size="sm" className="w-full sm:w-auto whitespace-nowrap">
          Últimos 30 dias
        </Button>
        <Button variant="outline" size="sm" className="w-full sm:w-auto whitespace-nowrap">
          Todos os assistentes
        </Button>
      </div>
    </div>
  );
};