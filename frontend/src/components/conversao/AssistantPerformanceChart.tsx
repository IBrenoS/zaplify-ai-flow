import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { assistantPerformanceData } from "@/data/conversao-data";
import { createPortal } from "react-dom"; // Adicionada importação do createPortal

const CHART_COLOR = "#50B887";

type MetricType = 'leadsQualificados' | 'vendasGeradas' | 'agendamentos';

const metricLabels = {
  leadsQualificados: 'Leads',
  vendasGeradas: 'Vendas',
  agendamentos: 'Agendamentos'
};

export const AssistantPerformanceChart = () => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('leadsQualificados');
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);

  // Calcular valor máximo para a métrica selecionada
  const maxValue = Math.max(...assistantPerformanceData.map(item => item[selectedMetric]));

  // Função para lidar com o hover na barra
  const handleBarHover = (assistant: string, event: React.MouseEvent) => {
    setHoveredBar(assistant);
    // Calcular a posição do tooltip baseado na posição do mouse
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  // Função para limpar o hover
  const handleBarLeave = () => {
    setHoveredBar(null);
    setTooltipPosition(null);
  };

  return (
    <Card className="bg-card shadow-sm border overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-foreground font-poppins text-lg">
            Desempenho dos Assistentes de IA
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(metricLabels) as MetricType[]).map((metric) => (
              <Button
                key={metric}
                variant={selectedMetric === metric ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric(metric)}
                className="transition-all duration-200 flex-1 sm:flex-none min-w-0"
              >
                <span className="truncate">{metricLabels[metric]}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="h-80 flex flex-col justify-center space-y-3 sm:space-y-4 overflow-hidden">
          {assistantPerformanceData.map((assistant, index) => {
            const value = assistant[selectedMetric];
            const widthPercentage = (value / maxValue) * 100;
            const isHovered = hoveredBar === assistant.assistant;

            return (
              <div key={assistant.assistant} className="flex items-center gap-2 sm:gap-4 relative min-w-0">
                {/* Label do assistente */}
                <div className="w-20 sm:w-36 text-right flex-shrink-0">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words">
                    {assistant.assistant}
                  </span>
                </div>

                {/* Container da barra */}
                <div className="flex-1 relative min-w-0 overflow-hidden">
                  <div
                    className={`h-8 sm:h-10 rounded-r-lg transition-all duration-300 ease-out flex items-center justify-end pr-2 sm:pr-3 cursor-pointer ${isHovered ? 'brightness-110' : ''}`}
                    style={{
                      backgroundColor: CHART_COLOR,
                      width: `${Math.max(widthPercentage, 5)}%`, // Mínimo de 5% para visibilidade
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both',
                      // Simplificado o efeito de hover para evitar problemas de layout
                      transition: 'filter 0.2s ease, width 0.5s ease-out',
                    }}
                    onMouseEnter={(e) => handleBarHover(assistant.assistant, e)}
                    onMouseLeave={handleBarLeave}
                  >
                    {/* Label com valor */}
                    <span className="text-white font-semibold text-xs sm:text-sm">
                      {value}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tooltip renderizado em um Portal */}
        {hoveredBar && tooltipPosition && createPortal(
          <div
            className="fixed z-[9999] pointer-events-none animate-[fadeIn_0.2s_ease-out]"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 15}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-background border shadow-lg rounded-lg px-3 py-2 text-sm whitespace-nowrap">
              {assistantPerformanceData.find(a => a.assistant === hoveredBar) && (
                <>
                  <div className="font-semibold text-foreground">{hoveredBar}</div>
                  <div className="text-muted-foreground">
                    {assistantPerformanceData.find(a => a.assistant === hoveredBar)?.[selectedMetric]} {metricLabels[selectedMetric]}
                  </div>
                </>
              )}
              {/* Seta do tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-background"></div>
            </div>
          </div>,
          document.body
        )}
      </CardContent>
    </Card>
  );
};
