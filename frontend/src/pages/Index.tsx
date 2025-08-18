
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { GlassKPICard } from "@/components/dashboard/GlassKPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  X,
  Eye,
  EyeOff,
  Calendar,
  Filter,
  ChevronDown,
  Plus,
  BarChart3
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface DashboardData {
  totalVendas: number;
  canceladas: number;
  ganhoLiquido: number;
  crescimentoVendas: number;
  crescimentoCanceladas: number;
  crescimentoGanhoLiquido: number;
  diaCampeao?: {
    dia: string;
    valor: number;
  };
  vendasDiaADia: Array<{
    date: string;
    value: number;
  }>;
}

interface Assistant {
  id: string;
  name: string;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showValues, setShowValues] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalVendas: 0,
    canceladas: 0,
    ganhoLiquido: 0,
    crescimentoVendas: 0,
    crescimentoCanceladas: 0,
    crescimentoGanhoLiquido: 0,
    vendasDiaADia: []
  });
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '7d' | '30d' | 'all' | 'custom'>('30d');
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const periodLabels = {
    '1d': 'Hoje',
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    'all': 'Todo o tempo',
    'custom': 'Período personalizado'
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // For custom date range, we'll need to modify the RPC call
      let periodParam = selectedPeriod;

      if (selectedPeriod === 'custom' && dateRange?.from && dateRange?.to) {
        // For custom ranges, we'll use '30d' as fallback and handle custom logic later
        periodParam = '30d';
      }

      const { data, error } = await supabase.rpc('get_dashboard_data', {
        user_id_param: user.id,
        period_param: periodParam === 'custom' ? '30d' : periodParam,
        assistant_id_param: selectedAssistant
      });

      if (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Erro ao buscar dados",
          description: "Não foi possível carregar os dados do dashboard.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const dashData = data as any; // Type assertion for RPC return
        setDashboardData({
          totalVendas: dashData.totalVendas || 0,
          canceladas: dashData.canceladas || 0,
          ganhoLiquido: dashData.ganhoLiquido || 0,
          crescimentoVendas: dashData.crescimentoVendas || 0,
          crescimentoCanceladas: dashData.crescimentoCanceladas || 0,
          crescimentoGanhoLiquido: dashData.crescimentoGanhoLiquido || 0,
          diaCampeao: dashData.diaCampeao,
          vendasDiaADia: dashData.vendasDiaADia || []
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erro ao buscar dados",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssistants = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assistants:', error);
        return;
      }

      setAssistants(data || []);
    } catch (error) {
      console.error('Error fetching assistants:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAssistants();
      fetchDashboardData();
    }
  }, [user, selectedPeriod, selectedAssistant, dateRange]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
  };

  const getSelectedAssistantName = () => {
    if (assistants.length === 0) return 'Criar um novo agente';
    if (!selectedAssistant) return 'Todos os Assistentes';
    const assistant = assistants.find(a => a.id === selectedAssistant);
    return assistant?.name || 'Assistente Selecionado';
  };

  const handleCreateNewAgent = () => {
    navigate('/assistants');
  };

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPeriod(preset as '1d' | '7d' | '30d' | 'all' | 'custom');
  };

  return (
    <ResponsiveLayout>
      <main className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-inter font-bold text-foreground mb-2">
                Estas são suas movimentações com a Zaplify
              </h1>
              <div className="flex items-center space-x-4 mt-4">
                {/* Date Range Filter */}
                <DateRangePicker
                  date={dateRange}
                  onDateChange={handleDateRangeChange}
                  presetPeriod={selectedPeriod}
                  onPresetChange={handlePresetChange}
                  className="min-w-[200px]"
                />

                {/* Assistant Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/5">
                      {assistants.length === 0 ? (
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Filter className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-inter text-foreground">{getSelectedAssistantName()}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 bg-background/95 backdrop-blur-xl border border-white/10">
                    {assistants.length === 0 ? (
                      <DropdownMenuItem
                        onClick={handleCreateNewAgent}
                        className="cursor-pointer flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Criar um novo agente</span>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => setSelectedAssistant(null)}
                          className="cursor-pointer"
                        >
                          Todos os Assistentes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {assistants.map((assistant) => (
                          <DropdownMenuItem
                            key={assistant.id}
                            onClick={() => setSelectedAssistant(assistant.id)}
                            className="cursor-pointer"
                          >
                            {assistant.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleCreateNewAgent}
                          className="cursor-pointer flex items-center space-x-2 text-primary"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Criar novo agente</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div
              className="flex items-center space-x-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/5"
              onClick={() => setShowValues(!showValues)}
            >
              {showValues ? (
                <>
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-inter text-foreground ml-2">Ocultar Valores</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-inter text-foreground ml-2">Mostrar Valores</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassKPICard
            title="Total de vendas"
            value={formatCurrency(dashboardData.totalVendas)}
            change={formatPercentage(dashboardData.crescimentoVendas)}
            changeType="positive"
            icon={DollarSign}
            showValue={showValues}
            sparklineData={dashboardData.vendasDiaADia.map(d => d.value)}
          />

          <GlassKPICard
            title="Canceladas"
            value={formatCurrency(dashboardData.canceladas)}
            change={formatPercentage(dashboardData.crescimentoCanceladas)}
            changeType="negative"
            icon={X}
            showValue={showValues}
            sparklineData={dashboardData.vendasDiaADia.map(d => Math.max(0, d.value * 0.1))}
          />

          <GlassKPICard
            title="Ganho líquido"
            value={formatCurrency(dashboardData.ganhoLiquido)}
            change={formatPercentage(dashboardData.crescimentoGanhoLiquido)}
            changeType="positive"
            icon={TrendingUp}
            showValue={showValues}
            sparklineData={dashboardData.vendasDiaADia.map(d => d.value * 0.9)}
            championDay={dashboardData.diaCampeao ? {
              day: dashboardData.diaCampeao.dia,
              sales: formatCurrency(dashboardData.diaCampeao.valor)
            } : undefined}
          />
        </div>

        {/* Sales Chart */}
        <SalesChart
          data={dashboardData.vendasDiaADia}
          title="Vendas dia a dia"
        />
      </main>
    </ResponsiveLayout>
  );
};

export default Index;
