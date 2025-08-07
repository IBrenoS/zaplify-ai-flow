
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";

interface AnimatedBarChartProps {
  data: any[];
  dataKey: string;
  fill?: string;
  layout?: "horizontal" | "vertical";
  children?: React.ReactNode;
}

export function AnimatedBarChart({ 
  data, 
  dataKey, 
  fill = "hsl(var(--primary))", 
  layout = "vertical",
  children 
}: AnimatedBarChartProps) {
  const [animatedData, setAnimatedData] = useState(
    data.map((item, index) => ({ ...item, [dataKey]: 0, uniqueId: `${dataKey}-${index}` }))
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data.map((item, index) => ({ ...item, uniqueId: `${dataKey}-${index}` })));
    }, 300);

    return () => clearTimeout(timer);
  }, [data, dataKey]);

  if (layout === "horizontal") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={animatedData}
          layout="horizontal"
          margin={{ top: 20, right: 80, left: 80, bottom: 20 }}
        >
          {children}
          <Bar 
            dataKey={dataKey} 
            fill={fill}
            radius={[0, 8, 8, 0]}
            animationBegin={200}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {animatedData.map((entry, index) => (
              <Cell 
                key={`cell-${entry.uniqueId || index}`} 
                fill={fill}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={animatedData}>
        {children}
        <Bar 
          dataKey={dataKey} 
          fill={fill}
          radius={[4, 4, 0, 0]}
          animationBegin={200}
          animationDuration={1200}
          animationEasing="ease-out"
        >
          {animatedData.map((entry, index) => (
            <Cell 
              key={`cell-${entry.uniqueId || index}`} 
              fill={fill}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface AnimatedLineChartProps {
  data: any[];
  dataKey: string;
  stroke?: string;
  children?: React.ReactNode;
}

export function AnimatedLineChart({ 
  data, 
  dataKey, 
  stroke = "hsl(var(--primary))", 
  children 
}: AnimatedLineChartProps) {
  const [animatedData, setAnimatedData] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data);
    }, 300);

    return () => clearTimeout(timer);
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={animatedData}>
        {children}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          strokeWidth={3}
          dot={{ fill: stroke, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: stroke, strokeWidth: 2 }}
          animationBegin={200}
          animationDuration={2500}
          animationEasing="ease-out"
          strokeDasharray="5,5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Funnel Chart Component
interface FunnelChartProps {
  data: any[];
  fill?: string;
}

export function FunnelChart({ data, fill = "hsl(var(--primary))" }: FunnelChartProps) {
  const [animatedData, setAnimatedData] = useState(
    data.map((item, index) => ({ ...item, leads: 0, uniqueId: `funnel-${index}` }))
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data.map((item, index) => ({ ...item, uniqueId: `funnel-${index}` })));
    }, 300);

    return () => clearTimeout(timer);
  }, [data]);

  const maxValue = Math.max(...data.map(item => item.leads));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover p-4 shadow-lg rounded-lg border border-border">
          <p className="font-semibold text-foreground text-base mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-foreground">
              <span className="font-medium">Usuários:</span> {data.leads.toLocaleString()}
            </p>
            <p className="text-sm text-foreground">
              <span className="font-medium">Taxa de Conversão:</span> {data.conversionRate}%
            </p>
            <p className="text-sm text-primary font-medium">
              {((data.leads / maxValue) * 100).toFixed(1)}% do total inicial
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={animatedData}
        layout="horizontal"
        margin={{ top: 20, right: 20, left: 120, bottom: 20 }}
      >
        <XAxis 
          type="number" 
          domain={[0, maxValue]} 
          hide 
        />
        <YAxis 
          dataKey="step" 
          type="category" 
          width={100}
          tick={{ 
            fontSize: 12, 
            fill: 'hsl(var(--foreground))',
            textAnchor: 'end'
          }}
        />
        <Bar 
          dataKey="leads" 
          fill={fill}
          radius={[0, 8, 8, 0]}
          animationBegin={200}
          animationDuration={1200}
          animationEasing="ease-out"
        >
          {animatedData.map((entry, index) => (
            <Cell 
              key={`funnel-cell-${entry.uniqueId || index}`} 
              fill={fill}
              className="hover:brightness-110 transition-all duration-200"
            />
          ))}
        </Bar>
        <CustomTooltip />
      </BarChart>
    </ResponsiveContainer>
  );
}
