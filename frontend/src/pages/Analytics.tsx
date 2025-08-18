import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";

const Analytics = () => {
  return (
    <ResponsiveLayout>
      <main className="p-4 md:p-8">
        <div className="text-center">
          <h1 className="text-4xl font-poppins font-bold mb-4 gradient-text">
            Analytics
          </h1>
          <p className="text-xl text-muted-foreground">
            Métricas detalhadas e relatórios de performance!
          </p>
        </div>
      </main>
    </ResponsiveLayout>
  );
};

export default Analytics;
