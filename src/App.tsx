import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EmpresaAtivaProvider } from "@/contexts/EmpresaAtivaContext";
import { lazy, Suspense } from "react";
import LandingPage from "./pages/LandingPage";
import ClientAuth from "./pages/ClientAuth";
import MasterAuth from "./pages/MasterAuth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import FloatingMessengerOrbs from "./components/messenger/FloatingMessengerOrbs";
import { Loader2 } from "lucide-react";

// Lazy load heavy pages
const Dashboard = lazy(() => import("./pages/Index"));
const Admin = lazy(() => import("./pages/Admin"));
const TaskVault = lazy(() => import("./pages/TaskVault"));
const Messenger = lazy(() => import("./pages/Messenger"));
const FinancialACE = lazy(() => import("./pages/FinancialACE"));
const Conversores = lazy(() => import("./pages/Conversores"));
const UsuariosAdmin = lazy(() => import("./pages/UsuariosAdmin"));
const InstallApp = lazy(() => import("./pages/InstallApp"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);
const queryClient = new QueryClient();

const App = () => {
  // Global error handler
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EmpresaAtivaProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <FloatingMessengerOrbs />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<ClientAuth />} />
                  <Route path="/sys-a7x9k2" element={<MasterAuth />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
                  <Route path="/usuarios" element={<ProtectedRoute requireAdmin><UsuariosAdmin /></ProtectedRoute>} />
                  <Route path="/taskvault" element={<ProtectedRoute module="taskvault"><TaskVault /></ProtectedRoute>} />
                  <Route path="/ajustasped" element={<Navigate to="/conversores" replace />} />
                  <Route path="/messenger" element={<ProtectedRoute module="messenger"><Messenger /></ProtectedRoute>} />
                  <Route path="/gestao" element={<ProtectedRoute module="gestao"><FinancialACE /></ProtectedRoute>} />
                  <Route path="/conversores" element={<ProtectedRoute module="conversores"><Conversores /></ProtectedRoute>} />
                  <Route path="/install" element={<InstallApp />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </EmpresaAtivaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
