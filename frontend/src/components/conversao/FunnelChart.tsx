import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conversionFunnelData } from "@/data/conversao-data";

const FUNNEL_COLOR = "#50B887";

export const FunnelChart = () => {
  // Calcular largura máxima baseada no maior valor
  const maxValue = Math.max(...conversionFunnelData.map(item => item.leads));

  return (
    <Card className="bg-card shadow-sm border h-full">
      <CardHeader>
        <CardTitle className="text-foreground font-poppins">
          Jornada de Conversão do Funil
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex flex-col justify-center space-y-6">
          {conversionFunnelData.map((item, index) => {
            const widthPercentage = (item.leads / maxValue) * 100;
            
            return (
              <div key={item.step} className="flex items-center space-x-4">
                {/* Label da etapa */}
                <div className="w-32 text-right">
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.step}
                  </span>
                </div>
                
                {/* Barra do funil */}
                <div className="flex-1 relative">
                  <div
                    className="h-12 rounded-r-lg animate-fade-in flex items-center justify-center relative overflow-hidden transform transition-all duration-1500 ease-out"
                    style={{
                      backgroundColor: FUNNEL_COLOR,
                      width: `${widthPercentage}%`,
                      animationDelay: `${index * 200}ms`,
                      animationFillMode: 'both',
                    }}
                  >
                    {/* Label com número dentro da barra */}
                    <span className="text-white font-semibold text-sm z-10">
                      {item.leads} leads
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};