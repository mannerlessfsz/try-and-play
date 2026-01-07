import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EmpresaAtivaProvider } from "@/contexts/EmpresaAtivaContext";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Index";
import ClientAuth from "./pages/ClientAuth";
import MasterAuth from "./pages/MasterAuth";
import Admin from "./pages/Admin";
import TaskVault from "./pages/TaskVault";
import Messenger from "./pages/Messenger";
import FinancialACE from "./pages/FinancialACE";
import Conversores from "./pages/Conversores";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { FloatingMessenger } from "./components/messenger/FloatingMessenger";

const queryClient = new QueryClient();

// Componente que renderiza o FloatingMessenger apenas em rotas protegidas (exceto na própria página messenger)
function GlobalMessenger() {
  const location = useLocation();
  const { user } = useAuth();
  
  // Não mostrar na página do messenger, nas páginas de auth, ou se não estiver logado
  const hiddenRoutes = ['/messenger', '/', '/auth', '/master'];
  const shouldShow = user && !hiddenRoutes.includes(location.pathname);
  
  if (!shouldShow) return null;
  
  return <FloatingMessenger />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EmpresaAtivaProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<ClientAuth />} />
              <Route path="/master" element={<MasterAuth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="/taskvault" element={<ProtectedRoute module="taskvault"><TaskVault /></ProtectedRoute>} />
              <Route path="/ajustasped" element={<Navigate to="/conversores" replace />} />
              <Route path="/messenger" element={<ProtectedRoute module="messenger"><Messenger /></ProtectedRoute>} />
              <Route path="/gestao" element={<ProtectedRoute module="gestao"><FinancialACE /></ProtectedRoute>} />
              <Route path="/conversores" element={<ProtectedRoute module="conversores"><Conversores /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <GlobalMessenger />
          </BrowserRouter>
        </TooltipProvider>
      </EmpresaAtivaProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
