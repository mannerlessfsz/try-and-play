import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  FileText, 
  Receipt, 
  Calculator,
  Upload,
  Download,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversorFiscal } from "@/components/conversores/ConversorFiscal";
import { ConversorExtrato } from "@/components/conversores/ConversorExtrato";
import { ConversorDocumentos } from "@/components/conversores/ConversorDocumentos";
import { ConversorContabil } from "@/components/conversores/ConversorContabil";

const conversores = [
  {
    id: "fiscal",
    icon: Receipt,
    title: "Arquivos Fiscais",
    description: "XML de NF-e, SPED, CT-e para outros formatos",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "extrato",
    icon: FileSpreadsheet,
    title: "Extratos Bancários",
    description: "OFX, PDF de extrato para CSV, Excel",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "documentos",
    icon: FileText,
    title: "Documentos Gerais",
    description: "PDF para texto, imagens, planilhas",
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
          {/* Tab Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 rounded-xl ${conversor.bgColor} flex items-center justify-center mb-2`}>
                      <Icon className={`w-6 h-6 ${conversor.color}`} />
                    </div>
                    <CardTitle className="text-base">{conversor.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-xs">
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
        </Tabs>
      </div>
    </div>
  );
};

export default Conversores;
