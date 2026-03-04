import { useState, useCallback, useMemo } from "react";
import { 
  Receipt, Upload, FileText, Loader2, Trash2, Building2, Wrench, 
  AlertCircle, ArrowLeft, BarChart3, Table, Download, Package, Calendar, Shield
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { detectAndParseXml, NotaFiscal, NotaServico, NotaComercio } from "@/utils/notaFiscalParser";
import { NotaServicoCard } from "./fiscal/NotaServicoCard";
import { NotaComercioCard } from "./fiscal/NotaComercioCard";
import { FiscalRelatorioServico } from "./fiscal/FiscalRelatorioServico";
import { FiscalEmpresaCompetencia } from "./fiscal/FiscalEmpresaCompetencia";
import { formatCnpj } from "@/utils/cnpjUtils";
import type { EmpresaExterna } from "@/hooks/useEmpresasExternas";

type Segmento = "servico" | "comercio" | null;
type ViewMode = "cards" | "relatorio";

interface FiscalContext {
  empresa: EmpresaExterna;
  competencia: { mes: number; ano: number };
}

const MESES_LABELS = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const ConversorFiscal = () => {
  const [segmento, setSegmento] = useState<Segmento>(null);
  const [fiscalCtx, setFiscalCtx] = useState<FiscalContext | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const [notasServico, setNotasServico] = useState<any[]>([]);
  const [notasComercio, setNotasComercio] = useState<NotaComercio[]>([]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (index: number) => setFiles(files.filter((_, i) => i !== index));

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = async () => {
    if (files.length === 0 || !segmento) return;
    setIsProcessing(true);
    setError(null);
    setProcessProgress(0);

    const servicos: any[] = [];
    const comercios: NotaComercio[] = [];
    let errCount = 0;

    // Get empresa regime for validation context
    const regimeEmpresa = fiscalCtx ? fiscalCtx.empresa.regime_tributario : null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessStatus(`Processando ${file.name} (${i + 1}/${files.length})...`);
      setProcessProgress(Math.round(((i) / files.length) * 100));

      try {
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const isXml = file.name.toLowerCase().endsWith('.xml');

        if (isPdf) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('tipo', segmento);

          const { data, error: fnError } = await supabase.functions.invoke('parse-fiscal', {
            body: formData,
          });

          if (fnError || !data?.success) {
            console.error(`Erro ao processar ${file.name}:`, fnError || data?.error);
            errCount++;
            continue;
          }

          if (segmento === 'servico') {
            servicos.push({ ...data.data, _arquivo: file.name, _regime_tomador: regimeEmpresa });
          } else {
            comercios.push(data.data);
          }
        } else if (isXml) {
          const content = await file.text();
          
          if (segmento === 'servico') {
            const { parseNFSeXml } = await import('@/utils/notaFiscalParser');
            const nota = parseNFSeXml(content);
            if (nota) {
              servicos.push({
                numero: nota.numero,
                serie: nota.serie,
                data_emissao: nota.dataEmissao,
                codigo_verificacao: nota.codigoVerificacao,
                prestador: {
                  cnpj: nota.prestador.cnpj,
                  razao_social: nota.prestador.razaoSocial,
                  nome_fantasia: nota.prestador.nomeFantasia,
                  inscricao_municipal: nota.prestador.inscricaoMunicipal,
                  municipio: nota.prestador.municipio,
                  uf: nota.prestador.uf,
                },
                tomador: {
                  cpf_cnpj: nota.tomador.cpfCnpj,
                  razao_social: nota.tomador.razaoSocial,
                  endereco: nota.tomador.endereco,
                  municipio: nota.tomador.municipio,
                  uf: nota.tomador.uf,
                  email: nota.tomador.email,
                },
                servico: {
                  discriminacao: nota.servico.discriminacao,
                  codigo_servico: nota.servico.codigoServico,
                  valor_servicos: parseFloat(nota.servico.valorServicos) || 0,
                  valor_deducoes: parseFloat(nota.servico.valorDeducoes) || 0,
                  base_calculo: parseFloat(nota.servico.baseCalculo) || 0,
                  aliquota_iss: parseFloat(nota.servico.aliquotaISS) || 0,
                  valor_iss: parseFloat(nota.servico.valorISS) || 0,
                  iss_retido: false,
                },
                retencoes: {
                  ir: parseFloat(nota.servico.valorIR) || 0,
                  pis: parseFloat(nota.servico.valorPIS) || 0,
                  cofins: parseFloat(nota.servico.valorCOFINS) || 0,
                  csll: parseFloat(nota.servico.valorCSLL) || 0,
                  inss: parseFloat(nota.servico.valorINSS) || 0,
                  iss: parseFloat(nota.servico.valorISS) || 0,
                },
                valor_liquido: parseFloat(nota.servico.valorLiquido) || 0,
                optante_simples: nota.optanteSimplesNacional === "Sim",
                natureza_operacao: nota.naturezaOperacao,
                _arquivo: file.name,
                _regime_tomador: regimeEmpresa,
              });
            } else {
              errCount++;
            }
          } else {
            const nota = detectAndParseXml(content);
            if (nota && nota.tipo === 'comercio') {
              comercios.push(nota);
            } else {
              errCount++;
            }
          }
        }
      } catch (err) {
        errCount++;
        console.error(`Erro ao processar ${file.name}:`, err);
      }
    }

    setProcessProgress(100);
    setProcessStatus("");

    if (segmento === 'servico') {
      setNotasServico(prev => [...prev, ...servicos]);
    } else {
      setNotasComercio(prev => [...prev, ...comercios]);
    }

    const total = servicos.length + comercios.length;
    if (total > 0) {
      toast.success(`${total} nota(s) processada(s) com sucesso!`);
      setFiles([]);
    }
    if (errCount > 0) toast.warning(`${errCount} arquivo(s) não puderam ser processados.`);
    if (total === 0 && errCount > 0) setError("Nenhum arquivo pôde ser processado. Verifique os arquivos.");

    setIsProcessing(false);
  };

  const clearAll = () => {
    setNotasServico([]);
    setNotasComercio([]);
    setFiles([]);
    setError(null);
    setViewMode("cards");
  };

  const activeNotas = segmento === "servico" ? notasServico : notasComercio;
  const acceptedFiles = segmento === "servico" ? ".pdf,.xml" : ".xml,.pdf";

  // Step 0: Segment selection
  if (!segmento) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--orange))] to-[hsl(var(--yellow))] flex items-center justify-center shadow-[0_0_25px_hsl(var(--orange)/0.4)]">
            <Receipt className="w-5 h-5 text-background" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Arquivos Fiscais</h2>
            <p className="text-xs text-muted-foreground">Leia notas fiscais, extraia dados e gere relatórios</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSegmento("servico")}
            className="glass rounded-2xl p-6 cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none" style={{ background: "hsl(var(--cyan))" }} />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
              <motion.div className="h-full" style={{ background: "linear-gradient(90deg, hsl(var(--cyan)), transparent)" }} initial={{ width: "0%" }} whileInView={{ width: "70%" }} transition={{ duration: 1, delay: 0.3 }} />
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 border transition-all group-hover:scale-110" style={{ backgroundColor: "hsl(var(--cyan) / 0.1)", borderColor: "hsl(var(--cyan) / 0.25)" }}>
                <Building2 className="w-7 h-7" style={{ color: "hsl(var(--cyan))" }} />
              </div>
              <h3 className="text-lg font-bold mb-1">Notas de Serviço</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Importe PDFs ou XMLs de NFS-e. Extraia dados completos de cada nota, 
                retenções (IR, PIS, COFINS, CSLL, INSS, ISS), e gere relatórios com totalização.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(var(--cyan) / 0.3)", color: "hsl(var(--cyan))" }}>PDF</Badge>
                <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(var(--cyan) / 0.3)", color: "hsl(var(--cyan))" }}>XML</Badge>
                <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(var(--cyan) / 0.3)", color: "hsl(var(--cyan))" }}>Retenções</Badge>
                <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(var(--cyan) / 0.3)", color: "hsl(var(--cyan))" }}>Relatórios</Badge>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSegmento("comercio")}
            className="glass rounded-2xl p-6 cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none" style={{ background: "hsl(var(--orange))" }} />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
              <motion.div className="h-full" style={{ background: "linear-gradient(90deg, hsl(var(--orange)), transparent)" }} initial={{ width: "0%" }} whileInView={{ width: "70%" }} transition={{ duration: 1, delay: 0.4 }} />
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 border transition-all group-hover:scale-110" style={{ backgroundColor: "hsl(var(--orange) / 0.1)", borderColor: "hsl(var(--orange) / 0.25)" }}>
                <Package className="w-7 h-7" style={{ color: "hsl(var(--orange))" }} />
              </div>
              <h3 className="text-lg font-bold mb-1">Notas de Comércio</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Importe XMLs ou PDFs de NF-e de mercadorias. Visualize emitente, destinatário, 
                itens, ICMS, IPI, totais e informações complementares.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(var(--orange) / 0.3)", color: "hsl(var(--orange))" }}>XML</Badge>
                <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(var(--orange) / 0.3)", color: "hsl(var(--orange))" }}>PDF</Badge>
                <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(var(--orange) / 0.3)", color: "hsl(var(--orange))" }}>NF-e</Badge>
                <Badge variant="outline" className="text-[9px]" style={{ borderColor: "hsl(var(--orange) / 0.3)", color: "hsl(var(--orange))" }}>Itens</Badge>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Step 1 (serviço only): Empresa + Competência selection
  if (segmento === "servico" && !fiscalCtx) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSegmento(null)} className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" /> Voltar
          </Button>
          <div className="w-px h-5 bg-foreground/10" />
          <div>
            <h2 className="text-sm font-bold">Notas de Serviço — Configuração</h2>
            <p className="text-[10px] text-muted-foreground">Selecione empresa e competência antes de importar</p>
          </div>
        </div>
        <FiscalEmpresaCompetencia onConfirm={(empresa, competencia) => setFiscalCtx({ empresa, competencia })} />
      </div>
    );
  }

  const isServico = segmento === "servico";
  const accentColor = isServico ? "hsl(var(--cyan))" : "hsl(var(--orange))";
  const segLabel = isServico ? "Serviço" : "Comércio";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { 
            if (isServico) { setFiscalCtx(null); } else { setSegmento(null); } 
            clearAll(); 
          }} className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" />
            Voltar
          </Button>
          <div className="w-px h-5 bg-foreground/10" />
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor + "15", border: `1px solid ${accentColor}30` }}>
            {isServico ? <Building2 className="w-4 h-4" style={{ color: accentColor }} /> : <Package className="w-4 h-4" style={{ color: accentColor }} />}
          </div>
          <div>
            <h2 className="text-sm font-bold">Notas de {segLabel}</h2>
            <p className="text-[10px] text-muted-foreground">
              {isServico && fiscalCtx ? (
                <>
                  {fiscalCtx.empresa.nome} · {MESES_LABELS[fiscalCtx.competencia.mes]}/{fiscalCtx.competencia.ano}
                  {fiscalCtx.empresa.regime_tributario && (
                    <> · <Shield className="w-2.5 h-2.5 inline" /> {fiscalCtx.empresa.regime_tributario}</>
                  )}
                </>
              ) : (
                isServico ? "NFS-e — PDF e XML" : "NF-e — XML e PDF"
              )}
            </p>
          </div>
        </div>

        {activeNotas.length > 0 && (
          <div className="flex items-center gap-2">
            {isServico && (
              <div className="glass rounded-lg p-0.5 flex items-center gap-0.5">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === "cards" ? "bg-foreground/10 text-foreground" : "text-muted-foreground"}`}
                >
                  <FileText className="w-3 h-3 inline mr-1" />Cards
                </button>
                <button
                  onClick={() => setViewMode("relatorio")}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === "relatorio" ? "bg-foreground/10 text-foreground" : "text-muted-foreground"}`}
                >
                  <BarChart3 className="w-3 h-3 inline mr-1" />Relatório
                </button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground h-7 gap-1">
              <Trash2 className="w-3 h-3" /> Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div className="glass rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: accentColor.replace(')', ' / 0.08)') }} />
        
        <div className="relative z-10 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
              isDragging ? `scale-[1.01]` : "border-foreground/10 hover:bg-foreground/[0.02]"
            }`}
            style={isDragging ? { backgroundColor: accentColor.replace(')', ' / 0.1)'), borderColor: accentColor.replace(')', ' / 0.5)') } : undefined}
            onClick={() => document.getElementById("file-input-fiscal")?.click()}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? "" : "text-muted-foreground"}`} style={isDragging ? { color: accentColor } : undefined} />
            <p className="text-sm text-muted-foreground mb-1">
              {isDragging ? "Solte os arquivos aqui..." : "Arraste arquivos ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {isServico ? "PDF e XML de NFS-e (Notas de Serviço)" : "XML e PDF de NF-e (Notas de Comércio)"}
            </p>
            <input id="file-input-fiscal" type="file" multiple accept={acceptedFiles} className="hidden" onChange={handleFileSelect} />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{files.length} arquivo(s)</p>
              <ScrollArea className="max-h-28">
                <div className="space-y-1">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-foreground/[0.03] border border-foreground/5 text-sm">
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate">{file.name}</span>
                        <Badge variant="outline" className="text-[9px] shrink-0">{formatFileSize(file.size)}</Badge>
                        <Badge variant="outline" className="text-[9px] shrink-0" style={{ borderColor: accentColor + "40", color: accentColor }}>
                          {file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'XML'}
                        </Badge>
                      </div>
                      <button onClick={() => removeFile(index)} className="p-1 rounded hover:bg-destructive/10 text-destructive shrink-0 ml-2">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={processProgress} className="h-2" />
              <p className="text-[11px] text-muted-foreground text-center">{processStatus}</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={processFiles}
            disabled={files.length === 0 || isProcessing}
            className="w-full text-background hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor.replace(')', ' / 0.8)')})` }}
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
            ) : (
              <><Wrench className="w-4 h-4 mr-2" /> Processar {files.length > 0 ? `(${files.length})` : ""}</>
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {activeNotas.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {isServico && viewMode === "relatorio" ? (
              <FiscalRelatorioServico notas={notasServico} empresaRegime={fiscalCtx?.empresa?.regime_tributario} />
            ) : isServico ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">{notasServico.length} nota(s) de serviço</p>
                {notasServico.map((nota, i) => (
                  <NotaServicoCardFromData key={i} nota={nota} index={i} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">{notasComercio.length} nota(s) de comércio</p>
                {notasComercio.map((nota, i) => (
                  <NotaComercioCard key={i} nota={nota} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

// Card for service note from edge function data
function NotaServicoCardFromData({ nota, index }: { nota: any; index: number }) {
  const accentColor = "hsl(var(--cyan))";
  const fv = (v: number | string) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (!n || isNaN(n)) return "R$ 0,00";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const retTotal = (nota.retencoes?.ir || 0) + (nota.retencoes?.pis || 0) + 
    (nota.retencoes?.cofins || 0) + (nota.retencoes?.csll || 0) + 
    (nota.retencoes?.inss || 0) + (nota.retencoes?.iss || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass rounded-2xl overflow-hidden group relative"
    >
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none" style={{ background: accentColor }} />

      <div className="p-5 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor + "15", border: `1px solid ${accentColor}30` }}>
              <FileText className="w-4 h-4" style={{ color: accentColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">NFS-e Nº {nota.numero || "—"}</h3>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderColor: accentColor + "40", color: accentColor }}>
                  Serviço
                </Badge>
                {nota.optante_simples && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-yellow-500/40 text-yellow-500">
                    <Shield className="w-2.5 h-2.5 mr-0.5" /> Simples
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {nota.data_emissao || "—"} · Série {nota.serie || "U"}
                {nota.codigo_verificacao && ` · Cód: ${nota.codigo_verificacao}`}
              </p>
            </div>
          </div>
          {nota._arquivo && (
            <Badge variant="outline" className="text-[9px]">{nota._arquivo}</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold mb-1.5" style={{ color: accentColor }}>▸ Prestador</p>
            <div className="space-y-0.5 text-[11px]">
              <p className="font-medium">{nota.prestador?.razao_social || "—"}</p>
              <p className="text-muted-foreground font-mono">{nota.prestador?.cnpj || "—"}</p>
              {nota.prestador?.municipio && <p className="text-muted-foreground">{nota.prestador.municipio}/{nota.prestador.uf}</p>}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold mb-1.5" style={{ color: "hsl(var(--blue))" }}>▸ Tomador</p>
            <div className="space-y-0.5 text-[11px]">
              <p className="font-medium">{nota.tomador?.razao_social || "—"}</p>
              <p className="text-muted-foreground font-mono">{nota.tomador?.cpf_cnpj || "—"}</p>
              {nota.tomador?.municipio && <p className="text-muted-foreground">{nota.tomador.municipio}/{nota.tomador.uf}</p>}
            </div>
          </div>
        </div>

        {nota.servico?.discriminacao && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--orange))" }}>▸ Serviço</p>
            <div className="p-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/5 text-[11px] leading-relaxed max-h-20 overflow-y-auto whitespace-pre-wrap">
              {nota.servico.discriminacao}
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/5 text-center">
            <p className="text-[9px] text-muted-foreground mb-0.5">Valor Serviços</p>
            <p className="text-xs font-bold font-mono">{fv(nota.servico?.valor_servicos)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/5 text-center">
            <p className="text-[9px] text-muted-foreground mb-0.5">ISS ({nota.servico?.aliquota_iss || 0}%)</p>
            <p className="text-xs font-bold font-mono">{fv(nota.servico?.valor_iss)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/5 text-center">
            <p className="text-[9px] text-muted-foreground mb-0.5">Retenções</p>
            <p className="text-xs font-bold font-mono text-destructive">{fv(retTotal)}</p>
          </div>
          <div className="p-2.5 rounded-xl border text-center" style={{ backgroundColor: accentColor + "08", borderColor: accentColor + "20" }}>
            <p className="text-[9px] text-muted-foreground mb-0.5">Valor Líquido</p>
            <p className="text-sm font-bold font-mono" style={{ color: accentColor }}>{fv(nota.valor_liquido || nota.servico?.valor_servicos)}</p>
          </div>
        </div>

        {retTotal > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
            {nota.retencoes?.ir > 0 && <Badge variant="outline" className="text-[9px] font-mono">IR: {fv(nota.retencoes.ir)}</Badge>}
            {nota.retencoes?.pis > 0 && <Badge variant="outline" className="text-[9px] font-mono">PIS: {fv(nota.retencoes.pis)}</Badge>}
            {nota.retencoes?.cofins > 0 && <Badge variant="outline" className="text-[9px] font-mono">COFINS: {fv(nota.retencoes.cofins)}</Badge>}
            {nota.retencoes?.csll > 0 && <Badge variant="outline" className="text-[9px] font-mono">CSLL: {fv(nota.retencoes.csll)}</Badge>}
            {nota.retencoes?.inss > 0 && <Badge variant="outline" className="text-[9px] font-mono">INSS: {fv(nota.retencoes.inss)}</Badge>}
            {nota.retencoes?.iss > 0 && <Badge variant="outline" className="text-[9px] font-mono">ISS: {fv(nota.retencoes.iss)}</Badge>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
