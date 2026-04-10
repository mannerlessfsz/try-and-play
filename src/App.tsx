import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EmpresaAtivaProvider } from "@/contexts/EmpresaAtivaContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { lazy, Suspense } from "react";
import LandingPage from "./pages/LandingPage";
import ClientAuth from "./pages/ClientAuth";
import MasterAuth from "./pages/MasterAuth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import FloatingMessengerOrbs from "./components/messenger/FloatingMessengerOrbs";
import { Loader2 } from "lucide-react";

// Retry wrapper for lazy imports (handles Vite HMR cache issues)
function lazyRetry(importFn: () => Promise<any>, retries = 3): Promise<any> {
  return new Promise((resolve, reject) => {
    importFn()
      .then(resolve)
      .catch((error: any) => {
        if (retries > 0) {
          // Add cache-busting query param
          setTimeout(() => {
            lazyRetry(importFn, retries - 1).then(resolve, reject);
          }, 500);
        } else {
          reject(error);
        }
      });
  });
}

// Lazy load heavy pages with retry
const Dashboard = lazy(() => lazyRetry(() => import("./pages/Index")));
const Admin = lazy(() => lazyRetry(() => import("./pages/Admin")));
const TaskVault = lazy(() => lazyRetry(() => import("./pages/TaskVault")));
const Messenger = lazy(() => lazyRetry(() => import("./pages/Messenger")));
const FinancialACE = lazy(() => lazyRetry(() => import("./pages/FinancialACE")));

const UsuariosAdmin = lazy(() => lazyRetry(() => import("./pages/UsuariosAdmin")));
const InstallApp = lazy(() => lazyRetry(() => import("./pages/InstallApp")));
const ClienteTaskVault = lazy(() => lazyRetry(() => import("./pages/ClienteTaskVault")));
const TaskVaultCadastro = lazy(() => lazyRetry(() => import("./pages/TaskVaultCadastro")));
const TaskVaultDocumentos = lazy(() => lazyRetry(() => import("./pages/TaskVaultDocumentos")));

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
    <ThemeProvider>
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
                  <Route path="/taskvault/cadastro" element={<ProtectedRoute module="taskvault"><TaskVaultCadastro /></ProtectedRoute>} />
                  <Route path="/taskvault/documentos" element={<ProtectedRoute module="taskvault"><TaskVaultDocumentos /></ProtectedRoute>} />
                  <Route path="/messenger" element={<ProtectedRoute module="messenger"><Messenger /></ProtectedRoute>} />
                  <Route path="/gestao" element={<ProtectedRoute module="gestao"><FinancialACE /></ProtectedRoute>} />
                  <Route path="/install" element={<InstallApp />} />
                  <Route path="/cliente/taskvault" element={<ProtectedRoute><ClienteTaskVault /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </EmpresaAtivaProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
