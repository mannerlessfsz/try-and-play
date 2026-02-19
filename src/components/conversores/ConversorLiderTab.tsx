import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Crown, FileText, Upload, Download, 
  CheckCircle, AlertTriangle, Eye, Trash2,
  FileSpreadsheet, Loader2, History, RefreshCw,
  Check, Edit3, Save, X, ChevronRight, ChevronLeft, Filter, Plus, Ban, Building2, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  transformarLancamentos, 
  gerarCSV, 
  gerarTXT, 
  readFileAsText,
  extrairFornecedor,
  type OutputRow,
  type TransformResult 
} from "@/utils/liderLancamentosParser";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useConversoes, type ConversaoArquivo } from "@/hooks/useConversoes";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRegrasExclusaoLider, type RegraExclusaoLider, type TipoRegra } from "@/hooks/useRegrasExclusaoLider";
import { EmpresaExternaSelector } from "./EmpresaExternaSelector";
import { EmpresaExterna, usePlanosContasExternos } from "@/hooks/useEmpresasExternas";
import {
  parsePlanoContasFromCsvFile,
  parsePlanoContasFromExcelFile,
  type PlanoContasItem,
} from "@/utils/planoContasParser";
import { ContaSearchInput } from "./ContaSearchInput";
import { verificarInconsistenciaFornecedor } from "@/utils/fornecedorMatcher";

interface ArquivoProcessadoLocal {
  id: string;
  nome: string;
  status: "processando" | "sucesso" | "erro";
  resultado?: TransformResult;
  dataProcessamento: string;
  conversaoId?: string;
}

// Lançamento editável com confirmação
interface LancamentoEditavel extends OutputRow {
  id: string;
  confirmado: boolean;
  temErro: boolean;
  erroOriginal?: string;
  casaComRegra: boolean; // true = vai para etapa exclusões
  regraMatchId?: string; // id da regra que casou
  marcadoExclusao?: boolean; // true = será excluído do arquivo final
  alteradoPorRegra?: boolean; // true = sofreu alteração por regra de alteração
  regraAlteracaoDescricao?: string; // descrição da regra que alterou
  inconsistenciaFornecedor?: boolean; // true = conta débito diverge do fornecedor no plano
  fornecedorNome?: string; // nome do fornecedor extraído do histórico
  contaEsperadaPlano?: string; // código da conta esperada (do plano)
  descricaoEsperadaPlano?: string; // descrição da conta no plano
}

type FluxoStep = "empresa" | "plano" | "regras" | "importar" | "revisar" | "corrigir" | "exclusoes" | "exportar";

// Sub-component for inline rule editing
function RegraEditForm({
  values,
  onChange,
  tipo,
  onSave,
  onCancel,
  planoContas,
}: {
  values: { contaDebito: string; contaCredito: string; descricao: string; historicoBusca: string; novoDebito: string; novoCredito: string };
  onChange: (v: typeof values) => void;
  tipo: TipoRegra;
  onSave: () => void;
  onCancel: () => void;
  planoContas: PlanoContasItem[];
}) {
  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex items-center gap-2">
        <ContaSearchInput value={values.contaDebito} onChange={(v) => onChange({ ...values, contaDebito: v })} planoContas={planoContas} placeholder="Débito" className="w-24" />
        <ContaSearchInput value={values.contaCredito} onChange={(v) => onChange({ ...values, contaCredito: v })} planoContas={planoContas} placeholder="Crédito" className="w-24" />
        <Input value={values.historicoBusca} onChange={(e) => onChange({ ...values, historicoBusca: e.target.value })} placeholder="Histórico" className="w-36" />
        <Input value={values.descricao} onChange={(e) => onChange({ ...values, descricao: e.target.value })} placeholder="Descrição" className="flex-1" />
      </div>
      {tipo === "alteracao" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Altera para →</span>
          <ContaSearchInput value={values.novoDebito} onChange={(v) => onChange({ ...values, novoDebito: v })} planoContas={planoContas} placeholder="Novo Débito" className="w-28" />
          <ContaSearchInput value={values.novoCredito} onChange={(v) => onChange({ ...values, novoCredito: v })} planoContas={planoContas} placeholder="Novo Crédito" className="w-28" />
        </div>
      )}
      <div className="flex items-center gap-1 justify-end">
        <Button variant="ghost" size="sm" className="text-green-500" onClick={onSave}>
          <Save className="w-4 h-4 mr-1" /> Salvar
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
      </div>
    </div>
  );
}

