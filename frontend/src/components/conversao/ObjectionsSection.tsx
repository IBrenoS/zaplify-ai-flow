import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { objectionData } from "@/data/conversao-data";

export const ObjectionsSection = () => {
  return (
    <Card className="bg-card shadow-sm border">
      <CardHeader>
        <CardTitle className="text-foreground font-poppins flex items-center space-x-2">
          <Zap className="w-5 h-5 text-primary" />
          <span>Objeções Mais Resolvidas pela IA</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:space-y-4">
          {objectionData.map((item, index) => (
            <div key={item.objection} className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/30 gap-3">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                  {index + 1}
                </div>
                <span className="font-medium text-foreground text-sm sm:text-base break-words">
                  {item.objection}
                </span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                <span className="text-xl sm:text-2xl font-bold text-primary">{item.count}</span>
                <span className="text-xs sm:text-sm text-muted-foreground">vezes</span>
              </div>
            </div>
          ))}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <strong className="text-primary">Insight:</strong> A IA resolveu automaticamente{" "}
              <span className="font-semibold text-primary">342 objeções</span> este mês, 
              salvando vendas que poderiam ser perdidas.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};