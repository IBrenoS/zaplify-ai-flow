import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "Seg", conversas: 120, vendas: 15 },
  { name: "Ter", conversas: 190, vendas: 23 },
  { name: "Qua", conversas: 300, vendas: 35 },
  { name: "Qui", conversas: 280, vendas: 42 },
  { name: "Sex", conversas: 350, vendas: 55 },
  { name: "Sáb", conversas: 200, vendas: 28 },
  { name: "Dom", conversas: 150, vendas: 18 },
];

export function ActivityChart() {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="glass-card p-6">
      <div className="mb-6">
        <h3 className="text-xl font-poppins font-semibold text-foreground mb-2">
          Atividade da Semana
        </h3>
        <p className="text-sm text-muted-foreground">
          Conversas iniciadas e vendas fechadas
        </p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
            />
            <Bar 
              dataKey="conversas" 
              radius={[4, 4, 0, 0]}
              fill="url(#conversasGradient)"
              animationBegin={200}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            <Bar 
              dataKey="vendas" 
              radius={[4, 4, 0, 0]}
              fill="url(#vendasGradient)"
              animationBegin={400}
              animationDuration={1200}
              animationEasing="ease-out"
            />
            <defs>
              <linearGradient id="conversasGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#39FF14" />
                <stop offset="100%" stopColor="#2AF598" />
              </linearGradient>
              <linearGradient id="vendasGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2AF598" />
                <stop offset="100%" stopColor="#39FF14" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center space-x-8 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gradient-zaplify"></div>
          <span className="text-sm text-muted-foreground">Conversas</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-accent"></div>
          <span className="text-sm text-muted-foreground">Vendas</span>
        </div>
      </div>
    </div>
  );
}