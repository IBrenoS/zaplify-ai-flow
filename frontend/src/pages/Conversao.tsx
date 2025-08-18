import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { ConversaoHeader } from "@/components/conversao/ConversaoHeader";
import { KPICards } from "@/components/conversao/KPICards";
import { FunnelChart } from "@/components/conversao/FunnelChart";
import { AssistantPerformanceChart } from "@/components/conversao/AssistantPerformanceChart";
import { ObjectionsSection } from "@/components/conversao/ObjectionsSection";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

const Conversao = () => {
  return (
    <ResponsiveLayout>
      <main className="p-4 md:p-8 max-w-full overflow-x-hidden">
        <div className="space-y-6 md:space-y-8 max-w-full">
          <ConversaoHeader />
          <KPICards />

          {/* Container com altura fixa para ambos os widgets */}
          <div className="flex flex-wrap items-stretch gap-6 w-full">
            <div className="flex-1 min-w-[300px] md:min-w-[400px] h-[500px]">
              <div className="h-full">
                <FunnelChart />
              </div>
            </div>
            <div className="flex-1 min-w-[300px] md:min-w-[400px] h-[500px]">
              <div className="h-full">
                <RecentActivity />
              </div>
            </div>
          </div>

          <div className="w-full">
            <AssistantPerformanceChart />
          </div>

          <div className="w-full">
            <ObjectionsSection />
          </div>
        </div>
      </main>
    </ResponsiveLayout>
  );
};

export default Conversao;
