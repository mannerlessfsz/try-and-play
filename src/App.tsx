import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EmpresaAtivaProvider } from "@/contexts/EmpresaAtivaContext";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Index";
import ClientAuth from "./pages/ClientAuth";
import MasterAuth from "./pages/MasterAuth";
import Admin from "./pages/Admin";
import TaskVault from "./pages/TaskVault";
import AjustaSped from "./pages/AjustaSped";
import ConfereSped from "./pages/ConfereSped";
import FinancialACE from "./pages/FinancialACE";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

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
              <Route path="/ajustasped" element={<ProtectedRoute module="ajustasped"><AjustaSped /></ProtectedRoute>} />
              <Route path="/conferesped" element={<ProtectedRoute module="conferesped"><ConfereSped /></ProtectedRoute>} />
              <Route path="/gestao" element={<ProtectedRoute module="financialace"><FinancialACE /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </EmpresaAtivaProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
