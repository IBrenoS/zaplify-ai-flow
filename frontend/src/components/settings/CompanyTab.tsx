
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building, Upload, Edit, Trash2, Plus, UserPlus } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export const CompanyTab = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [companyData, setCompanyData] = useState({
    name: "Zaplify Solutions",
    cnpj: "12.345.678/0001-90",
    logo: ""
  });

  const [members] = useState<TeamMember[]>([
    { id: "1", name: "João Santos", email: "joao@zaplify.com", role: "Administrador" },
    { id: "2", name: "Maria Silva", email: "maria@zaplify.com", role: "Editor" },
    { id: "3", name: "Carlos Oliveira", email: "carlos@zaplify.com", role: "Visualizador" }
  ]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompanyData(prev => ({ ...prev, logo: e.target?.result as string }));
        toast.success("Logo da empresa atualizada!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    toast.success("Informações da empresa salvas com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Company Details Card */}
      <Card className={`${
        isDark 
          ? "bg-card/60 backdrop-blur-lg border-white/10" 
          : "bg-white shadow-sm border-border"
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building className="h-5 w-5" />
            Detalhes da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Logo */}
          <div className="flex flex-col items-center space-y-4">
            <div className={`relative w-24 h-24 rounded-lg border-2 border-dashed ${
              isDark ? "border-white/20" : "border-gray-300"
            } flex items-center justify-center overflow-hidden`}>
              {companyData.logo ? (
                <img src={companyData.logo} alt="Company Logo" className="w-full h-full object-cover" />
              ) : (
                <Building className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="relative">
              <Button 
                variant={isDark ? "default" : "default"} 
                size="sm"
                className={isDark ? "bg-gradient-zaplify" : ""}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Company Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-foreground">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={companyData.name}
                onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                className={`${
                  isDark 
                    ? "bg-muted/50 border-white/10 text-foreground" 
                    : "bg-white border-gray-200 text-foreground"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyCnpj" className="text-foreground">CNPJ</Label>
              <Input
                id="companyCnpj"
                value={companyData.cnpj}
                onChange={(e) => setCompanyData(prev => ({ ...prev, cnpj: e.target.value }))}
                className={`${
                  isDark 
                    ? "bg-muted/50 border-white/10 text-foreground" 
                    : "bg-white border-gray-200 text-foreground"
                }`}
              />
            </div>
          </div>

          <Button onClick={handleSave} className={isDark ? "bg-gradient-zaplify" : ""}>
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      {/* Team Members Card */}
      <Card className={`${
        isDark 
          ? "bg-card/60 backdrop-blur-lg border-white/10" 
          : "bg-white shadow-sm border-border"
      }`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="h-5 w-5" />
            Membros da Equipe
          </CardTitle>
          <Button 
            size="sm" 
            className={isDark ? "bg-gradient-zaplify" : ""}
          >
            <Plus className="h-4 w-4 mr-2" />
            Convidar Membro
          </Button>
        </CardHeader>
        <CardContent>
          {isDark ? (
            // Dark theme - Card layout
            <div className="grid gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-gradient-zaplify text-white">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-sm text-foreground/60">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-muted/50 text-foreground">
                      {member.role}
                    </Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Light theme - Table layout
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 pb-2 border-b border-gray-200 text-sm font-medium text-muted-foreground">
                <div>Usuário</div>
                <div>E-mail</div>
                <div>Cargo</div>
                <div>Ações</div>
              </div>
              {members.map((member) => (
                <div key={member.id} className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{member.name}</span>
                  </div>
                  <div className="text-foreground/80">{member.email}</div>
                  <div>
                    <Badge variant="outline" className="border-primary/20 text-primary">
                      {member.role}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
