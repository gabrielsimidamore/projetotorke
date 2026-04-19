import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Interacoes from "./pages/Interacoes";
import ProjetosPage from "./pages/Projetos";
import ProjetoDetalhe from "./pages/ProjetoDetalhe";
import IdeiasPage from "./pages/Ideias";
import PostsPage from "./pages/Posts";
import MetricasPage from "./pages/Metricas";
import RecomendacoesPage from "./pages/Recomendacoes";
import VendasPage from "./pages/Vendas";
import ReunioesPag from "./pages/Reunioes";
import NotificacoesPage from "./pages/Notificacoes";
import NotFound from "./pages/NotFound";
import InsightsPage from "./pages/Insights";
import MelhoriasPage from "./pages/Melhorias";
import ArquivosPage from "./pages/Arquivos";
import TrafegoPagoPage from "./pages/TrafegoPago";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ProjectProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
              <Route path="/interacoes" element={<ProtectedRoute><Interacoes /></ProtectedRoute>} />
              <Route path="/projetos" element={<ProtectedRoute><ProjetosPage /></ProtectedRoute>} />
              <Route path="/projetos/:id" element={<ProtectedRoute><ProjetoDetalhe /></ProtectedRoute>} />
              <Route path="/ideias" element={<ProtectedRoute><IdeiasPage /></ProtectedRoute>} />
              <Route path="/posts" element={<ProtectedRoute><PostsPage /></ProtectedRoute>} />
              <Route path="/metricas" element={<ProtectedRoute><MetricasPage /></ProtectedRoute>} />
              <Route path="/recomendacoes" element={<ProtectedRoute><RecomendacoesPage /></ProtectedRoute>} />
              <Route path="/vendas" element={<ProtectedRoute><VendasPage /></ProtectedRoute>} />
              <Route path="/reunioes" element={<ProtectedRoute><ReunioesPag /></ProtectedRoute>} />
              <Route path="/notificacoes" element={<ProtectedRoute><NotificacoesPage /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
              <Route path="/melhorias" element={<ProtectedRoute><MelhoriasPage /></ProtectedRoute>} />
              <Route path="/arquivos" element={<ProtectedRoute><ArquivosPage /></ProtectedRoute>} />
              <Route path="/trafego-pago" element={<ProtectedRoute><TrafegoPagoPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
      </ProjectProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
