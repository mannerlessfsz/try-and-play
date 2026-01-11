import { useState, useRef } from "react";
import { 
  FileText, Upload, Download, Play, Eye,
  CheckCircle, AlertTriangle, Clock, XCircle, 
  CheckSquare, FileWarning, Trash2, Zap,
  List, LayoutGrid, Settings2, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  processarSpedComAjustes, 
  parseAjustesFromCsv, 
  type AjusteData, 
  type ProcessamentoResultado 
} from "@/utils/spedAjusteProcessor";

interface ArquivoSped {
  id: string;
  nome: string;
  tipo: "EFD_ICMS" | "EFD_CONTRIB" | "ECF" | "ECD";
  competencia: string;
  status: "pendente" | "processando" | "ajustado" | "erro";
  erros: number;
  ajustes: number;
  dataUpload: string;
  conteudo?: string;
  resultado?: ProcessamentoResultado;
}

type FilterType = "all" | "pendente" | "ajustado" | "erro";

export function AjustaSpedTab() {
  const [activeTab, setActiveTab] = useState<"arquivos" | "erros" | "config">("arquivos");
  const [viewMode, setViewMode] = useState<"lista" | "grid">("lista");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  
  // Configurações do processamento
  const [gerarAmbosC197, setGerarAmbosC197] = useState(true);
  
  // Dados carregados
  const [arquivoSped, setArquivoSped] = useState<{ nome: string; conteudo: string } | null>(null);
  const [ajustes, setAjustes] = useState<AjusteData[]>([]);
  const [resultado, setResultado] = useState<ProcessamentoResultado | null>(null);
  const [processando, setProcessando] = useState(false);

  const spedInputRef = useRef<HTMLInputElement>(null);
  const ajustesInputRef = useRef<HTMLInputElement>(null);

  const [arquivos, setArquivos] = useState<ArquivoSped[]>([
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

  // Handler para carregar arquivo SPED
  const handleSpedUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setArquivoSped({ nome: file.name, conteudo: content });
      toast.success(`Arquivo SPED carregado: ${file.name}`);
    } catch (err) {
      toast.error("Erro ao ler arquivo SPED");
      console.error(err);
    }
  };

  // Handler para carregar planilha de ajustes (CSV)
  const handleAjustesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = parseAjustesFromCsv(content);
      setAjustes(parsed);
      toast.success(`Planilha carregada: ${parsed.length} ajustes encontrados`);
    } catch (err) {
      toast.error("Erro ao ler planilha de ajustes");
      console.error(err);
    }
  };

  // Processar SPED com ajustes
  const handleProcessar = async () => {
    if (!arquivoSped) {
      toast.error("Carregue um arquivo SPED primeiro");
      return;
    }
    if (ajustes.length === 0) {
      toast.error("Carregue a planilha de ajustes");
      return;
    }

    setProcessando(true);
    try {
      const res = processarSpedComAjustes(arquivoSped.conteudo, ajustes, { gerarAmbosC197 });
      setResultado(res);

      // Adiciona à lista de arquivos
      const novoArquivo: ArquivoSped = {
        id: crypto.randomUUID(),
        nome: arquivoSped.nome.replace('.txt', '_ajustado.txt'),
        tipo: "EFD_ICMS",
        competencia: new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
        status: res.sucesso ? "ajustado" : "erro",
        erros: res.erros.length,
        ajustes: res.notasProcessadas,
        dataUpload: new Date().toISOString().split('T')[0],
        conteudo: res.conteudoAjustado,
        resultado: res
      };
      setArquivos(prev => [novoArquivo, ...prev]);

      if (res.sucesso) {
        toast.success(`Processamento concluído: ${res.notasProcessadas} notas ajustadas`);
      } else {
        toast.warning(`Processamento com erros: ${res.erros.length} erros`);
      }
    } catch (err) {
      toast.error("Erro no processamento");
      console.error(err);
    } finally {
      setProcessando(false);
    }
  };

  // Baixar arquivo ajustado
  const handleDownload = (arquivo: ArquivoSped) => {
    if (!arquivo.conteudo) {
      toast.error("Arquivo não possui conteúdo para download");
      return;
    }

    const blob = new Blob([arquivo.conteudo], { type: 'text/plain;charset=ISO-8859-1' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = arquivo.nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download iniciado");
  };

  // Remover arquivo
  const handleRemover = (id: string) => {
    setArquivos(prev => prev.filter(a => a.id !== id));
    toast.success("Arquivo removido");
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
            Processa arquivos SPED aplicando ajustes de C110, C112, C113, C195 e C197 (ICMS Próprio/ST).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Área de Upload e Configuração */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
            {/* Upload SPED */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" /> Arquivo SPED (.txt)
              </Label>
              <input
                ref={spedInputRef}
                type="file"
                accept=".txt"
                onChange={handleSpedUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => spedInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {arquivoSped ? arquivoSped.nome : "Selecionar SPED..."}
              </Button>
              {arquivoSped && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Arquivo carregado
                </p>
              )}
            </div>

            {/* Upload Planilha Ajustes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Planilha Ajustes (.csv)
              </Label>
              <input
                ref={ajustesInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleAjustesUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => ajustesInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {ajustes.length > 0 ? `${ajustes.length} ajustes` : "Selecionar planilha..."}
              </Button>
              {ajustes.length > 0 && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {ajustes.length} NFs para ajustar
                </p>
              )}
            </div>

            {/* Configuração e Processar */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Configuração C197
              </Label>
              <div className="flex items-center justify-between p-2 border rounded-md bg-background">
                <span className="text-sm">Gerar ambos C197</span>
                <Switch
                  checked={gerarAmbosC197}
                  onCheckedChange={setGerarAmbosC197}
                />
              </div>
              <Button 
                className="w-full bg-cyan-500 hover:bg-cyan-600"
                onClick={handleProcessar}
                disabled={processando || !arquivoSped || ajustes.length === 0}
              >
                {processando ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> Processar SPED
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Resultado do último processamento */}
          {resultado && (
            <div className={`p-4 rounded-lg border ${resultado.sucesso ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {resultado.sucesso ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {resultado.sucesso ? 'Processamento concluído' : 'Processamento com erros'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {resultado.notasProcessadas} notas fiscais ajustadas
                    </p>
                  </div>
                </div>
                {resultado.erros.length > 0 && (
                  <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-500/20 text-red-500">
                    {resultado.erros.length} erros
                  </span>
                )}
              </div>
              {resultado.erros.length > 0 && (
                <div className="mt-3 text-sm text-red-400">
                  {resultado.erros.slice(0, 5).map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                  {resultado.erros.length > 5 && (
                    <p className="text-muted-foreground">...e mais {resultado.erros.length - 5} erros</p>
                  )}
                </div>
              )}
            </div>
          )}

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
                          {arquivo.conteudo && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleDownload(arquivo)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleRemover(arquivo.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
                  {arquivo.resultado?.erros && arquivo.resultado.erros.length > 0 && (
                    <div className="mt-3 text-sm text-red-400 border-t border-red-500/20 pt-3">
                      {arquivo.resultado.erros.map((err, i) => (
                        <p key={i}>• {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
