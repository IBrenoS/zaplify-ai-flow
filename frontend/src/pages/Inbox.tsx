import { AppSidebar } from "@/components/layout/AppSidebar";

const Inbox = () => {
  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />

      <main className="flex-1 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-poppins font-bold mb-4 gradient-text">
            Inbox WhatsApp
          </h1>
          <p className="text-xl text-muted-foreground">
            Gerencie todas as conversas em tempo real!
          </p>
        </div>
      </main>
    </div>
  );
};

export default Inbox;
