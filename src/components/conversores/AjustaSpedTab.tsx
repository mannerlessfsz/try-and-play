import { useState } from "react";
import { 
  FileText, Upload, Download, Play, Eye,
  CheckCircle, AlertTriangle, Clock, XCircle, 
  CheckSquare, FileWarning, Trash2, Zap,
  List, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ArquivoSped {
  id: string;
  nome: string;
  tipo: "EFD_ICMS" | "EFD_CONTRIB" | "ECF" | "ECD";
  competencia: string;
  status: "pendente" | "processando" | "ajustado" | "erro";
  erros: number;
  ajustes: number;
  dataUpload: string;
}

type FilterType = "all" | "pendente" | "ajustado" | "erro";

export function AjustaSpedTab() {
  const [activeTab, setActiveTab] = useState<"arquivos" | "erros">("arquivos");
  const [viewMode, setViewMode] = useState<"lista" | "grid">("lista");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const [arquivos] = useState<ArquivoSped[]>([
    { id: "1", nome: "EFD_ICMS_122024.txt", tipo: "EFD_ICMS", competencia: "12/2024", status: "pendente", erros: 15, ajustes: 0, dataUpload: "2024-12-20" },
    { id: "2", nome: "EFD_CONTRIB_122024.txt", tipo: "EFD_CONTRIB", competencia: "12/2024", status: "processando", erros: 8, ajustes: 3, dataUpload: "2024-12-19" },
    { id: "3", nome: "ECF_2024.txt", tipo: "ECF", competencia: "2024", status: "ajustado", erros: 0, ajustes: 42, dataUpload: "2024-12-18" },
    { id: "4", nome: "ECD_2024.txt", tipo: "ECD", competencia: "2024", status: "erro", erros: 25, ajustes: 10, dataUpload: "2024-12-17" },
  ]);

  const totalArquivos = arquivos.length;
  const arquivosPendentes = arquivos.filter(a => a.status === "pendente").length;
  const arquivosAjustados = arquivos.filter(a => a.status === "ajustado").length;
  const arquivosComErro = arquivos.filter(a => a.status === "erro").length;
  const totalErros = arquivos.reduce((acc, a) => acc + a.erros, 0);

  const getFilteredArquivos = () => {
    switch (activeFilter) {
      case "pendente": return arquivos.filter(a => a.status === "pendente" || a.status === "processando");
      case "ajustado": return arquivos.filter(a => a.status === "ajustado");
      case "erro": return arquivos.filter(a => a.status === "erro");
      default: return arquivos;
    }
  };

  const filteredArquivos = getFilteredArquivos();

  const getStatusColor = (status: ArquivoSped["status"]) => {
    switch (status) {
      case "pendente": return "bg-gray-500/20 text-gray-300";
      case "processando": return "bg-blue-500/20 text-blue-300";
      case "ajustado": return "bg-green-500/20 text-green-300";
      case "erro": return "bg-red-500/20 text-red-300";
    }
  };

  const getTipoColor = (tipo: ArquivoSped["tipo"]) => {
    switch (tipo) {
      case "EFD_ICMS": return "bg-cyan-500/20 text-cyan-300";
      case "EFD_CONTRIB": return "bg-purple-500/20 text-purple-300";
      case "ECF": return "bg-orange-500/20 text-orange-300";
      case "ECD": return "bg-pink-500/20 text-pink-300";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-500" />
            Ajusta SPED
          </CardTitle>
          <CardDescription>
            Corrija e ajuste arquivos SPED automaticamente. Suporta EFD ICMS/IPI, EFD Contribuições, ECF e ECD.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => setActiveFilter(prev => prev === "all" ? "all" : "all")}
              className={`p-3 rounded-lg border transition-all ${activeFilter === "all" ? "border-cyan-500 bg-cyan-500/10" : "border-border hover:border-cyan-500/50"}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-500" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalArquivos}</p>
            </button>
            <button
              onClick={() => setActiveFilter(prev => prev === "pendente" ? "all" : "pendente")}
              className={`p-3 rounded-lg border transition-all ${activeFilter === "pendente" ? "border-yellow-500 bg-yellow-500/10" : "border-border hover:border-yellow-500/50"}`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Pendentes</span>
              </div>
              <p className="text-2xl font-bold mt-1">{arquivosPendentes}</p>
            </button>
            <button
              onClick={() => setActiveFilter(prev => prev === "ajustado" ? "all" : "ajustado")}
              className={`p-3 rounded-lg border transition-all ${activeFilter === "ajustado" ? "border-green-500 bg-green-500/10" : "border-border hover:border-green-500/50"}`}
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Ajustados</span>
              </div>
              <p className="text-2xl font-bold mt-1">{arquivosAjustados}</p>
            </button>
            <button
              onClick={() => setActiveFilter(prev => prev === "erro" ? "all" : "erro")}
              className={`p-3 rounded-lg border transition-all ${activeFilter === "erro" ? "border-red-500 bg-red-500/10" : "border-border hover:border-red-500/50"}`}
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Erros</span>
              </div>
              <p className="text-2xl font-bold mt-1">{arquivosComErro}</p>
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={activeTab === "arquivos" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("arquivos")}
              >
                <FileText className="w-4 h-4 mr-1" /> Arquivos
              </Button>
              <Button
                variant={activeTab === "erros" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("erros")}
              >
                <AlertTriangle className="w-4 h-4 mr-1" /> Erros ({totalErros})
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="flex border rounded-md">
                <Button variant={viewMode === "lista" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("lista")}>
                  <List className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")}>
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
              <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600">
                <Upload className="w-4 h-4 mr-1" /> Importar SPED
              </Button>
            </div>
          </div>

          {/* Content */}
          {activeTab === "arquivos" && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Arquivo</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Competência</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-center p-3 font-medium">Erros</th>
                    <th className="text-center p-3 font-medium">Ajustes</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredArquivos.map(arquivo => (
                    <tr key={arquivo.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{arquivo.nome}</span>
                            <p className="text-xs text-muted-foreground">{new Date(arquivo.dataUpload).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(arquivo.tipo)}`}>
                          {arquivo.tipo.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{arquivo.competencia}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(arquivo.status)}`}>
                          {arquivo.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={arquivo.erros > 0 ? "text-red-500 font-medium" : "text-green-500"}>{arquivo.erros}</span>
                      </td>
                      <td className="p-3 text-center font-medium">{arquivo.ajustes}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Play className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "erros" && (
            <div className="space-y-3">
              {arquivos.filter(a => a.erros > 0).map(arquivo => (
                <div key={arquivo.id} className="border border-red-500/30 rounded-lg p-4 bg-red-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileWarning className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium">{arquivo.nome}</p>
                        <p className="text-xs text-muted-foreground">{arquivo.tipo} • {arquivo.competencia}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-500/20 text-red-500">
                      {arquivo.erros} erros
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}