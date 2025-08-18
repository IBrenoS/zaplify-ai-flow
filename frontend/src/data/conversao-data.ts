// Mock data for conversion analytics

export const conversionFunnelData = [
  { step: "Mensagem Inicial", leads: 1000, percentage: 100, conversionRate: 75 },
  { step: "Follow-up 1", leads: 750, percentage: 75, conversionRate: 60 },
  { step: "Lead Qualificado", leads: 450, percentage: 45, conversionRate: 33 },
  { step: "Venda Realizada", leads: 150, percentage: 15, conversionRate: 0 },
];

export const assistantPerformanceData = [
  { assistant: "Vendedor de Lançamento", leadsQualificados: 245, vendasGeradas: 89, agendamentos: 156 },
  { assistant: "Atendente Padrão", leadsQualificados: 189, vendasGeradas: 67, agendamentos: 134 },
  { assistant: "Suporte Técnico", leadsQualificados: 123, vendasGeradas: 45, agendamentos: 78 },
  { assistant: "Recuperação de Vendas", leadsQualificados: 98, vendasGeradas: 56, agendamentos: 89 },
];

export const messageTemplateData = [
  { template: "Boas-vindas", responseRate: 85.2 },
  { template: "Follow-up 1", responseRate: 67.8 },
  { template: "Oferta Especial", responseRate: 78.5 },
  { template: "Recuperação", responseRate: 45.2 },
  { template: "Agendamento", responseRate: 92.1 },
];

export const objectionData = [
  { objection: "Preço", count: 120 },
  { objection: "Prazo de Entrega", count: 85 },
  { objection: "Garantia", count: 60 },
  { objection: "Forma de Pagamento", count: 45 },
  { objection: "Disponibilidade", count: 32 },
];

export const chartConfig = {
  leads: {
    label: "Leads",
    color: "hsl(var(--primary))",
  },
  rate: {
    label: "Taxa (%)",
    color: "hsl(var(--primary))",
  },
  leadsQualificados: {
    label: "Leads Qualificados",
    color: "hsl(var(--primary))",
  },
  vendasGeradas: {
    label: "Vendas Geradas",
    color: "hsl(var(--primary))",
  },
  agendamentos: {
    label: "Agendamentos",
    color: "hsl(var(--primary))",
  },
};
