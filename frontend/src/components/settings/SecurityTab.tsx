
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Key, Smartphone, QrCode } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";

export const SecurityTab = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showTwoFAModal, setShowTwoFAModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }
    toast.success("Senha alterada com sucesso!");
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleTwoFAToggle = (enabled: boolean) => {
    if (enabled && !twoFAEnabled) {
      setShowTwoFAModal(true);
    } else if (!enabled && twoFAEnabled) {
      setTwoFAEnabled(false);
      toast.success("Autenticação de dois fatores desativada");
    }
  };

  const handleTwoFAConfirm = () => {
    if (verificationCode.length === 6) {
      setTwoFAEnabled(true);
      setShowTwoFAModal(false);
      setVerificationCode("");
      toast.success("Autenticação de dois fatores ativada com sucesso!");
    } else {
      toast.error("Código inválido. Tente novamente.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <Card className={`${
        isDark 
          ? "bg-card/60 backdrop-blur-lg border-white/10" 
          : "bg-white shadow-sm border-border"
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Key className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-foreground">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className={`${
                  isDark 
                    ? "bg-muted/50 border-white/10 text-foreground" 
                    : "bg-white border-gray-200 text-foreground"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className={`${
                  isDark 
                    ? "bg-muted/50 border-white/10 text-foreground" 
                    : "bg-white border-gray-200 text-foreground"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`${
                  isDark 
                    ? "bg-muted/50 border-white/10 text-foreground" 
                    : "bg-white border-gray-200 text-foreground"
                }`}
              />
            </div>
          </div>

          <Button 
            onClick={handlePasswordChange} 
            className={isDark ? "bg-gradient-zaplify" : ""}
            disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            Salvar Nova Senha
          </Button>
        </CardContent>
      </Card>

      {/* Two Factor Authentication Card */}
      <Card className={`${
        isDark 
          ? "bg-card/60 backdrop-blur-lg border-white/10" 
          : "bg-white shadow-sm border-border"
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5" />
            Autenticação de Dois Fatores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Ativar 2FA</p>
              <p className="text-sm text-foreground/60">
                Adicione uma camada extra de segurança à sua conta
              </p>
            </div>
            <Switch
              checked={twoFAEnabled}
              onCheckedChange={handleTwoFAToggle}
              className={`${
                twoFAEnabled 
                  ? isDark 
                    ? "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-pink-500" 
                    : "data-[state=checked]:bg-primary"
                  : ""
              }`}
            />
          </div>

          {twoFAEnabled && (
            <div className={`p-4 rounded-lg ${
              isDark ? "bg-muted/30 border border-white/10" : "bg-gray-50 border border-gray-200"
            }`}>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Smartphone className="h-4 w-4" />
                <span>Autenticação de dois fatores está ativa</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two FA Setup Modal */}
      <Dialog open={showTwoFAModal} onOpenChange={setShowTwoFAModal}>
        <DialogContent className={`${
          isDark 
            ? "bg-card/95 backdrop-blur-xl border-white/20" 
            : "bg-white"
        } max-w-md`}>
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">
              Configurar Autenticação de Dois Fatores
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className={`mx-auto w-32 h-32 ${
                isDark ? "bg-muted/50" : "bg-gray-100"
              } rounded-lg flex items-center justify-center`}>
                <QrCode className="h-16 w-16 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  1. Escaneie este QR Code com seu app autenticador
                </p>
                <p className="text-sm text-foreground">
                  2. Insira o código gerado para confirmar
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode" className="text-foreground">
                  Código de Verificação
                </Label>
                <Input
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className={`text-center text-lg tracking-widest ${
                    isDark 
                      ? "bg-muted/50 border-white/10 text-foreground" 
                      : "bg-white border-gray-200 text-foreground"
                  }`}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTwoFAModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleTwoFAConfirm}
                  className={`flex-1 ${isDark ? "bg-gradient-zaplify" : ""}`}
                  disabled={verificationCode.length !== 6}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
