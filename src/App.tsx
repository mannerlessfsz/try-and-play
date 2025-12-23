import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TaskVault from "./pages/TaskVault";
import AjustaSped from "./pages/AjustaSped";
import ConfereSped from "./pages/ConfereSped";
import FinancialACE from "./pages/FinancialACE";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/taskvault" element={<TaskVault />} />
          <Route path="/ajustasped" element={<AjustaSped />} />
          <Route path="/conferesped" element={<ConfereSped />} />
          <Route path="/financialace" element={<FinancialACE />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
