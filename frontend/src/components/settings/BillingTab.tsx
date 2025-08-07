
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Download, ExternalLink, Users, MessageSquare, Zap } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";

interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: "paid" | "pending";
}

export const BillingTab = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const currentPlan = {
    name: "Accelerate Plan",
    price: "R$ 297,00/mês",
    features: [
      { icon: Users, label: "Até 5 usuários", value: "3/5 em uso" },
      { icon: MessageSquare, label: "Contatos ilimitados", value: "∞" },
      { icon: Zap, label: "Automações avançadas", value: "Incluído" }
    ]
  };

  const invoices: Invoice[] = [
    { id: "1", date: "01/12/2024", description: "Accelerate Plan - Dezembro", amount: "R$ 297,00", status: "paid" },
    { id: "2", date: "01/11/2024", description: "Accelerate Plan - Novembro", amount: "R$ 297,00", status: "paid" },
    { id: "3", date: "01/10/2024", description: "Accelerate Plan - Outubro", amount: "R$ 297,00", status: "paid" },
  ];

  const handleManageSubscription = () => {
    toast.info("Redirecionando para o portal de pagamento...");
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast.success(`Fatura ${invoiceId} baixada com sucesso!`);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className={`${
        isDark 
          ? "bg-card/60 backdrop-blur-lg border-2 border-gradient-to-r from-orange-500/50 to-pink-500/50" 
          : "bg-white shadow-sm border-2 border-primary/20"
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Zap className="h-5 w-5" />
            Seu Plano Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">{currentPlan.name}</h3>
              <p className="text-xl font-semibold text-primary">{currentPlan.price}</p>
            </div>
            <Button 
              onClick={handleManageSubscription}
              className={`${isDark ? "bg-gradient-zaplify" : ""} gap-2`}
            >
              <ExternalLink className="h-4 w-4" />
              Gerenciar Assinatura
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {currentPlan.features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div 
                  key={index}
                  className={`p-4 rounded-lg ${
                    isDark ? "bg-muted/30 border border-white/10" : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{feature.label}</p>
                      <p className="text-sm text-foreground/60">{feature.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Card */}
      <Card className={`${
        isDark 
          ? "bg-card/60 backdrop-blur-lg border-white/10" 
          : "bg-white shadow-sm border-border"
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="h-5 w-5" />
            Método de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${
                isDark ? "bg-muted/30" : "bg-gray-100"
              }`}>
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Cartão final **** 4242</p>
                <p className="text-sm text-foreground/60">Expira em 12/2028</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Alterar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing History Card */}
      <Card className={`${
        isDark 
          ? "bg-card/60 backdrop-blur-lg border-white/10" 
          : "bg-white shadow-sm border-border"
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Download className="h-5 w-5" />
            Histórico de Cobrança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={isDark ? "border-white/10" : "border-gray-200"}>
                  <TableHead className="text-foreground">Data</TableHead>
                  <TableHead className="text-foreground">Descrição</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Valor</TableHead>
                  <TableHead className="text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id} 
                    className={`${
                      isDark ? "border-white/10 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <TableCell className="text-foreground">{invoice.date}</TableCell>
                    <TableCell className="text-foreground">{invoice.description}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={invoice.status === "paid" ? "default" : "secondary"}
                        className={
                          invoice.status === "paid" 
                            ? isDark 
                              ? "bg-gradient-zaplify text-white" 
                              : "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {invoice.status === "paid" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{invoice.amount}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
