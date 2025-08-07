
import React from 'react';

interface FunnelTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const FunnelTooltip: React.FC<FunnelTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const maxValue = 1000; // Valor inicial do funil

  return (
    <div className="bg-popover p-4 shadow-lg rounded-lg border border-border backdrop-blur-sm">
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground text-base border-b border-border pb-2">
          {label}
        </h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Usuários:</span>
            <span className="font-semibold text-foreground">{data.leads.toLocaleString()}</span>
          </div>
          
          {data.conversionRate > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Taxa de Conversão:</span>
              <span className="font-semibold text-primary">{data.conversionRate}%</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">% do Total:</span>
            <span className="font-semibold text-foreground">
              {((data.leads / maxValue) * 100).toFixed(1)}%
            </span>
          </div>
          
          {data.conversionRate > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Abandono:</span>
                <span className="text-xs text-destructive font-medium">
                  {(100 - data.conversionRate)}% saíram na etapa anterior
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
