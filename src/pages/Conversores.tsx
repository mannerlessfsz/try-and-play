import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  FileText, 
  Receipt, 
  Calculator,
  RefreshCw,
  Zap,
  FileUp,
  Home,
  Crown,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConversorFiscal } from "@/components/conversores/ConversorFiscal";
import { ConversorExtrato } from "@/components/conversores/ConversorExtrato";
import { ConversorDocumentos } from "@/components/conversores/ConversorDocumentos";
import { ConversorContabil } from "@/components/conversores/ConversorContabil";
import { AjustaSpedTab } from "@/components/conversores/AjustaSpedTab";
import { LancaApaeTab } from "@/components/conversores/LancaApaeTab";
import { ConversorCasaTab } from "@/components/conversores/ConversorCasaTab";
import { ConversorLiderTab } from "@/components/conversores/ConversorLiderTab";
import { motion, AnimatePresence } from "framer-motion";

const conversores = [
  {
    id: "fiscal",
    icon: Receipt,
    title: "Arquivos Fiscais",
    description: "XML de NF-e, SPED, CT-e",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    category: "fiscal",
  },
  {
    id: "extrato",
    icon: FileSpreadsheet,
    title: "Extratos Bancários",
    description: "OFX, PDF para CSV/Excel",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    category: "financeiro",
  },
  {
    id: "documentos",
    icon: FileText,
    title: "Documentos Gerais",
    description: "PDF, texto, planilhas",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    category: "geral",
  },
  {
    id: "contabil",
    icon: Calculator,
    title: "Dados Contábeis",
    description: "Balancete, DRE, plano de contas",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    category: "contabil",
  },
  {
    id: "ajustasped",
    icon: Zap,
    title: "Ajusta SPED",
    description: "Correção de arquivos SPED",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    category: "fiscal",
  },
  {
    id: "lancaapae",
    icon: FileUp,
    title: "Lança APAE",
    description: "Importação de arquivos APAE",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    category: "contabil",
  },
  {
    id: "casa",
    icon: Home,
    title: "Conversor CASA",
    description: "Arquivos do sistema CASA",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    category: "sistemas",
  },
  {
    id: "lider",
    icon: Crown,
    title: "Conversor LÍDER",
    description: "Arquivos do sistema LÍDER",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
    category: "sistemas",
  },
];

const Conversores = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => activeTab ? setActiveTab("") : navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Conversores
                {activeTab && (
                  <>
                    <span className="text-muted-foreground font-normal">/</span>
                    <span className="text-primary">
                      {conversores.find(c => c.id === activeTab)?.title}
                    </span>
                  </>
                )}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {activeTab 
                  ? conversores.find(c => c.id === activeTab)?.description
                  : "Converta arquivos fiscais, extratos, documentos e dados contábeis"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {!activeTab ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {conversores.map((conversor, index) => {
                  const Icon = conversor.icon;
                  
                  return (
                    <motion.div
                      key={conversor.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group border ${conversor.borderColor} hover:border-current`}
                        onClick={() => setActiveTab(conversor.id)}
                      >
                        <CardHeader className="p-3 pb-2">
                          <div className={`w-10 h-10 rounded-lg ${conversor.bgColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-5 h-5 ${conversor.color}`} />
                          </div>
                          <CardTitle className="text-sm font-semibold leading-tight">
                            {conversor.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <CardDescription className="text-xs line-clamp-2">
                            {conversor.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Info Banner */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6"
              >
                <div className="rounded-lg bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm mb-1">Histórico de Conversões</h3>
                      <p className="text-xs text-muted-foreground">
                        Todos os arquivos convertidos são salvos automaticamente. Acesse o histórico em cada conversor para consultar e baixar conversões anteriores.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "fiscal" && <ConversorFiscal />}
              {activeTab === "extrato" && <ConversorExtrato />}
              {activeTab === "documentos" && <ConversorDocumentos />}
              {activeTab === "contabil" && <ConversorContabil />}
              {activeTab === "ajustasped" && <AjustaSpedTab />}
              {activeTab === "lancaapae" && <LancaApaeTab />}
              {activeTab === "casa" && <ConversorCasaTab />}
              {activeTab === "lider" && <ConversorLiderTab />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Conversores;
