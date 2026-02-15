import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import LandingPage from "@/pages/LandingPage";
import OrdensServico from "@/pages/OrdensServico";
import Preventiva from "@/pages/Preventiva";
import Contratos from "@/pages/Contratos";
import Login from "@/pages/Login";
import AlterarSenha from "@/pages/AlterarSenha";
import Gestao from "@/pages/Gestao";
import AuditLogs from "@/pages/AuditLogs";
import Relatorios from "@/pages/Relatorios";
import GestaoOrcamento from "@/pages/GestaoOrcamento";
import NotFound from "@/pages/NotFound";
import DefinirResponsavel from "@/pages/DefinirResponsavel";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/alterar-senha" element={<AlterarSenha />} />
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="/app/ordens" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="ordens" element={<OrdensServico />} />
                <Route path="preventiva" element={<Preventiva />} />
                <Route path="contratos" element={<Contratos />} />
                <Route path="gestao" element={<Gestao />} />
                <Route path="orcamento" element={<GestaoOrcamento />} />
                <Route path="logs" element={<AuditLogs />} />
                <Route path="relatorios" element={<Relatorios />} />
              </Route>
              <Route path="/definir-responsavel/:osId" element={<DefinirResponsavel />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