export function ConversorLiderTab() {
  const { toast } = useToast();
  const { empresaAtiva } = useEmpresaAtiva();
  const { 
    conversoes, 
    isLoading: isLoadingConversoes, 
    criarConversao, 
    atualizarConversao, 
    deletarConversao,
    getDownloadUrl,
    refetch 
  } = useConversoes("lider");

  // Estado da empresa externa selecionada
  const [empresaExternaId, setEmpresaExternaId] = useState<string | undefined>();
  const [empresaExternaSelecionada, setEmpresaExternaSelecionada] = useState<EmpresaExterna | undefined>();

  // Plano de contas persistente por empresa externa
  const { planosContas: planosContasExternos, uploadPlanoContas, getLatestPlano, downloadPlanoFile } = usePlanosContasExternos(empresaExternaId);
  const [planoContas, setPlanoContas] = useState<PlanoContasItem[]>([]);
  const [planoContasArquivo, setPlanoContasArquivo] = useState<string | null>(null);
  const [loadingPlano, setLoadingPlano] = useState(false);
  const [buscaPlano, setBuscaPlano] = useState("");
  const [paginaPlano, setPaginaPlano] = useState(1);
  const planoInputRef = useRef<HTMLInputElement>(null);
  const PLANO_PAGE_SIZE = 100;

  // Hook de regras persistentes
  const { 
    regras: regrasExclusao, 
    regrasRevisao,
    regrasAlteracao,
    isLoading: isLoadingRegras,
    criarRegra, 
    atualizarRegra, 
    deletarRegra 
  } = useRegrasExclusaoLider(empresaExternaId);

  // Estado do fluxo
  const [currentStep, setCurrentStep] = useState<FluxoStep>("empresa");
  const [arquivoAtual, setArquivoAtual] = useState<ArquivoProcessadoLocal | null>(null);
  const [lancamentosEditaveis, setLancamentosEditaveis] = useState<LancamentoEditavel[]>([]);
  const [todosConfirmados, setTodosConfirmados] = useState(false);
  const [errosCorrigidos, setErrosCorrigidos] = useState(false);

  // Estado para nova regra e edição
  const [novaRegraTipo, setNovaRegraTipo] = useState<TipoRegra>("revisao");
  const [novaRegra, setNovaRegra] = useState({ contaDebito: "", contaCredito: "", descricao: "", historicoBusca: "", novoDebito: "", novoCredito: "" });
  const [editandoRegraId, setEditandoRegraId] = useState<string | null>(null);
  const [editRegraValues, setEditRegraValues] = useState({ contaDebito: "", contaCredito: "", descricao: "", historicoBusca: "", novoDebito: "", novoCredito: "" });

  // Estados existentes
  const [arquivosLocais, setArquivosLocais] = useState<ArquivoProcessadoLocal[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoExportacao, setTipoExportacao] = useState<string>("csv");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewConversao, setPreviewConversao] = useState<ConversaoArquivo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<OutputRow>>({});
  const [codigoEmpresa, setCodigoEmpresa] = useState<string>("");
  const [paginaRevisar, setPaginaRevisar] = useState(1);
  const [filtroRevisar, setFiltroRevisar] = useState<"todos" | "alterados" | "normais">("todos");
  const [paginaExportar, setPaginaExportar] = useState(1);
  const [paginaExclusao, setPaginaExclusao] = useState(1);
  const EXCLUSAO_PAGE_SIZE = 100;

  // Auto-popular código da empresa quando empresa externa for selecionada
  useEffect(() => {
    if (empresaExternaSelecionada) {
      setCodigoEmpresa(empresaExternaSelecionada.codigo_empresa);
    }
  }, [empresaExternaSelecionada]);

  // Handler para seleção de empresa externa
  const handleEmpresaExternaChange = (empresaId: string | undefined, empresa?: EmpresaExterna) => {
    setEmpresaExternaId(empresaId);
    setEmpresaExternaSelecionada(empresa);
    // Reset plano when empresa changes
    setPlanoContas([]);
    setPlanoContasArquivo(null);
    setBuscaPlano("");
    setPaginaPlano(1);
  };

  // Carregar plano de contas persistente quando empresa é selecionada
  useEffect(() => {
    if (!empresaExternaId) return;
    let cancelled = false;
    const loadPlano = async () => {
      setLoadingPlano(true);
      try {
        const latest = await getLatestPlano(empresaExternaId);
        if (cancelled) return;
        if (latest && latest.storage_path) {
          setPlanoContasArquivo(latest.nome_arquivo);
          // Download and parse the file
          const blob = await downloadPlanoFile(latest.storage_path);
          if (cancelled || !blob) return;
          const file = new File([blob], latest.nome_arquivo);
          const ext = latest.nome_arquivo.split(".").pop()?.toLowerCase();
          let items: PlanoContasItem[];
          if (ext === "xls" || ext === "xlsx") {
            items = await parsePlanoContasFromExcelFile(file);
          } else {
            items = await parsePlanoContasFromCsvFile(file);
          }
          if (!cancelled) setPlanoContas(items);
        }
      } catch (err) {
        console.error("Erro ao carregar plano:", err);
      } finally {
        if (!cancelled) setLoadingPlano(false);
      }
    };
    loadPlano();
    return () => { cancelled = true; };
  }, [empresaExternaId]);

  // Upload de novo plano de contas
  const handlePlanoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaExternaId) return;
    setLoadingPlano(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let items: PlanoContasItem[];
      if (ext === "xls" || ext === "xlsx") {
        items = await parsePlanoContasFromExcelFile(file);
      } else if (ext === "csv") {
        items = await parsePlanoContasFromCsvFile(file);
      } else {
        throw new Error("Formato não suportado. Use XLS, XLSX ou CSV.");
      }
      if (!items || items.length === 0) throw new Error("Nenhuma conta encontrada no arquivo.");

      await uploadPlanoContas.mutateAsync({
        empresaExternaId,
        file,
        metadados: { totalContas: items.length },
      });

      setPlanoContas(items);
      setPlanoContasArquivo(file.name);
      setPaginaPlano(1);
      setBuscaPlano("");
      toast({ title: "Plano de contas carregado", description: `${items.length} contas importadas.` });
    } catch (err) {
      toast({ title: "Erro ao processar plano", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setLoadingPlano(false);
      if (planoInputRef.current) planoInputRef.current.value = "";
    }
  };

  // Memo para filtro e paginação do plano
  const planoFiltrado = useMemo(() => {
    if (!buscaPlano.trim()) return planoContas;
    const termo = buscaPlano.toLowerCase();
    return planoContas.filter(c =>
      c.descricao.toLowerCase().includes(termo) ||
      c.codigo.toLowerCase().includes(termo) ||
      c.classificacao.toLowerCase().includes(termo)
    );
  }, [planoContas, buscaPlano]);

  const planoTotalPaginas = Math.ceil(planoFiltrado.length / PLANO_PAGE_SIZE);
  const planoPaginado = useMemo(() => {
    const inicio = (paginaPlano - 1) * PLANO_PAGE_SIZE;
    return planoFiltrado.slice(inicio, inicio + PLANO_PAGE_SIZE);
  }, [planoFiltrado, paginaPlano]);

  // Calcula se todos foram confirmados e erros corrigidos
  // Considera apenas lançamentos que não casam com regra (esses vão para exclusões)
  useEffect(() => {
    const semErroESemRegra = lancamentosEditaveis.filter(l => !l.temErro && !l.casaComRegra);
    const confirmados = semErroESemRegra.every(l => l.confirmado);
    setTodosConfirmados(semErroESemRegra.length > 0 && confirmados);
    
    const comErro = lancamentosEditaveis.filter(l => l.temErro);
    const corrigidos = comErro.every(l => 
      l.contaDebito && l.contaCredito && l.valor && l.historico
    );
    setErrosCorrigidos(comErro.length === 0 || corrigidos);
  }, [lancamentosEditaveis]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.txt')) {
        setSelectedFile(file);
      } else {
        toast({ 
          title: "Formato inválido", 
          description: "Por favor, selecione um arquivo TXT.",
          variant: "destructive" 
        });
      }
    }
  };

  const processarArquivo = async (file: File) => {
    const arquivoId = Date.now().toString();
    
    const novoArquivo: ArquivoProcessadoLocal = {
      id: arquivoId,
      nome: file.name,
      status: "processando",
      dataProcessamento: new Date().toISOString()
    };
    
    setArquivoAtual(novoArquivo);
    setIsProcessing(true);

    try {
      const content = await readFileAsText(file);
      
      // Criar registro no banco apenas se houver empresa ativa
      let conversaoId: string | undefined;
      if (empresaAtiva?.id) {
        const conversao = await criarConversao.mutateAsync({
          modulo: "lider",
          nomeArquivoOriginal: file.name,
          conteudoOriginal: content,
        });
        conversaoId = conversao.id;
      }

      const resultado = transformarLancamentos(content);
      
      // Função auxiliar para verificar se lançamento casa com regra
      // Importante: o arquivo sempre traz conta débito/crédito com 7 dígitos (com zeros à esquerda).
      // Ex.: conta "1" no arquivo vem como "0000001".
      // Então, para o usuário poder cadastrar regra como "1" e isso significar "0000001",
      // nós normalizamos a REGRA para 7 dígitos (padStart) e comparamos usando a representação do arquivo.
      const normalizarConta7 = (conta: string) => (conta || "").trim();

      const normalizarRegra7 = (regra: string) => {
        const digits = (regra || "").trim().replace(/\D/g, "");
        if (!digits) return "";
        if (digits.length >= 7) return digits.slice(0, 7);
        return digits.padStart(7, "0");
      };

      const verificarRegraMatch = (
        contaDebito: string,
        contaCredito: string
      ): { casa: boolean; regraId?: string } => {
        const deb = normalizarConta7(contaDebito);
        const cred = normalizarConta7(contaCredito);

        for (const regra of regrasRevisao) {
          const regraDeb7 = normalizarRegra7(regra.conta_debito || "");
          const regraCred7 = normalizarRegra7(regra.conta_credito || "");

          const matchDebito = !regraDeb7 || deb.startsWith(regraDeb7);
          const matchCredito = !regraCred7 || cred.startsWith(regraCred7);

          // Se a regra tem débito + crédito, exige ambos. Caso contrário, basta um dos lados.
          if (regraDeb7 && regraCred7) {
            if (matchDebito && matchCredito) return { casa: true, regraId: regra.id };
          } else {
            if ((regraDeb7 && matchDebito) || (regraCred7 && matchCredito)) {
              return { casa: true, regraId: regra.id };
            }
          }
        }

        return { casa: false };
      };
      
      // Função auxiliar para aplicar regras de alteração
      const aplicarRegraAlteracao = (
        contaDebito: string,
        contaCredito: string,
        historico: string
      ): { alterado: boolean; novoDebito?: string; novoCredito?: string; descricaoRegra?: string } => {
        const deb = normalizarConta7(contaDebito);
        const cred = normalizarConta7(contaCredito);
        const hist = (historico || "").toUpperCase();

        for (const regra of regrasAlteracao) {
          const regraDeb7 = normalizarRegra7(regra.conta_debito || "");
          const regraCred7 = normalizarRegra7(regra.conta_credito || "");
          const regraHist = (regra.historico_busca || "").toUpperCase().trim();

          const matchDebito = !regraDeb7 || deb.startsWith(regraDeb7);
          const matchCredito = !regraCred7 || cred.startsWith(regraCred7);
          const matchHistorico = !regraHist || hist.includes(regraHist);

          // Regra de alteração exige todos os critérios preenchidos
          let match = false;
          if (regraDeb7 && regraCred7 && regraHist) {
            match = matchDebito && matchCredito && matchHistorico;
          } else if (regraDeb7 && regraCred7) {
            match = matchDebito && matchCredito;
          } else if (regraHist) {
            const hasContaMatch = (regraDeb7 && matchDebito) || (regraCred7 && matchCredito);
            match = matchHistorico && (hasContaMatch || (!regraDeb7 && !regraCred7));
          } else {
            match = (regraDeb7 && matchDebito) || (regraCred7 && matchCredito);
          }

          if (match) {
            return {
              alterado: true,
              novoDebito: regra.novo_debito || undefined,
              novoCredito: regra.novo_credito || undefined,
              descricaoRegra: regra.descricao || "Regra de alteração",
            };
          }
        }
        return { alterado: false };
      };

      // Criar lançamentos editáveis - separando por tipo
      const lancamentos: LancamentoEditavel[] = resultado.outputRows.map((row, idx) => {
        const temErro = row.requerRevisao === true;

        // Regras devem considerar as contas do arquivo (0300). Em linhas transformadas,
        // às vezes um dos lados é zerado no output (ex.: crédito em PAGTO/TARIFA).
        // Então usamos o valor do output quando existir, senão usamos o valor original.
        const debParaRegra = row.contaDebito || row.contaDebitoOriginal || "";
        const credParaRegra = row.contaCredito || row.contaCreditoOriginal || "";

        const regraMatch = !temErro ? verificarRegraMatch(debParaRegra, credParaRegra) : { casa: false };

        // Aplicar regras de alteração (só em lançamentos sem erro e que não casam com regra de revisão)
        let contaDebitoFinal = row.contaDebito;
        let contaCreditoFinal = row.contaCredito;
        let alteradoPorRegra = false;
        let regraAlteracaoDescricao: string | undefined;

        if (!temErro && !regraMatch.casa) {
          const alteracao = aplicarRegraAlteracao(debParaRegra, credParaRegra, row.historico || "");
          if (alteracao.alterado) {
            alteradoPorRegra = true;
            regraAlteracaoDescricao = alteracao.descricaoRegra;
            if (alteracao.novoDebito) {
              contaDebitoFinal = normalizarRegra7(alteracao.novoDebito);
            }
            if (alteracao.novoCredito) {
              contaCreditoFinal = normalizarRegra7(alteracao.novoCredito);
            }
          }
        }

        // Validação de fornecedor × conta débito (só se tem plano e não tem erro/regra)
        let inconsistenciaFornecedor = false;
        let fornecedorNome: string | undefined;
        let contaEsperadaPlano: string | undefined;
        let descricaoEsperadaPlano: string | undefined;

        if (!temErro && !regraMatch.casa && !alteradoPorRegra && planoContas.length > 0) {
          // Só verifica inconsistência para PAGTO, nunca para TARIFA/DESCONTO
          const histUp = (row.historico || "").toUpperCase();
          const isTarifa = histUp.includes("VLR TARIFAS") || histUp.includes("VLR TARIFA") || histUp.includes(" TARIFA ") || histUp.includes(" TARIFAS ");
          const isDesconto = histUp.includes("VLR DESCONTO") || histUp.includes("VALOR DESCONTO") || histUp.includes(" DESCONTO ");
          
          const fornecedor = !isTarifa && !isDesconto ? extrairFornecedor(row.historico || "") : null;
          if (fornecedor) {
            const inconsistencia = verificarInconsistenciaFornecedor(
              contaDebitoFinal || debParaRegra,
              fornecedor,
              planoContas
            );
            if (inconsistencia?.inconsistente) {
              inconsistenciaFornecedor = true;
              fornecedorNome = fornecedor;
              contaEsperadaPlano = inconsistencia.contaEsperada;
              descricaoEsperadaPlano = inconsistencia.descricaoEsperada;
            }
          }
        }

        return {
          ...row,
          contaDebito: contaDebitoFinal,
          contaCredito: contaCreditoFinal,
          id: `${arquivoId}-${idx}`,
          confirmado: false,
          temErro,
          erroOriginal: temErro ? "Registro com prefixo de 44 caracteres (trailer reduzido). Requer revisão manual." : undefined,
          casaComRegra: regraMatch.casa || inconsistenciaFornecedor,
          regraMatchId: regraMatch.regraId,
          marcadoExclusao: regraMatch.casa, // Pré-marca para exclusão APENAS se casa com regra (inconsistências NÃO são pré-marcadas)
          alteradoPorRegra,
          regraAlteracaoDescricao,
          inconsistenciaFornecedor,
          fornecedorNome,
          contaEsperadaPlano,
          descricaoEsperadaPlano,
        };
      });

      // Adicionar linhas de erro do parser como lançamentos editáveis para correção
      if (resultado.erros.length > 0) {
        resultado.erros.forEach((erro, idx) => {
          lancamentos.push({
            id: `${arquivoId}-erro-${idx}`,
            data: "",
            contaDebito: "",
            contaCredito: "",
            valor: "",
            historico: "",
            loteFlag: false,
            confirmado: false,
            temErro: true,
            erroOriginal: erro,
            casaComRegra: false,
          });
        });
      }

      setLancamentosEditaveis(lancamentos);
      
      // Gerar conteúdo convertido
      const conteudoConvertido = tipoExportacao === "csv" 
        ? gerarCSV(resultado.outputRows)
        : gerarTXT(resultado.outputRows);
      
      const nomeConvertido = file.name.replace(/\.[^.]+$/, `_transformado.${tipoExportacao}`);

      // Atualizar registro no banco com o resultado (apenas se persistiu)
      if (conversaoId) {
        await atualizarConversao.mutateAsync({
          id: conversaoId,
          status: resultado.erros.length > 0 ? "erro" : "sucesso",
          totalLinhas: resultado.totalLinhas,
          linhasProcessadas: resultado.outputRows.length,
          linhasErro: resultado.erros.length,
          mensagemErro: resultado.erros.length > 0 ? resultado.erros.join("; ") : undefined,
          metadados: {
            totalLancamentos: resultado.totalLancamentos,
            warnings: resultado.warnings,
            header0100: resultado.header0100,
          },
          conteudoConvertido,
          nomeArquivoConvertido: nomeConvertido,
        });
      }

      const arquivoFinal: ArquivoProcessadoLocal = {
        ...novoArquivo,
        status: "sucesso",
        resultado,
        conversaoId,
      };

      setArquivoAtual(arquivoFinal);
      setArquivosLocais(prev => [...prev, arquivoFinal]);

      // Conta lançamentos por categoria
      const totalErros = lancamentos.filter(l => l.temErro).length;
      const totalParaExclusao = lancamentos.filter(l => l.casaComRegra && !l.temErro && !l.inconsistenciaFornecedor).length;
      const totalInconsistencias = lancamentos.filter(l => l.inconsistenciaFornecedor && !l.temErro).length;
      const totalParaRevisar = lancamentos.filter(l => !l.temErro && !l.casaComRegra).length;

      // Avança para o próximo passo e mostra resumo
      const partes: string[] = [];
      if (totalParaRevisar > 0) partes.push(`${totalParaRevisar} para revisar`);
      if (totalErros > 0) partes.push(`${totalErros} erros`);
      if (totalParaExclusao > 0) partes.push(`${totalParaExclusao} para exclusão`);
      if (totalInconsistencias > 0) partes.push(`${totalInconsistencias} inconsistência(s) fornecedor`);

      if (totalErros > 0 || totalParaExclusao > 0 || totalInconsistencias > 0) {
        toast({ 
          title: "Processamento concluído", 
          description: partes.join(", ") + ".",
        });
      } else {
        toast({ 
          title: "Processamento concluído!", 
          description: `${totalParaRevisar} lançamentos processados. Revise e confirme.`
        });
      }

      // Vai para revisão
      setCurrentStep("revisar");

    } catch (error) {
      setArquivoAtual({
        ...novoArquivo,
        status: "erro",
        resultado: {
          outputRows: [],
          outputLines: [],
          totalLancamentos: 0,
          totalLinhas: 0,
          header0100: null,
          erros: [error instanceof Error ? error.message : "Erro desconhecido ao processar arquivo"],
          warnings: []
        }
      });
      
      toast({ 
        title: "Erro ao processar arquivo", 
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setSelectedFile(null);
      const input = document.getElementById('lider-file') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  const handleProcessar = async () => {
    if (!empresaExternaId || !codigoEmpresa.trim()) {
      toast({ title: "Selecione uma empresa", description: "A empresa externa é obrigatória para prosseguir.", variant: "destructive" });
      return;
    }
    if (!selectedFile) {
      toast({ title: "Selecione um arquivo TXT", variant: "destructive" });
      return;
    }
    await processarArquivo(selectedFile);
  };

  const confirmarTodos = () => {
    // Confirma apenas lançamentos sem erro E que não casam com regra
    setLancamentosEditaveis(prev => 
      prev.map(l => (l.temErro || l.casaComRegra) ? l : { ...l, confirmado: true })
    );
  };

  const toggleConfirmacao = (id: string) => {
    setLancamentosEditaveis(prev => 
      prev.map(l => l.id === id ? { ...l, confirmado: !l.confirmado } : l)
    );
  };

  const startEdit = (lancamento: LancamentoEditavel) => {
    setEditingRowId(lancamento.id);
    setEditValues({
      data: lancamento.data,
      contaDebito: lancamento.contaDebito,
      contaCredito: lancamento.contaCredito,
      valor: lancamento.valor,
      historico: lancamento.historico,
    });
  };

  const saveEdit = (id: string) => {
    setLancamentosEditaveis(prev => 
      prev.map(l => {
        if (l.id === id) {
          const updated = {
            ...l,
            ...editValues,
            temErro: false, // Remove o erro após edição
          };
          return updated;
        }
        return l;
      })
    );
    setEditingRowId(null);
    setEditValues({});
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditValues({});
  };

  const removerLancamentoErro = (id: string) => {
    setLancamentosEditaveis(prev => prev.filter(l => l.id !== id));
  };

  const handleExportar = () => {
    // Exclui lançamentos com erro, lançamentos marcados para exclusão, e lançamentos incompletos
    const lancamentosValidos = lancamentosEditaveis.filter(l => 
      (!l.temErro || (l.data && l.contaDebito && l.contaCredito && l.valor)) && 
      !l.marcadoExclusao
    );
    
    const rows: OutputRow[] = lancamentosValidos.map(l => ({
      data: l.data,
      contaDebito: l.contaDebito,
      contaCredito: l.contaCredito,
      valor: l.valor,
      historico: l.historico,
      loteFlag: l.loteFlag,
    }));

    let content: string;
    let filename: string;
    let mimeType: string;

    if (tipoExportacao === "csv") {
      content = gerarCSV(rows, codigoEmpresa);
      filename = arquivoAtual?.nome.replace(/\.[^.]+$/, '_transformado.csv') || 'transformado.csv';
      mimeType = 'text/csv;charset=utf-8';
    } else {
      content = gerarTXT(rows, codigoEmpresa);
      filename = arquivoAtual?.nome.replace(/\.[^.]+$/, '_transformado.txt') || 'transformado.txt';
      mimeType = 'text/plain;charset=utf-8';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Arquivo exportado!", description: filename });
  };

  const handleDownloadConversao = async (conversao: ConversaoArquivo, tipo: 'original' | 'convertido') => {
    const path = tipo === 'original' 
      ? conversao.arquivo_original_url 
      : conversao.arquivo_convertido_url;
    
    if (!path) {
      toast({ 
        title: "Arquivo não disponível", 
        description: `O arquivo ${tipo} não está disponível para download.`,
        variant: "destructive" 
      });
      return;
    }

    const url = await getDownloadUrl(path);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({ 
        title: "Erro ao gerar download", 
        description: "Não foi possível gerar o link de download.",
        variant: "destructive" 
      });
    }
  };

  const handleRemoverConversao = async (conversao: ConversaoArquivo) => {
    await deletarConversao.mutateAsync(conversao);
  };

  const resetarFluxo = () => {
    setCurrentStep("empresa");
    setArquivoAtual(null);
    setLancamentosEditaveis([]);
    setTodosConfirmados(false);
    setErrosCorrigidos(false);
    setCodigoEmpresa("");
    setEmpresaExternaId(undefined);
    setEmpresaExternaSelecionada(undefined);
    setPlanoContas([]);
    setPlanoContasArquivo(null);
    setBuscaPlano("");
    setPaginaPlano(1);
  };

  // Funções para gerenciar regras de exclusão
  const adicionarRegra = async () => {
    if (novaRegraTipo === "revisao") {
      if (!novaRegra.contaDebito.trim() && !novaRegra.contaCredito.trim() && !novaRegra.historicoBusca.trim()) {
        toast({ title: "Informe ao menos um critério", description: "Preencha conta débito, crédito ou descrição.", variant: "destructive" });
        return;
      }
    } else {
      // alteracao: precisa de critérios de busca E o que alterar
      const temCriterioBusca = novaRegra.contaDebito.trim() || novaRegra.contaCredito.trim();
      const temHistorico = novaRegra.historicoBusca.trim();
      const temAlteracao = novaRegra.novoDebito.trim() || novaRegra.novoCredito.trim();
      if ((!temCriterioBusca || !temHistorico) && !temAlteracao) {
        toast({ title: "Dados insuficientes", description: "Para alteração, informe débito e/ou crédito + histórico, e o que será alterado.", variant: "destructive" });
        return;
      }
    }
    if (!empresaExternaId) {
      toast({ title: "Nenhuma empresa selecionada", description: "Selecione uma empresa externa no primeiro passo.", variant: "destructive" });
      return;
    }
    try {
      await criarRegra.mutateAsync({
        tipo: novaRegraTipo,
        conta_debito: novaRegra.contaDebito.trim(),
        conta_credito: novaRegra.contaCredito.trim(),
        descricao: novaRegra.descricao.trim() || `Regra ${regrasExclusao.length + 1}`,
        historico_busca: novaRegra.historicoBusca.trim(),
        novo_debito: novaRegra.novoDebito.trim(),
        novo_credito: novaRegra.novoCredito.trim(),
      });
      setNovaRegra({ contaDebito: "", contaCredito: "", descricao: "", historicoBusca: "", novoDebito: "", novoCredito: "" });
    } catch (error) {
      console.error("Erro ao criar regra:", error);
    }
  };

  const removerRegra = async (id: string) => {
    await deletarRegra.mutateAsync(id);
  };

  const iniciarEdicaoRegra = (regra: RegraExclusaoLider) => {
    setEditandoRegraId(regra.id);
    setEditRegraValues({
      contaDebito: regra.conta_debito,
      contaCredito: regra.conta_credito,
      descricao: regra.descricao,
      historicoBusca: regra.historico_busca || "",
      novoDebito: regra.novo_debito || "",
      novoCredito: regra.novo_credito || "",
    });
  };

  const salvarEdicaoRegra = async () => {
    if (!editandoRegraId) return;
    await atualizarRegra.mutateAsync({
      id: editandoRegraId,
      conta_debito: editRegraValues.contaDebito,
      conta_credito: editRegraValues.contaCredito,
      descricao: editRegraValues.descricao,
      historico_busca: editRegraValues.historicoBusca,
      novo_debito: editRegraValues.novoDebito,
      novo_credito: editRegraValues.novoCredito,
    });
    setEditandoRegraId(null);
    setEditRegraValues({ contaDebito: "", contaCredito: "", descricao: "", historicoBusca: "", novoDebito: "", novoCredito: "" });
  };

  const cancelarEdicaoRegra = () => {
    setEditandoRegraId(null);
    setEditRegraValues({ contaDebito: "", contaCredito: "", descricao: "", historicoBusca: "", novoDebito: "", novoCredito: "" });
  };

  // Lançamentos que casam com regras (para a etapa de exclusões) - usa a flag casaComRegra
  const lancamentosParaExclusao = lancamentosEditaveis.filter(l => l.casaComRegra && !l.temErro);

  const toggleExclusao = (id: string) => {
    setLancamentosEditaveis(prev => 
      prev.map(l => l.id === id ? { ...l, marcadoExclusao: !l.marcadoExclusao } : l)
    );
  };

  const marcarTodosExclusao = (marcar: boolean) => {
    setLancamentosEditaveis(prev => 
      prev.map(l => {
        if (l.casaComRegra && !l.temErro) {
          return { ...l, marcadoExclusao: marcar };
        }
        return l;
      })
    );
  };

  // Confirmar exclusões: se desmarcado, o lançamento vira erro para correção
  const confirmarExclusoes = () => {
    setLancamentosEditaveis(prev => 
      prev.map(l => {
        // Se casa com regra mas NÃO foi marcado para exclusão → vira erro para correção
        if (l.casaComRegra && !l.marcadoExclusao) {
          return { 
            ...l, 
            casaComRegra: false, // Remove da lista de exclusões
            temErro: true, 
            erroOriginal: "Lançamento desmarcado da exclusão. Preencha os dados ou confirme a correção." 
          };
        }
        return l;
      })
    );
  };

  // Stats - lancamentosSemErro agora exclui os que casam com regra (vão para exclusões)
  const lancamentosSemErro = lancamentosEditaveis.filter(l => !l.temErro && !l.casaComRegra);
  const lancamentosComErro = lancamentosEditaveis.filter(l => l.temErro);
  const totalConfirmados = lancamentosSemErro.filter(l => l.confirmado).length;

  const totalHistorico = conversoes.length;
  const totalHistoricoSucesso = conversoes.filter(c => c.status === "sucesso").length;

  const steps = [
    { id: "empresa", label: "Empresa", icon: Building2 },
    { id: "plano", label: "Plano", icon: FileSpreadsheet },
    { id: "regras", label: "Regras", icon: Filter },
    { id: "importar", label: "Importar", icon: Upload },
    { id: "revisar", label: "Revisar", icon: Eye },
    { id: "corrigir", label: "Corrigir", icon: Edit3, hidden: lancamentosComErro.length === 0 },
    { id: "exclusoes", label: "Exclusões", icon: Ban, hidden: lancamentosParaExclusao.length === 0 },
    { id: "exportar", label: "Exportar", icon: Download },
  ].filter(s => !s.hidden);

  const canGoToExport = todosConfirmados && errosCorrigidos;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-violet-500" />
            Conversor LÍDER - Transformador de Lançamentos
          </CardTitle>
          <CardDescription>
            Transforme arquivos TXT de lançamentos contábeis (formato 0100/0200/0300). 
            Agrupa pagamentos, tarifas e descontos automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Steps Indicator */}
          <div className="flex items-center justify-center gap-2 p-4 bg-muted/30 rounded-lg">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isPast = steps.findIndex(s => s.id === currentStep) > idx;
              
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isPast || isActive) {
                        setCurrentStep(step.id as FluxoStep);
                      }
                    }}
                    disabled={!isPast && !isActive}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive 
                        ? "bg-violet-500 text-white" 
                        : isPast 
                          ? "bg-green-500/20 text-green-600 cursor-pointer hover:bg-green-500/30"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {isPast ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    <span className="font-medium">{step.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {currentStep === "empresa" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-violet-500" />
                    Selecionar Empresa
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione ou cadastre a empresa externa para iniciar a conversão
                  </p>
                </div>
                <Button 
                  className="bg-violet-500 hover:bg-violet-600"
                  onClick={() => setCurrentStep("plano")}
                  disabled={!empresaExternaId}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <Label className="text-base font-medium mb-4 block">Empresa Externa *</Label>
                <EmpresaExternaSelector
                  value={empresaExternaId}
                  onChange={handleEmpresaExternaChange}
                />
                <p className="text-sm text-muted-foreground mt-3">
                  O código da empresa será preenchido automaticamente a partir do cadastro.
                </p>
                
                {empresaExternaSelecionada && (
                  <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Empresa selecionada</span>
                    </div>
                    <div className="mt-2 text-sm">
                      <p><strong>Nome:</strong> {empresaExternaSelecionada.nome}</p>
                      <p><strong>Código:</strong> {empresaExternaSelecionada.codigo_empresa}</p>
                      {empresaExternaSelecionada.cnpj && (
                        <p><strong>CNPJ:</strong> {empresaExternaSelecionada.cnpj}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === "plano" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-violet-500" />
                    Plano de Contas
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Carregue ou confira o plano de contas da empresa. Ele é persistente entre sessões.
                  </p>
                </div>
                <Button 
                  className="bg-violet-500 hover:bg-violet-600"
                  onClick={() => setCurrentStep("regras")}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <input ref={planoInputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handlePlanoUpload} />

              {loadingPlano ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Carregando plano de contas...</p>
                </div>
              ) : planoContas.length === 0 ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-10 text-center">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Nenhum plano de contas carregado para esta empresa.
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Formatos aceitos: XLS, XLSX ou CSV
                  </p>
                  <Button onClick={() => planoInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Carregar Plano de Contas
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{planoContasArquivo}</p>
                        <p className="text-xs text-muted-foreground">{planoContas.length} contas carregadas</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => planoInputRef.current?.click()}>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Trocar Plano
                    </Button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar conta por código ou descrição..."
                      value={buscaPlano}
                      onChange={(e) => { setBuscaPlano(e.target.value); setPaginaPlano(1); }}
                      className="pl-9"
                    />
                  </div>

                  <ScrollArea className="max-h-[55vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Descrição</TableHead>
                          <TableHead className="w-28 text-xs">Código</TableHead>
                          <TableHead className="w-28 text-xs">Classif.</TableHead>
                          <TableHead className="w-36 text-xs">CNPJ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planoPaginado.map((conta, idx) => (
                          <TableRow key={`${conta.codigo}-${idx}`}>
                            <TableCell className="text-xs py-1.5">{conta.descricao}</TableCell>
                            <TableCell className="font-mono text-[11px] py-1.5">{conta.codigo}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground py-1.5">{conta.classificacao}</TableCell>
                            <TableCell className="font-mono text-[11px] text-muted-foreground py-1.5">{conta.cnpj || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {planoTotalPaginas > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {planoFiltrado.length} resultado(s) — Pág. {paginaPlano}/{planoTotalPaginas}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={paginaPlano <= 1} onClick={() => setPaginaPlano(p => p - 1)}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={paginaPlano >= planoTotalPaginas} onClick={() => setPaginaPlano(p => p + 1)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === "regras" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Filter className="w-5 h-5 text-violet-500" />
                    Regras de Processamento
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Configure regras para revisão manual ou alteração automática de lançamentos
                  </p>
                </div>
                <Button 
                  className="bg-violet-500 hover:bg-violet-600"
                  onClick={() => setCurrentStep("importar")}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Adicionar nova regra */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Nova Regra
                </h4>

                {/* Tipo da regra */}
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={novaRegraTipo === "revisao" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNovaRegraTipo("revisao")}
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Para Revisão
                  </Button>
                  <Button
                    variant={novaRegraTipo === "alteracao" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNovaRegraTipo("alteracao")}
                  >
                    <Edit3 className="w-4 h-4 mr-1.5" />
                    Para Alteração
                  </Button>
                </div>

                {/* Critérios de busca */}
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Critérios de Busca
                </p>
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div>
                    <Label htmlFor="regra-debito" className="text-sm text-muted-foreground">Conta Débito</Label>
                    <ContaSearchInput
                      id="regra-debito"
                      placeholder="Ex: 1"
                      value={novaRegra.contaDebito}
                      onChange={(v) => setNovaRegra(prev => ({ ...prev, contaDebito: v }))}
                      planoContas={planoContas}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="regra-credito" className="text-sm text-muted-foreground">Conta Crédito</Label>
                    <ContaSearchInput
                      id="regra-credito"
                      placeholder="Ex: 30"
                      value={novaRegra.contaCredito}
                      onChange={(v) => setNovaRegra(prev => ({ ...prev, contaCredito: v }))}
                      planoContas={planoContas}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="regra-historico" className="text-sm text-muted-foreground">
                      Histórico {novaRegraTipo === "alteracao" ? "*" : "(opcional)"}
                    </Label>
                    <Input 
                      id="regra-historico"
                      placeholder="Ex: titulo extra"
                      value={novaRegra.historicoBusca}
                      onChange={(e) => setNovaRegra(prev => ({ ...prev, historicoBusca: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="regra-desc" className="text-sm text-muted-foreground">Descrição</Label>
                    <Input 
                      id="regra-desc"
                      placeholder="Nome da regra"
                      value={novaRegra.descricao}
                      onChange={(e) => setNovaRegra(prev => ({ ...prev, descricao: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Campos de alteração (só aparece no tipo alteração) */}
                {novaRegraTipo === "alteracao" && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide mt-4">
                      Alterações a Aplicar
                    </p>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <Label htmlFor="regra-novo-debito" className="text-sm text-muted-foreground">Novo Débito</Label>
                        <ContaSearchInput
                          id="regra-novo-debito"
                          placeholder="Ex: 3319"
                          value={novaRegra.novoDebito}
                          onChange={(v) => setNovaRegra(prev => ({ ...prev, novoDebito: v }))}
                          planoContas={planoContas}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label htmlFor="regra-novo-credito" className="text-sm text-muted-foreground">Novo Crédito</Label>
                        <ContaSearchInput
                          id="regra-novo-credito"
                          placeholder="Ex: 30"
                          value={novaRegra.novoCredito}
                          onChange={(v) => setNovaRegra(prev => ({ ...prev, novoCredito: v }))}
                          planoContas={planoContas}
                          className="w-full"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={adicionarRegra} 
                          className="w-full"
                          disabled={criarRegra.isPending}
                        >
                          {criarRegra.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 mr-1" />
                          )}
                          Adicionar
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Informe débito e/ou crédito + histórico (parcial) para busca. Depois informe o novo débito e/ou crédito que será aplicado automaticamente.
                    </p>
                  </>
                )}

                {novaRegraTipo === "revisao" && (
                  <div className="flex justify-end mt-2">
                    <Button 
                      onClick={adicionarRegra} 
                      disabled={criarRegra.isPending || (!novaRegra.contaDebito.trim() && !novaRegra.contaCredito.trim() && !novaRegra.historicoBusca.trim())}
                    >
                      {criarRegra.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-1" />
                      )}
                      Adicionar Regra
                    </Button>
                  </div>
                )}

                {novaRegraTipo === "revisao" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Lançamentos que casarem serão enviados para revisão manual no passo 5.
                  </p>
                )}
              </div>

              {/* Lista de regras */}
              {isLoadingRegras ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Carregando regras...</p>
                </div>
              ) : regrasExclusao.length > 0 ? (
                <div className="space-y-4">
                  {/* Regras de Revisão */}
                  {regrasRevisao.length > 0 && (
                    <div className="border-2 border-amber-400/50 rounded-lg overflow-hidden">
                      <div className="p-3 border-b border-amber-400/30 bg-amber-500/15">
                        <h4 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <Eye className="w-4 h-4" />
                          Regras de Revisão ({regrasRevisao.length})
                        </h4>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-0.5">Lançamentos correspondentes serão enviados para revisão manual</p>
                      </div>
                      <div className="divide-y divide-amber-200/30">
                        {regrasRevisao.map((regra) => (
                          <div key={regra.id} className="p-3 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-500/5">
                            {editandoRegraId === regra.id ? (
                              <RegraEditForm
                                values={editRegraValues}
                                onChange={setEditRegraValues}
                                tipo={regra.tipo}
                                onSave={salvarEdicaoRegra}
                                onCancel={cancelarEdicaoRegra}
                                planoContas={planoContas}
                              />
                            ) : (
                              <>
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {regra.conta_debito && (
                                      <Badge variant="outline" className="font-mono text-xs">D: {regra.conta_debito}</Badge>
                                    )}
                                    {regra.conta_credito && (
                                      <Badge variant="outline" className="font-mono text-xs">C: {regra.conta_credito}</Badge>
                                    )}
                                    {regra.historico_busca && (
                                      <Badge variant="secondary" className="text-xs">Hist: "{regra.historico_busca}"</Badge>
                                    )}
                                  </div>
                                  <span className="text-sm text-muted-foreground">{regra.descricao}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => iniciarEdicaoRegra(regra)}>
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removerRegra(regra.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regras de Alteração */}
                  {regrasAlteracao.length > 0 && (
                    <div className="border-2 border-blue-400/50 rounded-lg overflow-hidden">
                      <div className="p-3 border-b border-blue-400/30 bg-blue-500/15">
                        <h4 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <Edit3 className="w-4 h-4" />
                          Regras de Alteração ({regrasAlteracao.length})
                        </h4>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/60 mt-0.5">Lançamentos correspondentes serão alterados automaticamente</p>
                      </div>
                      <div className="divide-y divide-blue-200/30">
                        {regrasAlteracao.map((regra) => (
                          <div key={regra.id} className="p-3 flex items-center justify-between hover:bg-blue-50/50 dark:hover:bg-blue-500/5">
                            {editandoRegraId === regra.id ? (
                              <RegraEditForm
                                values={editRegraValues}
                                onChange={setEditRegraValues}
                                tipo={regra.tipo}
                                onSave={salvarEdicaoRegra}
                                onCancel={cancelarEdicaoRegra}
                                planoContas={planoContas}
                              />
                            ) : (
                              <>
                                <div className="flex flex-col gap-1.5 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">BUSCA:</span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {regra.conta_debito && (
                                        <Badge variant="outline" className="font-mono text-xs">D: {regra.conta_debito}</Badge>
                                      )}
                                      {regra.conta_credito && (
                                        <Badge variant="outline" className="font-mono text-xs">C: {regra.conta_credito}</Badge>
                                      )}
                                      {regra.historico_busca && (
                                        <Badge variant="secondary" className="text-xs">Hist: "{regra.historico_busca}"</Badge>
                                      )}
                                    </div>
                                    <span className="text-sm text-muted-foreground">— {regra.descricao}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">ALTERA:</span>
                                    <div className="flex items-center gap-1.5">
                                      {regra.novo_debito && (
                                        <Badge className="font-mono text-xs bg-blue-500/20 text-blue-700 hover:bg-blue-500/30">D → {regra.novo_debito}</Badge>
                                      )}
                                      {regra.novo_credito && (
                                        <Badge className="font-mono text-xs bg-blue-500/20 text-blue-700 hover:bg-blue-500/30">C → {regra.novo_credito}</Badge>
                                      )}
                                      {!regra.novo_debito && !regra.novo_credito && (
                                        <span className="text-xs text-muted-foreground italic">Nenhuma alteração definida</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => iniciarEdicaoRegra(regra)}>
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removerRegra(regra.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma regra configurada.</p>
                  <p className="text-sm">Você pode continuar sem regras ou adicionar regras acima.</p>
                </div>
              )}
            </div>
          )}

          {currentStep === "importar" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Arquivos Processados</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{arquivosLocais.length}</p>
                </div>
                <div className="p-4 rounded-lg border bg-blue-500/10 border-blue-500/30">
                  <div className="flex items-center gap-2 text-blue-600">
                    <History className="w-4 h-4" />
                    <span className="text-sm">Histórico Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-blue-600">
                    {isLoadingConversoes ? "..." : `${totalHistoricoSucesso}/${totalHistorico}`}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="text-sm">Formato Saída</span>
                  </div>
                  <Select value={tipoExportacao} onValueChange={setTipoExportacao}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="txt">TXT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Empresa Selecionada (read-only) */}
              <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
                <Label className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                  <Building2 className="w-4 h-4" />
                  Empresa Selecionada
                </Label>
                {empresaExternaSelecionada ? (
                  <div className="text-sm space-y-1">
                    <p><strong>{empresaExternaSelecionada.nome}</strong></p>
                    <p className="text-muted-foreground">Código: <span className="font-mono">{codigoEmpresa}</span></p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma empresa selecionada</p>
                )}
              </div>

              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
                  isDragging 
                    ? "border-violet-500 bg-violet-500/10 scale-[1.02]" 
                    : "border-muted-foreground/30 hover:border-violet-500/50 hover:bg-muted/30"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isProcessing && document.getElementById('lider-file')?.click()}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${
                  isDragging ? "text-violet-500" : "text-muted-foreground"
                }`} />
                <p className={`text-lg mb-2 transition-colors ${
                  isDragging ? "text-violet-500 font-medium" : "text-muted-foreground"
                }`}>
                  {isDragging 
                    ? "Solte o arquivo aqui..." 
                    : "Arraste e solte um arquivo TXT ou clique para selecionar"
                  }
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Formato aceito: 0100/0200/0300 - Agrupa PAGTO + TARIFA automaticamente
                </p>
                
                <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <Label htmlFor="lider-file" className="sr-only">Arquivo TXT</Label>
                    <Input 
                      id="lider-file" 
                      type="file" 
                      accept=".txt"
                      onChange={handleFileChange}
                      className="max-w-xs"
                      disabled={isProcessing}
                    />
                  </div>
                  <Button 
                    onClick={handleProcessar} 
                    className="bg-violet-500 hover:bg-violet-600"
                    disabled={isProcessing || !selectedFile || !codigoEmpresa.trim()}
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processando...</>
                    ) : (
                      <><FileSpreadsheet className="w-4 h-4 mr-1" /> Processar</>
                    )}
                  </Button>
                </div>
                {selectedFile && (
                  <p className="text-sm text-violet-500 mt-4 font-medium">
                    ✓ Arquivo selecionado: {selectedFile.name}
                  </p>
                )}
                {!codigoEmpresa.trim() && (
                  <p className="text-sm text-yellow-500 mt-2">
                    ⚠ Selecione uma empresa no Passo 1 para processar arquivos
                  </p>
                )}
              </div>

              {/* Histórico */}
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Conversões
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Atualizar
                  </Button>
                </div>
                {isLoadingConversoes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  </div>
                ) : conversoes.length > 0 ? (
                  <ScrollArea className="max-h-[300px]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">Arquivo</th>
                          <th className="text-center p-3 font-medium">Status</th>
                          <th className="text-center p-3 font-medium">Linhas</th>
                          <th className="text-left p-3 font-medium">Data</th>
                          <th className="text-center p-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {conversoes.map(conversao => (
                          <tr key={conversao.id} className="hover:bg-muted/30">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-violet-500" />
                                <span className="font-medium">{conversao.nome_arquivo_original}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                conversao.status === "sucesso" ? "bg-green-500/20 text-green-600" :
                                conversao.status === "erro" ? "bg-red-500/20 text-red-600" :
                                "bg-yellow-500/20 text-yellow-600"
                              }`}>
                                {conversao.status}
                              </span>
                            </td>
                            <td className="p-3 text-center font-medium">
                              {conversao.linhas_processadas?.toLocaleString() || '-'}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(conversao.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => setPreviewConversao(conversao)}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadConversao(conversao, 'convertido')}
                                  disabled={!conversao.arquivo_convertido_url}
                                  title="Download convertido"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => handleRemoverConversao(conversao)}
                                  title="Remover"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma conversão no histórico.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === "revisar" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-violet-500" />
                    Revisar Lançamentos
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Arquivo: <span className="font-medium">{arquivoAtual?.nome}</span> • 
                    {totalConfirmados}/{lancamentosSemErro.length} confirmados
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={resetarFluxo}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={confirmarTodos}
                    disabled={todosConfirmados}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirmar Todos
                  </Button>
                  <Button 
                    className="bg-violet-500 hover:bg-violet-600"
                    onClick={() => {
                      if (lancamentosComErro.length > 0) {
                        setCurrentStep("corrigir");
                      } else if (lancamentosParaExclusao.length > 0) {
                        setCurrentStep("exclusoes");
                      } else {
                        setCurrentStep("exportar");
                      }
                    }}
                    disabled={!todosConfirmados}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Filter buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtrar:</span>
                <Button 
                  variant={filtroRevisar === "todos" ? "default" : "outline"} 
                  size="sm" className="h-7 text-xs"
                  onClick={() => { setFiltroRevisar("todos"); setPaginaRevisar(1); }}
                >
                  Todos ({lancamentosSemErro.length})
                </Button>
                <Button 
                  variant={filtroRevisar === "alterados" ? "default" : "outline"} 
                  size="sm" className="h-7 text-xs"
                  onClick={() => { setFiltroRevisar("alterados"); setPaginaRevisar(1); }}
                >
                  Alterados ({lancamentosSemErro.filter(l => l.alteradoPorRegra).length})
                </Button>
                <Button 
                  variant={filtroRevisar === "normais" ? "default" : "outline"} 
                  size="sm" className="h-7 text-xs"
                  onClick={() => { setFiltroRevisar("normais"); setPaginaRevisar(1); }}
                >
                  Normais ({lancamentosSemErro.filter(l => !l.alteradoPorRegra).length})
                </Button>
              </div>

              {(() => {
                const REVISAR_PAGE_SIZE = 100;
                const lancamentosFiltrados = filtroRevisar === "alterados" 
                  ? lancamentosSemErro.filter(l => l.alteradoPorRegra)
                  : filtroRevisar === "normais"
                  ? lancamentosSemErro.filter(l => !l.alteradoPorRegra)
                  : lancamentosSemErro;
                const totalPaginasRevisar = Math.ceil(lancamentosFiltrados.length / REVISAR_PAGE_SIZE);
                const paginaAtual = Math.min(paginaRevisar, Math.max(1, totalPaginasRevisar));
                const inicio = (paginaAtual - 1) * REVISAR_PAGE_SIZE;
                const lancamentosPagina = lancamentosFiltrados.slice(inicio, inicio + REVISAR_PAGE_SIZE);

                return (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-center p-2 w-12">
                              <Checkbox 
                                checked={todosConfirmados}
                                onCheckedChange={() => confirmarTodos()}
                              />
                            </th>
                            <th className="text-left p-2">Data</th>
                            <th className="text-left p-2">Débito</th>
                            <th className="text-left p-2">Crédito</th>
                            <th className="text-right p-2">Valor</th>
                            <th className="text-left p-2">Histórico</th>
                            <th className="text-center p-2">Lote</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lancamentosPagina.map((row) => (
                            <tr 
                              key={row.id} 
                              className={`
                                ${row.alteradoPorRegra ? "bg-amber-500/10 border-l-2 border-l-amber-500" : ""}
                                ${row.loteFlag && !row.alteradoPorRegra ? "bg-violet-500/5" : ""} 
                                ${row.confirmado && !row.alteradoPorRegra ? "bg-green-500/5" : ""}
                                ${row.confirmado && row.alteradoPorRegra ? "bg-amber-500/15" : ""}
                              `}
                            >
                              <td className="p-2 text-center">
                                <Checkbox 
                                  checked={row.confirmado}
                                  onCheckedChange={() => toggleConfirmacao(row.id)}
                                />
                              </td>
                              <td className="p-2">{row.data}</td>
                              <td className={`p-2 font-mono ${row.alteradoPorRegra ? "text-amber-700 dark:text-amber-400 font-semibold" : ""}`}>
                                {row.contaDebito || '-'}
                              </td>
                              <td className={`p-2 font-mono ${row.alteradoPorRegra ? "text-amber-700 dark:text-amber-400 font-semibold" : ""}`}>
                                {row.contaCredito || '-'}
                              </td>
                              <td className="p-2 text-right font-mono">{row.valor}</td>
                              <td className="p-2 truncate max-w-[250px]" title={row.historico}>
                                {row.historico}
                              </td>
                              <td className="p-2 text-center">
                                {row.alteradoPorRegra && (
                                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs" title={row.regraAlteracaoDescricao}>
                                    Alterado
                                  </Badge>
                                )}
                                {row.loteFlag && !row.alteradoPorRegra && <Badge variant="secondary" className="bg-violet-500/20 text-violet-600">S</Badge>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPaginasRevisar > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-muted-foreground">
                          {inicio + 1} - {Math.min(inicio + REVISAR_PAGE_SIZE, lancamentosFiltrados.length)} de {lancamentosFiltrados.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPaginaRevisar(Math.max(1, paginaAtual - 1))} disabled={paginaAtual === 1}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="px-2 text-sm">{paginaAtual}/{totalPaginasRevisar}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPaginaRevisar(Math.min(totalPaginasRevisar, paginaAtual + 1))} disabled={paginaAtual === totalPaginasRevisar}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {lancamentosComErro.length > 0 && (
                <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-red-600">
                      {lancamentosComErro.length} erro(s) encontrado(s)
                    </span>
                    <span className="text-sm text-red-500">
                      - Corrija na próxima etapa para incluir no arquivo final
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === "corrigir" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-orange-500" />
                    Corrigir Erros
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {lancamentosComErro.length} lançamento(s) com erro para corrigir ou remover
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep("revisar")}>
                    Voltar
                  </Button>
                  <Button 
                    className="bg-violet-500 hover:bg-violet-600"
                    onClick={() => setCurrentStep(lancamentosParaExclusao.length > 0 ? "exclusoes" : "exportar")}
                    disabled={!errosCorrigidos && lancamentosComErro.length > 0}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {lancamentosComErro.map((erro) => (
                  <div key={erro.id} className="p-4 border border-red-500/30 rounded-lg bg-red-500/5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-red-600">Erro no processamento</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removerLancamentoErro(erro.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Ignorar
                      </Button>
                    </div>
                    
                    <p className="text-sm text-red-600 mb-4 font-mono bg-red-500/10 p-2 rounded">
                      {erro.erroOriginal}
                    </p>

                    {editingRowId === erro.id ? (
                      <div className="grid grid-cols-6 gap-2">
                        <Input 
                          placeholder="Data (dd/mm/aaaa)"
                          value={editValues.data || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, data: e.target.value }))}
                        />
                        <Input 
                          placeholder="Conta Débito"
                          value={editValues.contaDebito || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, contaDebito: e.target.value }))}
                        />
                        <Input 
                          placeholder="Conta Crédito"
                          value={editValues.contaCredito || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, contaCredito: e.target.value }))}
                        />
                        <Input 
                          placeholder="Valor"
                          value={editValues.valor || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, valor: e.target.value }))}
                        />
                        <Input 
                          placeholder="Histórico"
                          value={editValues.historico || ""}
                          onChange={(e) => setEditValues(prev => ({ ...prev, historico: e.target.value }))}
                        />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => saveEdit(erro.id)}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => startEdit(erro)}>
                        <Edit3 className="w-4 h-4 mr-1" />
                        Preencher Manualmente
                      </Button>
                    )}
                  </div>
                ))}

                {lancamentosComErro.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-green-600 font-medium">Todos os erros foram resolvidos!</p>
                    <p className="text-sm">Você pode prosseguir para exportar o arquivo.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === "exclusoes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Ban className="w-5 h-5 text-orange-500" />
                    Confirmar Exclusões e Inconsistências
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {lancamentosParaExclusao.filter(l => !l.inconsistenciaFornecedor).length > 0 && (
                      <span>{lancamentosParaExclusao.filter(l => !l.inconsistenciaFornecedor).length} lançamento(s) casam com regras de exclusão. </span>
                    )}
                    {lancamentosParaExclusao.filter(l => l.inconsistenciaFornecedor).length > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {lancamentosParaExclusao.filter(l => l.inconsistenciaFornecedor).length} inconsistência(s) de fornecedor detectadas.
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(lancamentosComErro.length > 0 ? "corrigir" : "revisar")}>
                    Voltar
                  </Button>
                  <Button 
                    className="bg-violet-500 hover:bg-violet-600"
                    onClick={() => {
                      // Confirma exclusões - lançamentos não marcados viram erro
                      confirmarExclusoes();
                      // Verifica se há novos erros (lançamentos que foram desmarcados)
                      const desmarcados = lancamentosParaExclusao.filter(l => !l.marcadoExclusao);
                      if (desmarcados.length > 0) {
                        // Volta para correção pois há novos erros
                        setCurrentStep("corrigir");
                        toast({
                          title: "Lançamentos para correção",
                          description: `${desmarcados.length} lançamento(s) foram movidos para correção.`,
                        });
                      } else {
                        setCurrentStep("exportar");
                      }
                    }}
                  >
                    Confirmar e Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-orange-500/10 border-orange-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="font-medium text-orange-700 dark:text-orange-400">
                      Confirme quais lançamentos serão EXCLUÍDOS do arquivo final
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => marcarTodosExclusao(true)}
                    >
                      Excluir Todos
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => marcarTodosExclusao(false)}
                    >
                      Manter Todos
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  ✓ Lançamentos <strong>marcados</strong> serão removidos do arquivo exportado.<br />
                  ⚠ Lançamentos <strong>desmarcados</strong> voltarão para a etapa de correção para revisão manual.
                </p>
              </div>

              {/* Legenda de cores */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/40 inline-block" />
                  <span>Marcado p/ exclusão (regra)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/40 inline-block" />
                  <span>Inconsistência fornecedor × conta débito</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-green-500/10 border border-green-500/30 inline-block" />
                  <span>Mantido (não será excluído)</span>
                </div>
              </div>

              {/* Paginação superior */}
              {(() => {
                const totalExclusao = lancamentosParaExclusao.length;
                const totalPaginasExclusao = Math.ceil(totalExclusao / EXCLUSAO_PAGE_SIZE);
                const inicioExclusao = (paginaExclusao - 1) * EXCLUSAO_PAGE_SIZE;
                const fimExclusao = Math.min(inicioExclusao + EXCLUSAO_PAGE_SIZE, totalExclusao);
                const lancamentosPaginados = lancamentosParaExclusao.slice(inicioExclusao, fimExclusao);

                return (
                  <>
                    {totalPaginasExclusao > 1 && (
                      <div className="flex items-center justify-between text-sm px-1">
                        <span className="text-muted-foreground">
                          {inicioExclusao + 1}–{fimExclusao} de {totalExclusao}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" disabled={paginaExclusao === 1} onClick={() => setPaginaExclusao(p => p - 1)}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="px-2 text-muted-foreground">{paginaExclusao}/{totalPaginasExclusao}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" disabled={paginaExclusao === totalPaginasExclusao} onClick={() => setPaginaExclusao(p => p + 1)}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-center p-2 w-12">Excluir?</th>
                            <th className="text-left p-2">Regra</th>
                            <th className="text-left p-2">Data</th>
                            <th className="text-left p-2">Débito</th>
                            <th className="text-left p-2">Crédito</th>
                            <th className="text-right p-2">Valor</th>
                            <th className="text-left p-2">Histórico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lancamentosPaginados.map((row) => {
                            const regraMatch = regrasExclusao.find(r => r.id === row.regraMatchId);
                            return (
                              <tr 
                                key={row.id} 
                                className={
                                  row.inconsistenciaFornecedor
                                    ? "bg-amber-500/15 border-l-4 border-l-amber-500"
                                    : row.marcadoExclusao
                                      ? "bg-red-500/10"
                                      : "bg-green-500/5"
                                }
                              >
                                <td className="p-2 text-center">
                                  <Checkbox 
                                    checked={row.marcadoExclusao || false}
                                    onCheckedChange={() => toggleExclusao(row.id)}
                                  />
                                </td>
                                <td className="p-2">
                                  {row.inconsistenciaFornecedor ? (
                                    <div className="space-y-1">
                                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                                        Inconsistência
                                      </Badge>
                                      <div className="text-xs text-muted-foreground">
                                        <span className="font-medium">{row.fornecedorNome}</span>
                                        <br />
                                        Esperado: <span className="font-mono text-amber-600 dark:text-amber-400">{row.contaEsperadaPlano}</span>
                                        <br />
                                        <span className="text-xs opacity-70">{row.descricaoEsperadaPlano}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      {regraMatch?.descricao || "Regra"}
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2">{row.data}</td>
                                <td className="p-2 font-mono">
                                  {row.inconsistenciaFornecedor ? (
                                    <span className="text-amber-600 dark:text-amber-400 font-bold" title={`Esperado: ${row.contaEsperadaPlano}`}>
                                      {row.contaDebito || '-'}
                                    </span>
                                  ) : (
                                    row.contaDebito || '-'
                                  )}
                                </td>
                                <td className="p-2 font-mono">{row.contaCredito || '-'}</td>
                                <td className="p-2 text-right font-mono">{row.valor}</td>
                                <td className="p-2 truncate max-w-[200px]" title={row.historico}>
                                  {row.historico}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {totalPaginasExclusao > 1 && (
                      <div className="flex items-center justify-between text-sm px-1">
                        <span className="text-muted-foreground">
                          {inicioExclusao + 1}–{fimExclusao} de {totalExclusao}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" disabled={paginaExclusao === 1} onClick={() => setPaginaExclusao(p => p - 1)}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="px-2 text-muted-foreground">{paginaExclusao}/{totalPaginasExclusao}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" disabled={paginaExclusao === totalPaginasExclusao} onClick={() => setPaginaExclusao(p => p + 1)}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex-1">
                  <p className="font-medium">
                    {lancamentosParaExclusao.filter(l => l.marcadoExclusao).length} de {lancamentosParaExclusao.length} lançamentos serão excluídos
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total de lançamentos no arquivo final: {lancamentosEditaveis.filter(l => !l.temErro && !l.marcadoExclusao).length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === "exportar" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Download className="w-5 h-5 text-green-500" />
                    Exportar Arquivo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Arquivo: <span className="font-medium">{arquivoAtual?.nome}</span>
                  </p>
                </div>
                <Button variant="outline" onClick={() => {
                  if (lancamentosParaExclusao.length > 0) {
                    setCurrentStep("exclusoes");
                  } else if (lancamentosComErro.length > 0) {
                    setCurrentStep("corrigir");
                  } else {
                    setCurrentStep("revisar");
                  }
                }}>
                  Voltar
                </Button>
              </div>

              {/* Resumo */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Lançamentos Finais</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {lancamentosEditaveis.filter(l => (!l.temErro || (l.data && l.valor)) && !l.marcadoExclusao).length}
                  </p>
                </div>
                {lancamentosParaExclusao.filter(l => l.marcadoExclusao).length > 0 && (
                  <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/30">
                    <div className="flex items-center gap-2 text-red-600">
                      <Ban className="w-4 h-4" />
                      <span className="text-sm">Excluídos</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-red-600">
                      {lancamentosParaExclusao.filter(l => l.marcadoExclusao).length}
                    </p>
                  </div>
                )}
                <div className="p-4 rounded-lg border bg-violet-500/10 border-violet-500/30">
                  <div className="flex items-center gap-2 text-violet-600">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="text-sm">Formato</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-violet-600">{tipoExportacao.toUpperCase()}</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Arquivo Saída</span>
                  </div>
                  <p className="text-sm font-medium mt-1 truncate">
                    {arquivoAtual?.nome.replace(/\.[^.]+$/, `_transformado.${tipoExportacao}`)}
                  </p>
                </div>
              </div>

              {/* Preview */}
              {(() => {
                const EXPORT_PAGE_SIZE = 100;
                const lancamentosFinais = lancamentosEditaveis
                  .filter(l => (!l.temErro || (l.data && l.valor)) && !l.marcadoExclusao);
                const totalPaginasExport = Math.ceil(lancamentosFinais.length / EXPORT_PAGE_SIZE);
                const paginaAtualExport = Math.min(paginaExportar, Math.max(1, totalPaginasExport));
                const inicioExport = (paginaAtualExport - 1) * EXPORT_PAGE_SIZE;
                const lancamentosPaginaExport = lancamentosFinais.slice(inicioExport, inicioExport + EXPORT_PAGE_SIZE);

                return (
                  <div className="border rounded-lg">
                    <div className="p-3 border-b bg-muted/50">
                      <h4 className="font-medium">Preview do Arquivo Final ({lancamentosFinais.length} lançamentos)</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2">Data</th>
                            <th className="text-left p-2">Débito</th>
                            <th className="text-left p-2">Crédito</th>
                            <th className="text-right p-2">Valor</th>
                            <th className="text-left p-2">Histórico</th>
                            <th className="text-center p-2">Lote</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lancamentosPaginaExport.map((row) => (
                            <tr key={row.id} className={row.loteFlag ? "bg-violet-500/5" : ""}>
                              <td className="p-2">{row.data}</td>
                              <td className="p-2 font-mono">{row.contaDebito || '-'}</td>
                              <td className="p-2 font-mono">{row.contaCredito || '-'}</td>
                              <td className="p-2 text-right font-mono">{row.valor}</td>
                              <td className="p-2 truncate max-w-[200px]" title={row.historico}>
                                {row.historico}
                              </td>
                              <td className="p-2 text-center">
                                {row.loteFlag && <Badge variant="secondary" className="bg-violet-500/20 text-violet-600">S</Badge>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPaginasExport > 1 && (
                      <div className="flex items-center justify-between p-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          {inicioExport + 1} - {Math.min(inicioExport + EXPORT_PAGE_SIZE, lancamentosFinais.length)} de {lancamentosFinais.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPaginaExportar(Math.max(1, paginaAtualExport - 1))} disabled={paginaAtualExport === 1}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="px-2 text-sm">{paginaAtualExport}/{totalPaginasExport}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPaginaExportar(Math.min(totalPaginasExport, paginaAtualExport + 1))} disabled={paginaAtualExport === totalPaginasExport}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Botões finais */}
              <div className="flex justify-center gap-4">
                <Button 
                  size="lg"
                  className="bg-green-500 hover:bg-green-600"
                  onClick={handleExportar}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Baixar Arquivo {tipoExportacao.toUpperCase()}
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={resetarFluxo}
                >
                  Novo Arquivo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog - Histórico */}
      <Dialog open={!!previewConversao} onOpenChange={() => setPreviewConversao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              {previewConversao?.nome_arquivo_original}
            </DialogTitle>
            <DialogDescription>
              Processado em {previewConversao && new Date(previewConversao.created_at).toLocaleString('pt-BR')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg border">
                <p className="text-muted-foreground">Total de Linhas</p>
                <p className="text-lg font-bold">{previewConversao?.total_linhas || 0}</p>
              </div>
              <div className="p-3 rounded-lg border bg-green-500/10">
                <p className="text-green-600">Processadas</p>
                <p className="text-lg font-bold text-green-600">{previewConversao?.linhas_processadas || 0}</p>
              </div>
              <div className="p-3 rounded-lg border bg-red-500/10">
                <p className="text-red-600">Erros</p>
                <p className="text-lg font-bold text-red-600">{previewConversao?.linhas_erro || 0}</p>
              </div>
            </div>

            {previewConversao?.mensagem_erro && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="text-sm font-medium text-red-600 mb-1">Mensagens de Erro:</p>
                <p className="text-sm text-red-500">{previewConversao.mensagem_erro}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => previewConversao && handleDownloadConversao(previewConversao, 'original')}
              >
                <Download className="w-4 h-4 mr-1" />
                Original
              </Button>
              <Button 
                className="flex-1 bg-violet-500 hover:bg-violet-600"
                onClick={() => previewConversao && handleDownloadConversao(previewConversao, 'convertido')}
                disabled={!previewConversao?.arquivo_convertido_url}
              >
                <Download className="w-4 h-4 mr-1" />
                Convertido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
