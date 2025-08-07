
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Assistants from "./pages/Assistants";
import Prospecting from "./pages/Prospecting";
import Conversao from "./pages/Conversao";
import FunnelBuilder from "./pages/FunnelBuilder";
import ZapliTools from "./pages/ZapliTools";
import ZapliWeb from "./pages/ZapliWeb";
import Agenda from "./pages/Agenda";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="zaplify-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/assistants" element={<ProtectedRoute><Assistants /></ProtectedRoute>} />
            <Route path="/prospecting" element={<ProtectedRoute><Prospecting /></ProtectedRoute>} />
            <Route path="/conversao" element={<ProtectedRoute><Conversao /></ProtectedRoute>} />
            <Route path="/funnel-builder" element={<ProtectedRoute><FunnelBuilder /></ProtectedRoute>} />
            <Route path="/zaplitools" element={<ProtectedRoute><ZapliTools /></ProtectedRoute>} />
            <Route path="/zaplyweb" element={<ProtectedRoute><ZapliWeb /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
