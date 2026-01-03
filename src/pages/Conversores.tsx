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
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversorFiscal } from "@/components/conversores/ConversorFiscal";
import { ConversorExtrato } from "@/components/conversores/ConversorExtrato";
import { ConversorDocumentos } from "@/components/conversores/ConversorDocumentos";
import { ConversorContabil } from "@/components/conversores/ConversorContabil";
import { AjustaSpedTab } from "@/components/conversores/AjustaSpedTab";
import { LancaApaeTab } from "@/components/conversores/LancaApaeTab";
import { ConversorCasaTab } from "@/components/conversores/ConversorCasaTab";
import { ConversorLiderTab } from "@/components/conversores/ConversorLiderTab";

const conversores = [
  {
    id: "fiscal",
    icon: Receipt,
    title: "Arquivos Fiscais",
    description: "XML de NF-e, SPED, CT-e",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "extrato",
    icon: FileSpreadsheet,
    title: "Extratos Bancários",
    description: "OFX, PDF para CSV/Excel",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "documentos",
    icon: FileText,
    title: "Documentos Gerais",
    description: "PDF, texto, planilhas",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "contabil",
    icon: Calculator,
    title: "Dados Contábeis",
    description: "Balancete, DRE, plano de contas",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "ajustasped",
    icon: Zap,
    title: "Ajusta SPED",
    description: "Correção de arquivos SPED",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    id: "lancaapae",
    icon: FileUp,
    title: "Lança APAE",
    description: "Importação de arquivos APAE",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    id: "casa",
    icon: Home,
    title: "Conversor CASA",
    description: "Arquivos do sistema CASA",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "lider",
    icon: Crown,
    title: "Conversor LÍDER",
    description: "Arquivos do sistema LÍDER",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
];

const Conversores = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-primary" />
                Conversores
              </h1>
              <p className="text-sm text-muted-foreground">
                Converta arquivos fiscais, extratos, documentos e dados contábeis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {!activeTab ? (
          /* Cards Grid - Show when no tab is selected */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {conversores.map((conversor) => {
              const Icon = conversor.icon;
              
              return (
                <Card 
                  key={conversor.id}
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group"
                  onClick={() => setActiveTab(conversor.id)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className={`w-12 h-12 rounded-xl ${conversor.bgColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${conversor.color}`} />
                    </div>
                    <CardTitle className="text-sm font-semibold">{conversor.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <CardDescription className="text-xs">
                      {conversor.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Converter Content - Show when a tab is selected */
          <div className="space-y-4">
            {/* Back button and selected converter info */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setActiveTab("")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              {(() => {
                const current = conversores.find(c => c.id === activeTab);
                if (!current) return null;
                const Icon = current.icon;
                return (
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${current.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${current.color}`} />
                    </div>
                    <span className="font-medium">{current.title}</span>
                  </div>
                );
              })()}
            </div>

            {/* Converter Content */}
            {activeTab === "fiscal" && <ConversorFiscal />}
            {activeTab === "extrato" && <ConversorExtrato />}
            {activeTab === "documentos" && <ConversorDocumentos />}
            {activeTab === "contabil" && <ConversorContabil />}
            {activeTab === "ajustasped" && <AjustaSpedTab />}
            {activeTab === "lancaapae" && <LancaApaeTab />}
            {activeTab === "casa" && <ConversorCasaTab />}
            {activeTab === "lider" && <ConversorLiderTab />}
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversores;
