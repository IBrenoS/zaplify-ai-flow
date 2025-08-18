import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { createPortal } from 'react-dom'; // Adicione esta importação

interface SalesChartProps {
  title?: string;
  data?: Array<{ date: string; value: number }>;
}

export function SalesChart({
  title = "Vendas dia a dia",
  data = [
    { date: "01/11", value: 2400 },
    { date: "02/11", value: 1398 },
    { date: "03/11", value: 9800 },
    { date: "04/11", value: 3908 },
    { date: "05/11", value: 4800 },
    { date: "06/11", value: 3800 },
    { date: "07/11", value: 4300 },
    { date: "08/11", value: 5200 },
    { date: "09/11", value: 7600 },
    { date: "10/11", value: 8900 },
    { date: "11/11", value: 12400 },
    { date: "12/11", value: 9800 },
    { date: "13/11", value: 11200 },
    { date: "14/11", value: 10800 }
  ]
}: SalesChartProps) {
  // All hooks must be called at the top level, before any early returns
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null);
  const [trackingX, setTrackingX] = useState<number | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);
  const [pathLength, setPathLength] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [isTouching, setIsTouching] = useState(false);

  // Filter out invalid data points first (before useEffect dependencies)
  const validData = data ? data.filter(point => point && typeof point.value === 'number' && !isNaN(point.value) && point.date) : [];

  useEffect(() => {
    // Only run if we have valid data
    if (validData.length === 0) return;

    // Calculate path length for smooth animation
    const chartId = `chart-line-${title.replace(/\s+/g, '')}-${Math.random().toString(36).substr(2, 9)}`;
    const pathElement = document.querySelector(`#${chartId}`);
    if (pathElement) {
      const length = (pathElement as SVGPathElement).getTotalLength();
      setPathLength(length);
    }

    // Trigger animation on component mount
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [validData, title]);

  // Early return if data is empty or invalid
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl bg-glass backdrop-blur-xl border border-white/10 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-inter font-semibold text-foreground mb-2">
            {title}
          </h3>
        </div>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  // Return empty state if no valid data after filtering
  if (validData.length === 0) {
    return (
      <div className="rounded-2xl bg-glass backdrop-blur-xl border border-white/10 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-inter font-semibold text-foreground mb-2">
            {title}
          </h3>
        </div>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Dados inválidos ou insuficientes</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...validData.map(d => d.value));
  const minValue = Math.min(...validData.map(d => d.value));
  const valueRange = maxValue - minValue;

  const chartHeight = 300;
  const chartWidth = 800;
  const padding = 40;

  const points = validData.map((point, index) => ({
    x: validData.length === 1 ? chartWidth / 2 : (index / (validData.length - 1)) * (chartWidth - padding * 2) + padding,
    y: valueRange === 0 ? chartHeight / 2 : chartHeight - padding - ((point.value - minValue) / valueRange) * (chartHeight - padding * 2),
    value: point.value,
    date: point.date
  }));

  const pathData = points.length > 0 ? `M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}` : '';
  const areaData = points.length > 0 ? `M ${points[0].x} ${chartHeight - padding} L ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${chartHeight - padding} Z` : '';

  // Grid lines
  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const y = padding + (i / 4) * (chartHeight - padding * 2);
    gridLines.push(y);
  }

  // Função para encontrar o ponto mais próximo do cursor
  const findClosestPoint = (x: number) => {
    if (!points.length) return null;

    let closestIndex = 0;
    let minDistance = Math.abs(points[0].x - x);

    for (let i = 1; i < points.length; i++) {
      const distance = Math.abs(points[i].x - x);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return { index: closestIndex, point: points[closestIndex] };
  };

  // Manipuladores de eventos para desktop
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const chartRect = chartRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * chartWidth;

    setTrackingX(x);

    const closest = findClosestPoint(x);
    if (closest) {
      // Calcular posição do tooltip relativa ao container do gráfico
      const tooltipX = closest.point.x;
      const tooltipY = closest.point.y - 10; // Posicionar acima do ponto

      // Converter para coordenadas da tela
      const screenX = (tooltipX / chartWidth) * rect.width + rect.left;
      const screenY = (tooltipY / chartHeight) * rect.height + rect.top;

      setTooltipPosition({ x: screenX, y: screenY });
      setHoveredPoint({ index: closest.index, x: screenX, y: screenY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setTrackingX(null);
    setTooltipPosition(null);
  };

  // Manipuladores de eventos para mobile
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    setIsTouching(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!chartRef.current || !isTouching) return;

    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * chartWidth;

    setTrackingX(x);

    const closest = findClosestPoint(x);
    if (closest) {
      // Calcular posição do tooltip relativa ao container do gráfico
      const tooltipX = closest.point.x;
      const tooltipY = closest.point.y - 10; // Posicionar acima do ponto

      // Converter para coordenadas da tela
      const screenX = (tooltipX / chartWidth) * rect.width + rect.left;
      const screenY = (tooltipY / chartHeight) * rect.height + rect.top;

      setTooltipPosition({ x: screenX, y: screenY });
      setHoveredPoint({ index: closest.index, x: screenX, y: screenY });
    }

    // Prevenir scroll da página durante o toque
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsTouching(false);
    setHoveredPoint(null);
    setTrackingX(null);
    setTooltipPosition(null);
  };

  // Formatar data completa
  const formatFullDate = (dateStr: string) => {
    // Assumindo que dateStr está no formato "DD/MM"
    const [day, month] = dateStr.split('/');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return `${day} de ${months[parseInt(month) - 1]}, 2025`;
  };

  // Calcular variação percentual (opcional)
  const calculateVariation = (index: number) => {
    if (index <= 0 || index >= points.length) return null;

    const current = validData[index].value;
    const previous = validData[index - 1].value;

    if (previous === 0) return null;

    const variation = ((current - previous) / previous) * 100;
    return variation.toFixed(1);
  };

  return (
    <div className="rounded-2xl bg-glass backdrop-blur-xl border border-white/10 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-inter font-semibold text-foreground mb-2">
          {title}
        </h3>
      </div>

      <div className="relative" ref={chartRef}>
        <svg
          width={chartWidth}
          height={chartHeight}
          className="w-full h-auto"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((y, index) => (
            <line
              key={index}
              x1={padding}
              y1={y}
              x2={chartWidth - padding}
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="2,4"
              opacity="0.2"
            />
          ))}

          {/* Y-axis labels */}
          {gridLines.map((y, index) => {
            const value = Math.round((maxValue - (index / 4) * valueRange) / 1000);
            return (
              <text
                key={`label-${index}`}
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-muted-foreground font-inter"
              >
                {value}k
              </text>
            );
          })}

          {/* X-axis labels */}
          {validData.map((point, index) => {
            if (index % 2 === 0) { // Show every other date to avoid crowding
              const x = validData.length === 1 ? chartWidth / 2 : (index / (validData.length - 1)) * (chartWidth - padding * 2) + padding;
              return (
                <text
                  key={`date-${index}`}
                  x={x}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className="text-xs fill-muted-foreground font-inter"
                >
                  {point.date}
                </text>
              );
            }
            return null;
          })}

          {/* Tracking line */}
          {trackingX && trackingX >= padding && trackingX <= chartWidth - padding && (
            <line
              x1={trackingX}
              y1={padding}
              x2={trackingX}
              y2={chartHeight - padding}
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.6"
              className="animate-[fadeIn_0.2s_ease-out]"
            />
          )}

          {/* Area fill */}
          <path
            d={areaData}
            fill="url(#areaGradient)"
            className={`transition-all duration-1000 ${isAnimated ? 'animate-[fillUp_1.5s_ease-out_0.8s_both]' : 'opacity-0'}`}
          />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-all duration-1000 ${isAnimated ? 'animate-[drawLine_2s_ease-out]' : 'opacity-0'}`}
          />

          {/* Interactive points */}
          {points.map((point, index) => {
            const isNearTracking = trackingX && Math.abs(point.x - trackingX) < 15;
            return (
              <g key={index}>
                {/* Círculo de glow externo removido */}
                {/* Main point */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isNearTracking ? "5" : "4"} // Raio fixo de 5 quando próximo
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                  className={`cursor-pointer transition-all duration-200 ${
                    isNearTracking ? 'opacity-100' : 'opacity-0 hover:opacity-80'
                  }`}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip renderizado em um Portal */}
        {hoveredPoint && tooltipPosition && createPortal(
          <div
            className="fixed pointer-events-none z-[9999] animate-[fadeIn_0.2s_ease-out]"
            style={{
              left: `${tooltipPosition.x}px`, // Posição X calculada
              top: `${tooltipPosition.y}px`,  // Posição Y calculada
              transform: 'translate(-50%, -100%) translateY(-15px)', // Centraliza horizontalmente e move para cima
              width: '200px'
            }}
          >
            <div
              className={`p-3 rounded-lg border shadow-lg transition-all duration-200 ${
                isDarkTheme
                  ? 'bg-[#181818]/90 backdrop-blur-md border-white/10' // Tema escuro
                  : 'bg-white/95 backdrop-blur-sm border-gray-200/50' // Tema claro
              }`}
            >
              {/* Data */}
              <p className={`text-sm mb-2 font-medium ${isDarkTheme ? 'text-white/90' : 'text-foreground'}`}>
                {formatFullDate(points[hoveredPoint.index].date)}
              </p>

              {/* Valor */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0"></div>
                <div className="flex justify-between w-full">
                  <span className={`text-xs ${isDarkTheme ? 'text-white/70' : 'text-muted-foreground'}`}>Vendas:</span>
                  <span className="text-sm font-semibold">
                    R$ {points[hoveredPoint.index].value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </span>
                </div>
              </div>

              {/* Comparativo (opcional) */}
              {hoveredPoint.index > 0 && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/10">
                  <div className="flex justify-between w-full">
                    <span className={`text-xs ${isDarkTheme ? 'text-white/70' : 'text-muted-foreground'}`}>Comparativo:</span>
                    <span className={`text-xs font-medium ${
                      calculateVariation(hoveredPoint.index) && parseFloat(calculateVariation(hoveredPoint.index) || '0') >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}>
                      {calculateVariation(hoveredPoint.index) && parseFloat(calculateVariation(hoveredPoint.index) || '0') >= 0 ? '+' : ''}
                      {calculateVariation(hoveredPoint.index)}% vs dia anterior
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body // O tooltip será renderizado diretamente no body
        )}
      </div>
    </div>
  );
}
