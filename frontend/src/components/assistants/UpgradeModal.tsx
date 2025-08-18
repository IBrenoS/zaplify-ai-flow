import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Rocket, X } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: "ignite" | "accelerate";
}

export const UpgradeModal = ({ isOpen, onClose, currentPlan }: UpgradeModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    // Aqui seria a integração com o sistema de pagamento
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20">
                <Rocket className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Escale seus Negócios com o Plano Accelerate!
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Desbloqueie todo o potencial da automação
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Benefícios */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-green-500/10">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm">
                Crie até <strong>3 Assistentes de IA</strong>, um para cada negócio ou função
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-green-500/10">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm">
                Conecte até <strong>3 números de WhatsApp</strong> diferentes
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-green-500/10">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm">
                Tenha acesso ao <strong>Funnel Builder</strong> e <strong>Dashboards completos</strong>
              </span>
            </div>
          </div>

          {/* Comparação de planos */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Badge variant="secondary" className="mb-2">Plano Atual - Ignite</Badge>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 1 Assistente</li>
                  <li>• 1 WhatsApp</li>
                  <li>• Funcionalidades básicas</li>
                </ul>
              </div>
              <div>
                <Badge className="mb-2 bg-gradient-zaplify text-white">Plano Accelerate</Badge>
                <ul className="space-y-1">
                  <li>• 3 Assistentes</li>
                  <li>• 3 WhatsApps</li>
                  <li>• Recursos avançados</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full bg-gradient-zaplify hover:shadow-lg text-lg h-12"
            >
              {isLoading ? "Processando..." : "Fazer Upgrade para o Accelerate por R$ 147/mês"}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Continuar no Plano Ignite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
