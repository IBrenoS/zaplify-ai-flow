import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Smartphone, Loader2, QrCode } from "lucide-react";

interface WhatsAppConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phoneNumber: string) => void;
}

export const WhatsAppConnectionModal = ({ isOpen, onClose, onSuccess }: WhatsAppConnectionModalProps) => {
  const [connectionStatus, setConnectionStatus] = useState<"waiting" | "connecting" | "success" | "error">("waiting");
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Simular geração do QR Code
      setQrCode("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
      
      // Simular processo de conexão
      const timer = setTimeout(() => {
        setConnectionStatus("connecting");
        
        setTimeout(() => {
          setConnectionStatus("success");
          setTimeout(() => {
            onSuccess("+55 11 99999-9999");
            onClose();
          }, 2000);
        }, 3000);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onSuccess, onClose]);

  const resetModal = () => {
    setConnectionStatus("waiting");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Smartphone className="w-6 h-6 text-green-500" />
              </div>
              <DialogTitle className="text-lg font-bold">
                Conectar WhatsApp
              </DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={resetModal}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {connectionStatus === "waiting" && (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg border-2 border-dashed border-muted-foreground/25">
                  <div className="w-48 h-48 bg-muted/30 rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Instruções */}
              <div className="space-y-3">
                <h4 className="font-medium text-center">Como conectar:</h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
                    Abra o WhatsApp no seu celular
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
                    Vá em Configurações → Aparelhos Conectados
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">3</span>
                    Toque em "Conectar um aparelho" e escaneie este código
                  </li>
                </ol>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Aguardando conexão...
                </p>
              </div>
            </>
          )}

          {connectionStatus === "connecting" && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <div>
                <h4 className="font-medium">Conectando...</h4>
                <p className="text-sm text-muted-foreground">
                  Validando a conexão com o WhatsApp
                </p>
              </div>
            </div>
          )}

          {connectionStatus === "success" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-green-600">✔️ Conectado com sucesso!</h4>
                <p className="text-sm text-muted-foreground">
                  Seu WhatsApp foi conectado ao assistente
                </p>
              </div>
            </div>
          )}

          {connectionStatus === "error" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h4 className="font-medium text-red-600">Erro na conexão</h4>
                <p className="text-sm text-muted-foreground">
                  Não foi possível conectar. Tente novamente.
                </p>
              </div>
              <Button onClick={() => setConnectionStatus("waiting")} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};