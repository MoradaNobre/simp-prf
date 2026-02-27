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
import Chamados from "@/pages/Chamados";
import Preventiva from "@/pages/Preventiva";
import Agenda from "@/pages/Agenda";
import Contratos from "@/pages/Contratos";
import Login from "@/pages/Login";
import AlterarSenha from "@/pages/AlterarSenha";
import Gestao from "@/pages/Gestao";
import Sobre from "@/pages/Sobre";
import DocumentoViewer from "@/pages/DocumentoViewer";
import { AppRedirect } from "@/components/AppRedirect";
import Relatorios from "@/pages/Relatorios";
import GestaoOrcamento from "@/pages/GestaoOrcamento";
import NotFound from "@/pages/NotFound";
import DefinirResponsavel from "@/pages/DefinirResponsavel";
import ExportarTelas from "@/pages/ExportarTelas";

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
                <Route index element={<AppRedirect />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="chamados" element={<Chamados />} />
                <Route path="ordens" element={<OrdensServico />} />
                <Route path="preventiva" element={<Preventiva />} />
                <Route path="agenda" element={<Agenda />} />
                <Route path="contratos" element={<Contratos />} />
                <Route path="gestao" element={<Gestao />} />
                <Route path="orcamento" element={<GestaoOrcamento />} />
                
                <Route path="relatorios" element={<Relatorios />} />
                <Route path="sobre" element={<Sobre />} />
                <Route path="documento" element={<DocumentoViewer />} />
                <Route path="exportar-telas" element={<ExportarTelas />} />
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
