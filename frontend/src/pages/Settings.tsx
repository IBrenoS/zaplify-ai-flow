
import { useState } from "react";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { CompanyTab } from "@/components/settings/CompanyTab";
import { SecurityTab } from "@/components/settings/SecurityTab";
import { BillingTab } from "@/components/settings/BillingTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { SettingsTabNavigation } from "@/components/settings/SettingsTabNavigation";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <ResponsiveLayout>
      <main className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-poppins font-bold mb-4 gradient-text">
            Configurações
          </h1>
          <p className="text-xl text-foreground/80">
            Gerencie suas preferências e informações da conta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Menu de Navegação - Coluna Esquerda */}
          <div className="lg:col-span-1">
            <SettingsTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Área de Conteúdo - Coluna Direita */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="profile" className="space-y-6">
                <ProfileTab />
              </TabsContent>

              <TabsContent value="company">
                <CompanyTab />
              </TabsContent>

              <TabsContent value="security">
                <SecurityTab />
              </TabsContent>

              <TabsContent value="billing">
                <BillingTab />
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationsTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </ResponsiveLayout>
  );
};

export default Settings;
