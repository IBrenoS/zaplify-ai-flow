
import { useState, useEffect } from "react";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { GlassKPICard } from "@/components/dashboard/GlassKPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign,
  TrendingUp,
  X,
  Eye,
  EyeOff,
  Calendar,
  Filter
} from "lucide-react";

interface DashboardData {
  totalSales: number;
  cancelledSales: number;
  netProfit: number;
  totalSalesGrowth: number;
  cancelledSalesGrowth: number;
  netProfitGrowth: number;
  championDay: {
    day: string;
    sales: string;
  } | null;
  salesChartData: Array<{ date: string; value: number }>;
}

const Dashboard = () => {
  const [showValues, setShowValues] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    cancelledSales: 0,
    netProfit: 0,
    totalSalesGrowth: 0,
    cancelledSalesGrowth: 0,
    netProfitGrowth: 0,
    championDay: null,
    salesChartData: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserDashboardData();
    }
  }, [user]);

  const fetchUserDashboardData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Buscar dados do período atual (últimos 30 dias)
      const { data: currentPeriodData } = await supabase
        .from('pagamentos')
        .select('valor, status, data_criacao')
        .eq('user_id', user.id)
        .gte('data_criacao', thirtyDaysAgo.toISOString())
        .lte('data_criacao', today.toISOString());

      // Buscar dados do período anterior (30-60 dias atrás)
      const { data: previousPeriodData } = await supabase
        .from('pagamentos')
        .select('valor, status')
        .eq('user_id', user.id)
        .gte('data_criacao', sixtyDaysAgo.toISOString())
        .lt('data_criacao', thirtyDaysAgo.toISOString());

      // Calcular métricas do período atual
      const totalSales = currentPeriodData
        ?.filter(p => p.status === 'concluido')
        .reduce((sum, p) => sum + Number(p.valor), 0) || 0;

      const cancelledSales = currentPeriodData
        ?.filter(p => p.status === 'cancelado')
        .reduce((sum, p) => sum + Number(p.valor), 0) || 0;

      const netProfit = totalSales - cancelledSales;

      // Calcular métricas do período anterior para comparação
      const previousTotalSales = previousPeriodData
        ?.filter(p => p.status === 'concluido')
        .reduce((sum, p) => sum + Number(p.valor), 0) || 0;

      const previousCancelledSales = previousPeriodData
        ?.filter(p => p.status === 'cancelado')
        .reduce((sum, p) => sum + Number(p.valor), 0) || 0;

      const previousNetProfit = previousTotalSales - previousCancelledSales;

      // Calcular percentuais de crescimento
      const totalSalesGrowth = previousTotalSales > 0 ? 
        ((totalSales - previousTotalSales) / previousTotalSales) : 0;
      const cancelledSalesGrowth = previousCancelledSales > 0 ? 
        ((cancelledSales - previousCancelledSales) / previousCancelledSales) : 0;
      const netProfitGrowth = previousNetProfit > 0 ? 
        ((netProfit - previousNetProfit) / previousNetProfit) : 0;

      // Encontrar dia campeão (dia com maior vendas)
      const dailySales = currentPeriodData
        ?.filter(p => p.status === 'concluido')
        .reduce((acc, p) => {
          const day = new Date(p.data_criacao).toISOString().split('T')[0];
          acc[day] = (acc[day] || 0) + Number(p.valor);
          return acc;
        }, {} as Record<string, number>) || {};

      const championEntry = Object.entries(dailySales)
        .sort(([,a], [,b]) => b - a)[0];
      
      const championDay = championEntry ? {
        day: new Date(championEntry[0]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        sales: `R$ ${championEntry[1].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      } : null;

      // Preparar dados para o gráfico
      const salesChartData = Object.entries(dailySales)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([date, value]) => ({
          date,
          value
        }));

      setDashboardData({
        totalSales,
        cancelledSales,
        netProfit,
        totalSalesGrowth,
        cancelledSalesGrowth,
        netProfitGrowth,
        championDay,
        salesChartData
      });

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveLayout>
      <main className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-inter font-bold text-foreground mb-2">
                Estas são suas movimentações com a Zaplify
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-4 gap-2 sm:gap-0">
                <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-white/10">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-inter text-foreground">Últimos 30 dias</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-white/10">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-inter text-foreground">Todos os projetos</span>
                </div>
              </div>
            </div>
            
            <div 
              className="flex items-center justify-center space-x-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/5 self-start lg:self-center" 
              onClick={() => setShowValues(!showValues)}
            >
              {showValues ? (
                <>
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-inter text-foreground ml-2 hidden sm:inline">Ocultar Valores</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-inter text-foreground ml-2 hidden sm:inline">Mostrar Valores</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-6 md:space-y-0 mb-8">
          {isLoading ? (
            // Loading skeleton
            <>
              <div className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
              <div className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
              <div className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </>
          ) : (
            <>
              <GlassKPICard
                title="Total de vendas"
                value={`R$ ${dashboardData.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                change={`${dashboardData.totalSalesGrowth >= 0 ? '+' : ''}${(dashboardData.totalSalesGrowth * 100).toFixed(0)}%`}
                changeType={dashboardData.totalSalesGrowth > 0 ? "positive" : dashboardData.totalSalesGrowth < 0 ? "negative" : "neutral"}
                icon={DollarSign}
                showValue={showValues}
                sparklineData={dashboardData.salesChartData.slice(-12).map(d => d.value)}
              />
              
              <GlassKPICard
                title="Canceladas"
                value={`R$ ${dashboardData.cancelledSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                change={`${dashboardData.cancelledSalesGrowth >= 0 ? '+' : ''}${(dashboardData.cancelledSalesGrowth * 100).toFixed(0)}%`}
                changeType={dashboardData.cancelledSalesGrowth > 0 ? "negative" : dashboardData.cancelledSalesGrowth < 0 ? "positive" : "neutral"}
                icon={X}
                showValue={showValues}
                sparklineData={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
              />
              
              <GlassKPICard
                title="Ganho líquido"
                value={`R$ ${dashboardData.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                change={`${dashboardData.netProfitGrowth >= 0 ? '+' : ''}${(dashboardData.netProfitGrowth * 100).toFixed(0)}%`}
                changeType={dashboardData.netProfitGrowth > 0 ? "positive" : dashboardData.netProfitGrowth < 0 ? "negative" : "neutral"}
                icon={TrendingUp}
                showValue={showValues}
                sparklineData={dashboardData.salesChartData.slice(-12).map(d => d.value)}
                championDay={dashboardData.championDay}
              />
            </>
          )}
        </div>

        {/* Gráfico de vendas e Atividade Recente */}
        <div className="flex flex-col space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          <div className="lg:col-span-2">
            <SalesChart 
              title="Vendas dia a dia" 
              data={dashboardData.salesChartData} 
            />
          </div>
          <div className="lg:col-span-1">
            <RecentActivity />
          </div>
        </div>
      </main>
    </ResponsiveLayout>
  );
};

export default Dashboard;
