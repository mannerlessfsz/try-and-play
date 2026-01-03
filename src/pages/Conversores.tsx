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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState("fiscal");

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Cards - 2 rows */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {conversores.map((conversor) => {
              const Icon = conversor.icon;
              const isActive = activeTab === conversor.id;
              
              return (
                <Card 
                  key={conversor.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'ring-2 ring-primary shadow-lg scale-[1.02]' 
                      : 'hover:shadow-md hover:scale-[1.01]'
                  }`}
                  onClick={() => setActiveTab(conversor.id)}
                >
                  <CardHeader className="p-3 pb-1">
                    <div className={`w-10 h-10 rounded-lg ${conversor.bgColor} flex items-center justify-center mb-1`}>
                      <Icon className={`w-5 h-5 ${conversor.color}`} />
                    </div>
                    <CardTitle className="text-xs font-medium leading-tight">{conversor.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <CardDescription className="text-[10px] line-clamp-2">
                      {conversor.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tab Content */}
          <TabsContent value="fiscal" className="mt-6">
            <ConversorFiscal />
          </TabsContent>
          
          <TabsContent value="extrato" className="mt-6">
            <ConversorExtrato />
          </TabsContent>
          
          <TabsContent value="documentos" className="mt-6">
            <ConversorDocumentos />
          </TabsContent>
          
          <TabsContent value="contabil" className="mt-6">
            <ConversorContabil />
          </TabsContent>

          <TabsContent value="ajustasped" className="mt-6">
            <AjustaSpedTab />
          </TabsContent>

          <TabsContent value="lancaapae" className="mt-6">
            <LancaApaeTab />
          </TabsContent>

          <TabsContent value="casa" className="mt-6">
            <ConversorCasaTab />
          </TabsContent>

          <TabsContent value="lider" className="mt-6">
            <ConversorLiderTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Conversores;
