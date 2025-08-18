import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User } from "lucide-react";
import { toast } from "sonner";

export const ProfileTab = () => {
  const [profileData, setProfileData] = useState({
    fullName: "Joao",
    email: "joao@exemplo.com",
    position: "Gestor de Vendas"
  });
  const [avatarSrc, setAvatarSrc] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarSrc(e.target?.result as string);
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    toast.success("Alterações salvas com sucesso!");
    setHasChanges(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <User className="h-5 w-5" />
          Informações do Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload da Foto de Perfil */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback className="text-xl bg-gradient-zaplify text-white">
                J
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <p className="text-sm text-foreground/60 text-center">
            Clique na foto para alterar sua imagem de perfil
          </p>
        </div>

        {/* Formulário de Informações Pessoais */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName" className="text-foreground">Nome Completo</Label>
            <Input
              id="fullName"
              value={profileData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              placeholder="Digite seu nome completo"
              className="text-foreground placeholder:text-foreground/50"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email" className="text-foreground">E-mail da Conta</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                value={profileData.email}
                disabled
                className="bg-muted/50 text-foreground/60"
              />
              <Button variant="outline" size="sm" className="text-foreground border-foreground/20">
                Alterar
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="position" className="text-foreground">Cargo/Função</Label>
            <Input
              id="position"
              value={profileData.position}
              onChange={(e) => handleInputChange("position", e.target.value)}
              placeholder="Digite seu cargo ou função (opcional)"
              className="text-foreground placeholder:text-foreground/50"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="w-full sm:w-auto"
          >
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
