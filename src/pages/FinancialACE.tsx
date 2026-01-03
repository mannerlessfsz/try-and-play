import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { MetricCard } from "@/components/task/MetricCard";
import { TimelineItem } from "@/components/task/TimelineItem";
import { 
  DollarSign, Plus, Edit, Trash2, TrendingUp, TrendingDown,
  CreditCard, Receipt, PieChart, BarChart3, Wallet, Building2,
  User, Calendar, Filter, SortAsc, Search, FileDown, FileUp,
  Settings, ArrowUpRight, ArrowDownRight, Zap, Clock, Tag,
  Activity, List, LayoutGrid, Target, AlertTriangle, Upload,
  FileText, CheckCircle2, XCircle, Link2, ChevronDown, Loader2,
  Landmark, Package, Users, Truck, ShoppingCart, ShoppingBag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAtividades } from "@/hooks/useAtividades";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useTransacoes } from "@/hooks/useTransacoes";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseOFX, readFileAsText, normalizeAccountNumber } from "@/utils/ofxParser";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { ContasBancariasManager } from "@/components/financial/ContasBancariasManager";
import { CategoriasManager } from "@/components/financial/CategoriasManager";
import { TransacoesManager } from "@/components/financial/TransacoesManager";
import { UserHeader } from "@/components/financial/UserHeader";
import { ImportExtratoModal } from "@/components/financial/ImportExtratoModal";
import { RelatoriosManager } from "@/components/financial/RelatoriosManager";
import { useContasBancarias } from "@/hooks/useContasBancarias";
import { ProdutosManager } from "@/components/erp/ProdutosManager";
import { ClientesManager } from "@/components/erp/ClientesManager";
import { FornecedoresManager } from "@/components/erp/FornecedoresManager";
import { VendasManager } from "@/components/erp/VendasManager";
import { ComprasManager } from "@/components/erp/ComprasManager";
import { EstoqueManager } from "@/components/erp/EstoqueManager";
import { OrcamentosManager } from "@/components/erp/OrcamentosManager";
import { CentrosCustoManager } from "@/components/financial/CentrosCustoManager";
import { MetasFinanceirasManager } from "@/components/financial/MetasFinanceirasManager";
import { RecorrenciasManager } from "@/components/financial/RecorrenciasManager";
import { useImportacoesExtrato } from "@/hooks/useImportacoesExtrato";
import { useProdutos } from "@/hooks/useProdutos";
import { useVendas } from "@/hooks/useVendas";
import { useCompras } from "@/hooks/useCompras";
import { useOrcamentos } from "@/hooks/useOrcamentos";

interface ExtratoImportado {
  id: string;
  dbId?: string; // ID persistido no banco
  contaBancariaId?: string;
  nome: string;
  tipo: "pdf" | "ofx";
  dataImportacao: string;
  status: "processando" | "pendente" | "concluido" | "confirmado" | "erro";
  transacoes: number;
  conciliadas: number;
}

interface LancamentoExtrato {
  id: string;
  extratoId: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: "credito" | "debito";
  conciliado: boolean;
  transacaoVinculadaId?: string;
}

const widgetGroups = [
  {
    id: "actions",
    label: "Ações Rápidas",
    icon: <Zap className="w-5 h-5" />,
    items: [
      { id: "new-receita", label: "Nova Receita", icon: <ArrowUpRight className="w-5 h-5" />, badge: "+" },
      { id: "new-despesa", label: "Nova Despesa", icon: <ArrowDownRight className="w-5 h-5" /> },
      { id: "edit", label: "Editar", icon: <Edit className="w-5 h-5" /> },
      { id: "delete", label: "Excluir", icon: <Trash2 className="w-5 h-5" /> },
    ],
  },
  {
    id: "view",
    label: "Visualização",
    icon: <Filter className="w-5 h-5" />,
    items: [
      { id: "filter", label: "Filtrar", icon: <Filter className="w-5 h-5" /> },
      { id: "sort", label: "Ordenar", icon: <SortAsc className="w-5 h-5" /> },
      { id: "search", label: "Buscar", icon: <Search className="w-5 h-5" /> },
      { id: "calendar", label: "Agenda", icon: <Calendar className="w-5 h-5" /> },
    ],
  },
  {
    id: "organize",
    label: "Organizar",
    icon: <Tag className="w-5 h-5" />,
    items: [
      { id: "categories", label: "Categorias", icon: <PieChart className="w-5 h-5" />, badge: 8 },
      { id: "tags", label: "Tags", icon: <Tag className="w-5 h-5" /> },
      { id: "recurring", label: "Recorrentes", icon: <Clock className="w-5 h-5" /> },
      { id: "goals", label: "Metas", icon: <Target className="w-5 h-5" /> },
    ],
  },
  {
    id: "reports",
    label: "Relatórios",
    icon: <BarChart3 className="w-5 h-5" />,
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutGrid className="w-5 h-5" /> },
      { id: "charts", label: "Gráficos", icon: <BarChart3 className="w-5 h-5" /> },
      { id: "cashflow", label: "Fluxo Caixa", icon: <TrendingUp className="w-5 h-5" /> },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    icon: <Settings className="w-5 h-5" />,
    items: [
      { id: "export", label: "Exportar", icon: <FileDown className="w-5 h-5" /> },
      { id: "import", label: "Importar", icon: <FileUp className="w-5 h-5" /> },
      { id: "settings", label: "Config", icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

type FilterType = "all" | "receitas" | "despesas" | "pendentes";
type ModoFinanceiro = "pro" | "basico";

export default function FinancialACE() {
  const [activeTab, setActiveTab] = useState<"transacoes" | "categorias" | "contas" | "conciliacao" | "relatorios" | "produtos" | "clientes" | "fornecedores" | "vendas" | "compras" | "estoque" | "orcamentos" | "centros_custo" | "metas" | "recorrencias">("transacoes");
  const [activeSection, setActiveSection] = useState<"financeiro" | "gestao">("financeiro");
  const [viewMode, setViewMode] = useState<"lista" | "grid">("lista");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [modo, setModo] = useState<ModoFinanceiro>("pro");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { empresaAtiva, empresasDisponiveis, setEmpresaAtiva, loading: empresaLoading } = useEmpresaAtiva();

  // Competência filter
  const currentDate = new Date();
  const [competenciaMes, setCompetenciaMes] = useState<number>(currentDate.getMonth() + 1);
  const [competenciaAno, setCompetenciaAno] = useState<number>(currentDate.getFullYear());

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [extratosImportados, setExtratosImportados] = useState<ExtratoImportado[]>([]);

  const [extratoSelecionado, setExtratoSelecionado] = useState<string | null>(null);
  const [lancamentoParaVincular, setLancamentoParaVincular] = useState<LancamentoExtrato | null>(null);
  
  // Lançamentos de extrato carregados dinamicamente
  const [lancamentosExtrato, setLancamentosExtrato] = useState<LancamentoExtrato[]>([]);

  // Use real activities hook
  const { atividades, loading: atividadesLoading } = useAtividades();

  // Use real transacoes hook for metrics
  const { totalReceitas, totalDespesas, saldo, pendentes, transacoes, createTransacao, createTransacaoAsync, conciliarTransacaoAsync, conciliarEmMassaAsync, desconciliarEmMassaAsync } = useTransacoes(empresaAtiva?.id);
  
  // Use real bank accounts hook
  const { contas, isLoading: isLoadingContas } = useContasBancarias(empresaAtiva?.id);

  // Use importacoes extrato hook
  const { 
    importacoes, 
    createImportacao, 
    updateImportacao, 
    deleteImportacao, 
    isDeleting: isDeletingImportacao 
  } = useImportacoesExtrato(empresaAtiva?.id);

  // ERP hooks
  const { produtos } = useProdutos(empresaAtiva?.id);
  const { totalVendas } = useVendas(empresaAtiva?.id);
  const { totalCompras } = useCompras(empresaAtiva?.id);
  const { orcamentosAbertos } = useOrcamentos(empresaAtiva?.id);

  // Transações formatadas para conciliação - memoized for performance
  const transacoesParaConciliacao = useMemo(() => 
    transacoes.map(t => ({
      id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      tipo: t.tipo as "receita" | "despesa",
      categoria: t.categoria?.nome || "Sem categoria",
      data: t.data_transacao,
      status: t.status as "pendente" | "confirmado" | "cancelado",
    })), [transacoes]);

  // Filtered transactions - memoized
  const filteredTransacoes = useMemo(() => {
    switch (activeFilter) {
      case "receitas":
        return transacoesParaConciliacao.filter(t => t.tipo === "receita");
      case "despesas":
        return transacoesParaConciliacao.filter(t => t.tipo === "despesa");
      case "pendentes":
        return transacoesParaConciliacao.filter(t => t.status === "pendente");
      default:
        return transacoesParaConciliacao;
    }
  }, [activeFilter, transacoesParaConciliacao]);

  // Load persisted extratos from database on mount
  useEffect(() => {
    if (importacoes.length > 0) {
      const extratosFromDb: ExtratoImportado[] = importacoes.map(imp => ({
        id: imp.id, // Use db id as main id for persisted ones
        dbId: imp.id,
        contaBancariaId: imp.conta_bancaria_id,
        nome: imp.nome_arquivo,
        tipo: imp.tipo_arquivo as "pdf" | "ofx",
        dataImportacao: imp.created_at.split('T')[0],
        status: imp.status as "processando" | "pendente" | "concluido" | "confirmado" | "erro",
        transacoes: imp.total_transacoes || 0,
        conciliadas: imp.transacoes_importadas || 0,
      }));
      
      // Merge with local state (avoid duplicates)
      setExtratosImportados(prev => {
        const dbIds = new Set(extratosFromDb.map(e => e.dbId));
        const localOnly = prev.filter(e => !e.dbId || !dbIds.has(e.dbId));
        return [...localOnly, ...extratosFromDb];
      });
    }
  }, [importacoes]);

  const handleFilterClick = useCallback((filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  }, []);

  // Use shared formatter
  const formatCurrency = formatCurrencyUtil;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension !== 'pdf' && extension !== 'ofx') {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo PDF ou OFX.",
        variant: "destructive",
      });
      return;
    }

    // Open modal to select competência
    setPendingFile(file);
    setImportModalOpen(true);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (data: { mes: number; ano: number; contaBancariaId: string }) => {
    setImportModalOpen(false);
    
    if (!pendingFile) return;
    const file = pendingFile;
    const extension = file.name.split('.').pop()?.toLowerCase();
    setPendingFile(null);

    // Find the selected bank account
    const contaSelecionada = contas.find(c => c.id === data.contaBancariaId);
    if (!contaSelecionada) {
      toast({
        title: "Erro",
        description: "Conta bancária não encontrada.",
        variant: "destructive",
      });
      return;
    }

    const novoExtrato: ExtratoImportado = {
      id: Date.now().toString(),
      contaBancariaId: data.contaBancariaId,
      nome: file.name,
      tipo: extension as "pdf" | "ofx",
      dataImportacao: new Date().toISOString().split('T')[0],
      status: "processando",
      transacoes: 0,
      conciliadas: 0,
    };

    setExtratosImportados(prev => [novoExtrato, ...prev]);

    try {
      let novosLancamentos: LancamentoExtrato[] = [];

      if (extension === 'ofx') {
        // Parse OFX client-side
        const content = await readFileAsText(file);
        const result = parseOFX(content);
        
        console.log('OFX parsed:', result);
        
        // Validate bank account matches
        const ofxConta = normalizeAccountNumber(result.accountId);
        const cadastroConta = normalizeAccountNumber(contaSelecionada.conta);
        
        // If we have account info in OFX, validate it
        if (ofxConta && cadastroConta && ofxConta !== cadastroConta) {
          setExtratosImportados(prev => 
            prev.map(e => 
              e.id === novoExtrato.id 
                ? { ...e, status: "erro", transacoes: 0 }
                : e
            )
          );
          toast({
            title: "Conta não confere",
            description: `O extrato é da conta ${result.accountId}, mas você selecionou a conta ${contaSelecionada.conta}. Verifique a conta correta.`,
            variant: "destructive",
          });
          return;
        }

        // Also check branch if available
        if (result.branchId && contaSelecionada.agencia) {
          const ofxAgencia = normalizeAccountNumber(result.branchId);
          const cadastroAgencia = normalizeAccountNumber(contaSelecionada.agencia);
          
          if (ofxAgencia !== cadastroAgencia) {
            setExtratosImportados(prev => 
              prev.map(e => 
                e.id === novoExtrato.id 
                  ? { ...e, status: "erro", transacoes: 0 }
                  : e
              )
            );
            toast({
              title: "Agência não confere",
              description: `O extrato é da agência ${result.branchId}, mas a conta cadastrada é da agência ${contaSelecionada.agencia}.`,
              variant: "destructive",
            });
            return;
          }
        }

        // Filter transactions by competência
        const primeiroDia = new Date(data.ano, data.mes - 1, 1);
        const ultimoDia = new Date(data.ano, data.mes, 0);
        
        const transacoesCompetencia = result.transactions.filter(t => {
          const dataTransacao = new Date(t.date);
          return dataTransacao >= primeiroDia && dataTransacao <= ultimoDia;
        });
        
        novosLancamentos = transacoesCompetencia.map((t, i) => ({
          id: `${novoExtrato.id}-l${i}`,
          extratoId: novoExtrato.id,
          data: t.date,
          descricao: t.description,
          valor: t.amount,
          tipo: t.type === 'credit' ? 'credito' : 'debito',
          conciliado: false,
        }));

        toast({
          title: "OFX validado",
          description: `Conta ${result.accountId || 'N/A'} | ${novosLancamentos.length} lançamentos na competência`,
        });

      } else if (extension === 'pdf') {
        // Parse PDF via edge function with AI
        toast({
          title: "Processando PDF",
          description: "Usando IA para extrair transações...",
        });

        const formData = new FormData();
        formData.append('file', file);

        const { data: pdfData, error } = await supabase.functions.invoke('parse-pdf-extrato', {
          body: formData,
        });

        if (error) {
          throw new Error(error.message || 'Erro ao processar PDF');
        }

        if (!pdfData?.success) {
          throw new Error(pdfData?.error || 'Falha ao extrair transações do PDF');
        }

        // Validate bank info from PDF if available
        if (pdfData.bankInfo) {
          const pdfAgencia = normalizeAccountNumber(pdfData.bankInfo.agencia);
          const pdfConta = normalizeAccountNumber(pdfData.bankInfo.conta);
          const cadastroAgencia = normalizeAccountNumber(contaSelecionada.agencia);
          const cadastroConta = normalizeAccountNumber(contaSelecionada.conta);

          // Validate account number if extracted
          if (pdfConta && cadastroConta && pdfConta !== cadastroConta) {
            setExtratosImportados(prev => 
              prev.map(e => 
                e.id === novoExtrato.id 
                  ? { ...e, status: "erro", transacoes: 0 }
                  : e
              )
            );
            toast({
              title: "Conta não confere",
              description: `O extrato PDF é da conta ${pdfData.bankInfo.conta}, mas você selecionou a conta ${contaSelecionada.conta}. Verifique a conta correta.`,
              variant: "destructive",
            });
            return;
          }

          // Validate branch if extracted
          if (pdfAgencia && cadastroAgencia && pdfAgencia !== cadastroAgencia) {
            setExtratosImportados(prev => 
              prev.map(e => 
                e.id === novoExtrato.id 
                  ? { ...e, status: "erro", transacoes: 0 }
                  : e
              )
            );
            toast({
              title: "Agência não confere",
              description: `O extrato PDF é da agência ${pdfData.bankInfo.agencia}, mas a conta cadastrada é da agência ${contaSelecionada.agencia}.`,
              variant: "destructive",
            });
            return;
          }

          // Validate CNPJ if extracted and empresa has CNPJ
          if (pdfData.bankInfo.cnpj && empresaAtiva?.cnpj) {
            const pdfCnpj = pdfData.bankInfo.cnpj.replace(/[^\d]/g, '');
            const empresaCnpj = empresaAtiva.cnpj.replace(/[^\d]/g, '');
            
            if (pdfCnpj && empresaCnpj && pdfCnpj !== empresaCnpj) {
              setExtratosImportados(prev => 
                prev.map(e => 
                  e.id === novoExtrato.id 
                    ? { ...e, status: "erro", transacoes: 0 }
                    : e
                )
              );
              toast({
                title: "CNPJ não confere",
                description: `O extrato pertence ao CNPJ ${pdfData.bankInfo.cnpj}, mas a empresa ativa possui CNPJ ${empresaAtiva.cnpj}.`,
                variant: "destructive",
              });
              return;
            }
          }

          console.log('PDF bank info validated:', pdfData.bankInfo);
        }

        // Filter by competência
        const primeiroDia = new Date(data.ano, data.mes - 1, 1);
        const ultimoDia = new Date(data.ano, data.mes, 0);
        
        const transacoesCompetencia = (pdfData.transactions || []).filter((t: any) => {
          const dataTransacao = new Date(t.date);
          return dataTransacao >= primeiroDia && dataTransacao <= ultimoDia;
        });

        novosLancamentos = transacoesCompetencia.map((t: any, i: number) => ({
          id: `${novoExtrato.id}-l${i}`,
          extratoId: novoExtrato.id,
          data: t.date,
          descricao: t.description,
          valor: t.amount,
          tipo: t.type === 'credit' ? 'credito' : 'debito',
          conciliado: false,
        }));
      }

      const numTransacoes = novosLancamentos.length;
      
      if (numTransacoes === 0) {
        setExtratosImportados(prev => 
          prev.map(e => 
            e.id === novoExtrato.id 
              ? { ...e, status: "erro", transacoes: 0 }
              : e
          )
        );
        toast({
          title: "Nenhuma transação encontrada",
          description: `O arquivo não contém transações válidas para ${data.mes.toString().padStart(2, '0')}/${data.ano}.`,
          variant: "destructive",
        });
        return;
      }

      // === AUTO-RECONCILIATION ===
      // Try to match statement entries with existing transactions
      let conciliadasAuto = 0;
      const transacoesDisponiveis = transacoes.filter(t => !t.conciliado);
      const idsParaConciliar: string[] = [];
      
      novosLancamentos = novosLancamentos.map(lancamento => {
        // Find matching transaction: same type, same value, similar date (±5 days)
        const tipoTransacao = lancamento.tipo === 'credito' ? 'receita' : 'despesa';
        const dataLancamento = new Date(lancamento.data);
        
        const match = transacoesDisponiveis.find(t => {
          if (t.tipo !== tipoTransacao) return false;
          if (Math.abs(Number(t.valor) - lancamento.valor) > 0.01) return false; // Allow small float differences
          
          const dataTransacao = new Date(t.data_transacao);
          const diffDias = Math.abs((dataLancamento.getTime() - dataTransacao.getTime()) / (1000 * 60 * 60 * 24));
          
          return diffDias <= 5; // Match within 5 days
        });

        if (match) {
          // Remove from available to avoid double-matching
          const idx = transacoesDisponiveis.findIndex(t => t.id === match.id);
          if (idx > -1) transacoesDisponiveis.splice(idx, 1);
          
          conciliadasAuto++;
          idsParaConciliar.push(match.id);
          return { ...lancamento, conciliado: true, transacaoVinculadaId: match.id };
        }
        
        return lancamento;
      });

      // Persist reconciliation to database
      if (idsParaConciliar.length > 0) {
        try {
          await conciliarEmMassaAsync(idsParaConciliar);
        } catch (err) {
          console.error('Erro ao conciliar em massa:', err);
        }
      }

      setLancamentosExtrato(prev => [...prev, ...novosLancamentos]);
      setExtratosImportados(prev => 
        prev.map(e => 
          e.id === novoExtrato.id 
            ? { 
                ...e, 
                status: conciliadasAuto === numTransacoes ? "concluido" : "pendente", 
                transacoes: numTransacoes, 
                conciliadas: conciliadasAuto 
              }
            : e
        )
      );
      setExtratoSelecionado(novoExtrato.id);
      setActiveTab("conciliacao");
      
      if (conciliadasAuto > 0) {
        toast({
          title: "Extrato importado com auto-conciliação",
          description: `${numTransacoes} lançamentos encontrados. ${conciliadasAuto} conciliados automaticamente!`,
        });
      } else {
        toast({
          title: "Extrato importado",
          description: `${file.name} processado. ${numTransacoes} lançamentos para conciliar manualmente.`,
        });
      }

    } catch (error) {
      console.error('Error processing file:', error);
      setExtratosImportados(prev => 
        prev.map(e => 
          e.id === novoExtrato.id 
            ? { ...e, status: "erro" }
            : e
        )
      );
      toast({
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Open modal to select transaction to link
  const handleOpenVincular = (lancamento: LancamentoExtrato) => {
    setLancamentoParaVincular(lancamento);
  };

  // Get matching transactions for linking (same type: credito->receita, debito->despesa)
  const getTransacoesParaVincular = () => {
    if (!lancamentoParaVincular) return [];
    const tipoTransacao = lancamentoParaVincular.tipo === 'credito' ? 'receita' : 'despesa';
    // Filter transactions that are not already linked and match the type
    const jaVinculadas = lancamentosExtrato
      .filter(l => l.conciliado && l.transacaoVinculadaId)
      .map(l => l.transacaoVinculadaId);
    
    return transacoesParaConciliacao.filter(t => 
      t.tipo === tipoTransacao && 
      !jaVinculadas.includes(t.id)
    );
  };

  // Link the lancamento to a transaction
  const handleVincular = async (transacaoId: string) => {
    if (!lancamentoParaVincular) return;

    const transacao = transacoesParaConciliacao.find(t => t.id === transacaoId);
    
    // Persist reconciliation to database
    try {
      await conciliarTransacaoAsync(transacaoId);
    } catch (err) {
      console.error('Erro ao conciliar:', err);
      toast({
        title: "Erro ao conciliar",
        description: "Não foi possível salvar a conciliação no banco.",
        variant: "destructive",
      });
      return;
    }
    
    setLancamentosExtrato(prev => 
      prev.map(l => 
        l.id === lancamentoParaVincular.id 
          ? { ...l, conciliado: true, transacaoVinculadaId: transacaoId } 
          : l
      )
    );

    // Update extrato counters
    setExtratosImportados(prev => 
      prev.map(e => {
        if (e.id === lancamentoParaVincular.extratoId) {
          const newConciliadas = e.conciliadas + 1;
          const newStatus = newConciliadas >= e.transacoes ? "concluido" : "pendente";
          return { ...e, conciliadas: newConciliadas, status: newStatus };
        }
        return e;
      })
    );

    setLancamentoParaVincular(null);
    
    toast({
      title: "Lançamento conciliado",
      description: `Vinculado a: ${transacao?.descricao || 'Transação'}`,
    });
  };

  // Create new transaction from lancamento (already reconciled)
  const handleCriarTransacao = async () => {
    if (!lancamentoParaVincular || !empresaAtiva?.id) return;

    try {
      // Create transaction already marked as reconciled
      const novaTransacao = await createTransacaoAsync({
        empresa_id: empresaAtiva.id,
        descricao: lancamentoParaVincular.descricao,
        valor: lancamentoParaVincular.valor,
        tipo: lancamentoParaVincular.tipo === 'credito' ? 'receita' : 'despesa',
        data_transacao: lancamentoParaVincular.data,
        status: 'pago',
      });

      // Mark the newly created transaction as reconciled
      if (novaTransacao?.id) {
        await conciliarTransacaoAsync(novaTransacao.id);
      }
      
      // Link the lancamento after transaction is created
      setLancamentosExtrato(prev => 
        prev.map(l => 
          l.id === lancamentoParaVincular.id 
            ? { ...l, conciliado: true, transacaoVinculadaId: novaTransacao?.id } 
            : l
        )
      );

      // Update extrato counters
      setExtratosImportados(prev => 
        prev.map(e => {
          if (e.id === lancamentoParaVincular.extratoId) {
            const newConciliadas = e.conciliadas + 1;
            const newStatus = newConciliadas >= e.transacoes ? "concluido" : "pendente";
            return { ...e, conciliadas: newConciliadas, status: newStatus };
          }
          return e;
        })
      );

      setLancamentoParaVincular(null);
      
      toast({
        title: "Transação criada e conciliada",
        description: `Nova ${lancamentoParaVincular.tipo === 'credito' ? 'receita' : 'despesa'} de ${formatCurrency(lancamentoParaVincular.valor)}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a transação",
        variant: "destructive",
      });
    }
  };

  const getLancamentosDoExtrato = (extratoId: string) => {
    return lancamentosExtrato.filter(l => l.extratoId === extratoId);
  };

  // Confirmar extrato (persistir no banco e criar transações para não conciliados)
  const handleConfirmarExtrato = async (extratoId: string) => {
    const extrato = extratosImportados.find(e => e.id === extratoId);
    if (!extrato || !empresaAtiva?.id) return;

    // Verificar se tem conta bancária selecionada
    if (!extrato.contaBancariaId) {
      toast({
        title: "Conta bancária não selecionada",
        description: "Selecione uma conta bancária para confirmar o extrato.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get all lancamentos of this extrato
      const lancamentosDoExtrato = getLancamentosDoExtrato(extratoId);
      const lancamentosNaoConciliados = lancamentosDoExtrato.filter(l => !l.conciliado);

      // Create transactions for non-reconciled entries
      let transacoesCriadas = 0;
      for (const lancamento of lancamentosNaoConciliados) {
        try {
          const novaTransacao = await createTransacaoAsync({
            empresa_id: empresaAtiva.id,
            descricao: lancamento.descricao,
            valor: lancamento.valor,
            tipo: lancamento.tipo === 'credito' ? 'receita' : 'despesa',
            data_transacao: lancamento.data,
            data_vencimento: lancamento.data,
            status: 'pago',
            conta_bancaria_id: extrato.contaBancariaId,
            conciliado: true,
          });

          if (novaTransacao?.id) {
            // Update lancamento as conciliado
            setLancamentosExtrato(prev => 
              prev.map(l => 
                l.id === lancamento.id 
                  ? { ...l, conciliado: true, transacaoVinculadaId: novaTransacao.id } 
                  : l
              )
            );
            transacoesCriadas++;
          }
        } catch (err) {
          console.error('Erro ao criar transação para lancamento:', lancamento.id, err);
        }
      }

      // Calculate final dates from lancamentos
      const allDates = lancamentosDoExtrato.map(l => new Date(l.data + 'T12:00:00'));
      const dataInicio = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null;
      const dataFim = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null;

      // Persist to database
      const dbRecord = await createImportacao({
        empresa_id: empresaAtiva.id,
        conta_bancaria_id: extrato.contaBancariaId,
        nome_arquivo: extrato.nome,
        tipo_arquivo: extrato.tipo,
        status: 'confirmado',
        total_transacoes: extrato.transacoes,
        transacoes_importadas: extrato.transacoes, // All are now imported/reconciled
        transacoes_duplicadas: 0,
        data_inicio: dataInicio ? dataInicio.toISOString().split('T')[0] : undefined,
        data_fim: dataFim ? dataFim.toISOString().split('T')[0] : undefined,
      });

      // Update local state
      setExtratosImportados(prev => 
        prev.map(e => 
          e.id === extratoId 
            ? { ...e, status: "confirmado", dbId: dbRecord.id, conciliadas: e.transacoes }
            : e
        )
      );

      toast({
        title: "Extrato confirmado",
        description: `${transacoesCriadas > 0 ? `${transacoesCriadas} transações criadas. ` : ''}Extrato salvo no banco de dados.`,
      });
    } catch (error) {
      console.error('Erro ao confirmar extrato:', error);
      toast({
        title: "Erro ao confirmar extrato",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Deletar extrato e reverter conciliações
  const handleDeletarExtrato = async (extratoId: string) => {
    const extrato = extratosImportados.find(e => e.id === extratoId);
    if (!extrato) return;

    try {
      // Get all linked transaction IDs from this extrato
      const lancamentosDoExtrato = getLancamentosDoExtrato(extratoId);
      const idsVinculados = lancamentosDoExtrato
        .filter(l => l.conciliado && l.transacaoVinculadaId)
        .map(l => l.transacaoVinculadaId!)
        .filter(Boolean);

      // Revert reconciliation for all linked transactions
      if (idsVinculados.length > 0) {
        await desconciliarEmMassaAsync(idsVinculados);
      }

      // Delete from database if persisted
      if (extrato.dbId) {
        await deleteImportacao(extrato.dbId);
      }

      // Remove from local state
      setExtratosImportados(prev => prev.filter(e => e.id !== extratoId));
      setLancamentosExtrato(prev => prev.filter(l => l.extratoId !== extratoId));
      
      // Clear selection if this was selected
      if (extratoSelecionado === extratoId) {
        setExtratoSelecionado(null);
      }

      toast({
        title: "Extrato excluído",
        description: `${idsVinculados.length} transações tiveram a conciliação revertida.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir extrato",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Empresa Selector */}
      <div className="p-3 border-b border-blue-500/20">
        <div className="text-xs font-bold text-blue-400 mb-3">Empresa Ativa</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between text-xs bg-card/50 border-blue-500/30"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="truncate">{empresaAtiva?.nome || 'Selecione'}</span>
              </div>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {empresasDisponiveis.map(empresa => (
              <DropdownMenuItem 
                key={empresa.id}
                onClick={() => setEmpresaAtiva(empresa)}
                className="flex flex-col items-start"
              >
                <span className="font-medium">{empresa.nome}</span>
                {empresa.cnpj && (
                  <span className="text-xs text-muted-foreground">{empresa.cnpj}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {empresaAtiva?.cnpj && (
          <p className="text-xs text-muted-foreground mt-2">CNPJ: {empresaAtiva.cnpj}</p>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="p-3 border-b border-blue-500/20">
        <div className="text-xs font-bold text-blue-400 mb-3">Modo</div>
        <div className="flex gap-2">
          <button
            onClick={() => setModo("pro")}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              modo === "pro" 
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" 
                : "bg-card/50 text-muted-foreground hover:bg-card"
            }`}
          >
            <Building2 className="w-3 h-3 inline mr-1" />
            Pro
          </button>
          <button
            onClick={() => setModo("basico")}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              modo === "basico" 
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" 
                : "bg-card/50 text-muted-foreground hover:bg-card"
            }`}
          >
            <User className="w-3 h-3 inline mr-1" />
            Básico
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="p-3 border-b border-blue-500/20">
        <div className="text-xs font-bold text-blue-400 mb-3">Filtros Rápidos</div>
        <div className="space-y-2">
          <select className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80">
            <option>Todas Categorias</option>
            <option>Serviços</option>
            <option>Infraestrutura</option>
            <option>Projetos</option>
          </select>
          <select className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80">
            <option>Todos Status</option>
            <option>Confirmado</option>
            <option>Pendente</option>
            <option>Cancelado</option>
          </select>
          <input 
            type="month" 
            className="w-full bg-background/80 border border-foreground/10 rounded-md px-2 py-1.5 text-xs text-foreground/80"
          />
        </div>
      </div>

      {/* Timeline Section */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="text-xs font-bold text-blue-400 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Atividades Recentes
        </div>
        <div className="space-y-1">
          {atividadesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : atividades.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              Nenhuma atividade registrada
            </div>
          ) : (
            atividades.slice(0, 20).map(atividade => (
              <TimelineItem key={atividade.id} atividade={atividade} />
            ))
          )}
        </div>
      </div>
    </div>
  );

  // Show message if no empresa selected
  if (!empresaLoading && !empresaAtiva) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma empresa selecionada</h2>
            <p className="text-muted-foreground mb-6">
              Para usar o FinancialACE, você precisa estar vinculado a uma empresa. 
              Entre em contato com o administrador para associar seu usuário a uma empresa.
            </p>
            {empresasDisponiveis.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selecione uma empresa:</p>
                {empresasDisponiveis.map(empresa => (
                  <Button 
                    key={empresa.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setEmpresaAtiva(empresa)}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    {empresa.nome}
                    {empresa.cnpj && <span className="ml-2 text-xs text-muted-foreground">({empresa.cnpj})</span>}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-24">
      <UserHeader />
      <WidgetRibbon 
        groups={widgetGroups} 
        title={`FinancialACE ${modo === "pro" ? "Pro" : "Básico"} - ${empresaAtiva?.nome || ''}`}
        accentColor="blue" 
        sidebarContent={sidebarContent}
      />
      
      <div className="p-4 pr-72">
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MetricCard 
            title="Saldo Atual" 
            value={formatCurrency(saldo)} 
            change={saldo >= 0 ? "+12% este mês" : "-8% este mês"} 
            changeType={saldo >= 0 ? "up" : "down"} 
            icon={Wallet} 
            color={saldo >= 0 ? "green" : "red"}
            isActive={activeFilter === "all"}
            onClick={() => handleFilterClick("all")}
          />
          <MetricCard 
            title="Receitas" 
            value={formatCurrency(totalReceitas)} 
            change="+15% este mês" 
            changeType="up" 
            icon={TrendingUp} 
            color="green"
            isActive={activeFilter === "receitas"}
            onClick={() => handleFilterClick("receitas")}
          />
          <MetricCard 
            title="Despesas" 
            value={formatCurrency(totalDespesas)} 
            change="+5% este mês" 
            changeType="down" 
            icon={TrendingDown} 
            color="red"
            isActive={activeFilter === "despesas"}
            onClick={() => handleFilterClick("despesas")}
          />
          <MetricCard 
            title="Pendentes" 
            value={pendentes} 
            change="Atenção!" 
            changeType="down" 
            icon={AlertTriangle} 
            color="yellow"
            isActive={activeFilter === "pendentes"}
            onClick={() => handleFilterClick("pendentes")}
          />
        </div>

        {/* Filter indicator */}
        {activeFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtro ativo:</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {activeFilter === "receitas" ? "Receitas" : activeFilter === "despesas" ? "Despesas" : "Pendentes"}
            </span>
            <button 
              onClick={() => setActiveFilter("all")}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Section Selector */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex bg-card/50 rounded-lg p-1 border border-foreground/10">
            <button 
              onClick={() => { setActiveSection("financeiro"); setActiveTab("transacoes"); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeSection === "financeiro" ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wallet className="w-4 h-4" /> Financeiro
            </button>
            <button 
              onClick={() => { setActiveSection("gestao"); setActiveTab("produtos"); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeSection === "gestao" ? "bg-green-500 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-4 h-4" /> Gestão
            </button>
          </div>
          
          <div className="h-6 w-px bg-border" />
          
          {/* Dynamic Tabs based on Section */}
          <div className="flex gap-2 flex-1 overflow-x-auto">
            {activeSection === "financeiro" ? (
              <>
                <button
                  onClick={() => setActiveTab("transacoes")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "transacoes" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Receipt className="w-4 h-4 inline mr-1" />Transações
                </button>
                <button
                  onClick={() => setActiveTab("categorias")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "categorias" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <PieChart className="w-4 h-4 inline mr-1" />Categorias
                </button>
                <button
                  onClick={() => setActiveTab("contas")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "contas" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Landmark className="w-4 h-4 inline mr-1" />Contas
                </button>
                <button
                  onClick={() => setActiveTab("conciliacao")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "conciliacao" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Link2 className="w-4 h-4 inline mr-1" />Conciliação
                </button>
                <button
                  onClick={() => setActiveTab("centros_custo")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "centros_custo" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Building2 className="w-4 h-4 inline mr-1" />Centros Custo
                </button>
                <button
                  onClick={() => setActiveTab("metas")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "metas" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Target className="w-4 h-4 inline mr-1" />Metas
                </button>
                <button
                  onClick={() => setActiveTab("recorrencias")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "recorrencias" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Clock className="w-4 h-4 inline mr-1" />Recorrências
                </button>
                {modo === "pro" && (
                  <button
                    onClick={() => setActiveTab("relatorios")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "relatorios" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                  >
                    <BarChart3 className="w-4 h-4 inline mr-1" />Relatórios
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab("produtos")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "produtos" ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Package className="w-4 h-4 inline mr-1" />Produtos
                </button>
                <button
                  onClick={() => setActiveTab("clientes")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "clientes" ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Users className="w-4 h-4 inline mr-1" />Clientes
                </button>
                <button
                  onClick={() => setActiveTab("fornecedores")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "fornecedores" ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Truck className="w-4 h-4 inline mr-1" />Fornecedores
                </button>
                <button
                  onClick={() => setActiveTab("vendas")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "vendas" ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <ShoppingCart className="w-4 h-4 inline mr-1" />Vendas
                </button>
                <button
                  onClick={() => setActiveTab("compras")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "compras" ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <ShoppingBag className="w-4 h-4 inline mr-1" />Compras
                </button>
                <button
                  onClick={() => setActiveTab("estoque")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "estoque" ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <Package className="w-4 h-4 inline mr-1" />Estoque
                </button>
                <button
                  onClick={() => setActiveTab("orcamentos")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === "orcamentos" ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" : "bg-card/50 text-muted-foreground hover:bg-card"}`}
                >
                  <FileText className="w-4 h-4 inline mr-1" />Orçamentos
                </button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-card/50 rounded-lg p-1 border border-foreground/10">
              <button onClick={() => setViewMode("lista")} className={`p-2 rounded-md transition-all ${viewMode === "lista" ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content - Financeiro */}
        {activeTab === "transacoes" && empresaAtiva && (
          <TransacoesManager 
            empresaId={empresaAtiva.id}
            tipoFiltro={activeFilter === "receitas" ? "receita" : activeFilter === "despesas" ? "despesa" : undefined}
            statusFiltro={activeFilter === "pendentes" ? "pendente" : undefined}
          />
        )}

        {activeTab === "categorias" && empresaAtiva && (
          <CategoriasManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "contas" && empresaAtiva && (
          <ContasBancariasManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "centros_custo" && empresaAtiva && (
          <CentrosCustoManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "metas" && empresaAtiva && (
          <MetasFinanceirasManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "recorrencias" && empresaAtiva && (
          <RecorrenciasManager empresaId={empresaAtiva.id} />
        )}

        {/* Content - Gestão */}
        {activeTab === "produtos" && empresaAtiva && (
          <ProdutosManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "clientes" && empresaAtiva && (
          <ClientesManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "fornecedores" && empresaAtiva && (
          <FornecedoresManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "vendas" && empresaAtiva && (
          <VendasManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "compras" && empresaAtiva && (
          <ComprasManager empresaId={empresaAtiva.id} empresaCnpj={empresaAtiva.cnpj} />
        )}

        {activeTab === "estoque" && empresaAtiva && (
          <EstoqueManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "orcamentos" && empresaAtiva && (
          <OrcamentosManager empresaId={empresaAtiva.id} />
        )}

        {activeTab === "conciliacao" && (
          <div className="space-y-4">
            {/* Compact Upload Area */}
            <div className="bg-card/30 backdrop-blur-xl rounded-xl border border-blue-500/20 p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Importar Extrato Bancário</h3>
                    <p className="text-xs text-muted-foreground">Formatos aceitos: PDF ou OFX</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.ofx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="extrato-upload"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Selecionar Arquivo
                </Button>
              </div>
            </div>

            {/* Lançamentos do Extrato Selecionado para Conciliação */}
            {extratoSelecionado && (
              <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 overflow-hidden">
                <div className="p-4 border-b border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">Lançamentos para Conciliar</h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                      {extratosImportados.find(e => e.id === extratoSelecionado)?.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {getLancamentosDoExtrato(extratoSelecionado).filter(l => l.conciliado).length}/{getLancamentosDoExtrato(extratoSelecionado).length} conciliados
                    </span>
                    <button 
                      onClick={() => setExtratoSelecionado(null)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-blue-500/10">
                    <tr>
                      <th className="text-left p-3 font-medium text-foreground/80">Data</th>
                      <th className="text-left p-3 font-medium text-foreground/80">Descrição</th>
                      <th className="text-right p-3 font-medium text-foreground/80">Valor</th>
                      <th className="text-center p-3 font-medium text-foreground/80">Status</th>
                      <th className="text-center p-3 font-medium text-foreground/80">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {getLancamentosDoExtrato(extratoSelecionado).map(lancamento => (
                      <tr key={lancamento.id} className={`hover:bg-foreground/5 transition-colors ${lancamento.conciliado ? 'opacity-60' : ''}`}>
                        <td className="p-3 text-muted-foreground">
                          {new Date(lancamento.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${
                              lancamento.tipo === "credito" ? "bg-green-500/20" : "bg-red-500/20"
                            }`}>
                              {lancamento.tipo === "credito" ? (
                                <ArrowUpRight className="w-3 h-3 text-green-400" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 text-red-400" />
                              )}
                            </div>
                            <span className="font-medium text-foreground text-xs">{lancamento.descricao}</span>
                          </div>
                        </td>
                        <td className={`p-3 text-right font-semibold ${lancamento.tipo === "credito" ? "text-green-400" : "text-red-400"}`}>
                          {lancamento.tipo === "credito" ? "+" : "-"}{formatCurrency(lancamento.valor)}
                        </td>
                        <td className="p-3 text-center">
                          {lancamento.conciliado ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 flex items-center gap-1 w-fit mx-auto">
                              <CheckCircle2 className="w-3 h-3" />
                              Conciliado
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!lancamento.conciliado && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenVincular(lancamento)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                            >
                              <Link2 className="w-4 h-4 mr-1" />
                              Vincular
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Imported Files List */}
            {extratosImportados.length > 0 && (
              <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 overflow-hidden">
                <div className="p-4 border-b border-blue-500/20">
                  <h3 className="font-semibold text-foreground">Extratos Importados</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-blue-500/10">
                    <tr>
                      <th className="text-left p-3 font-medium text-foreground/80">Arquivo</th>
                      <th className="text-left p-3 font-medium text-foreground/80">Tipo</th>
                      <th className="text-left p-3 font-medium text-foreground/80">Data</th>
                      <th className="text-left p-3 font-medium text-foreground/80">Status</th>
                      <th className="text-center p-3 font-medium text-foreground/80">Progresso</th>
                      <th className="text-center p-3 font-medium text-foreground/80">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {extratosImportados.map(extrato => (
                      <tr 
                        key={extrato.id} 
                        className={`hover:bg-foreground/5 transition-colors cursor-pointer ${extratoSelecionado === extrato.id ? 'bg-blue-500/10' : ''}`}
                        onClick={() => extrato.status !== "processando" && setExtratoSelecionado(extrato.id)}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              extrato.tipo === "ofx" ? "bg-green-500/20" : "bg-red-500/20"
                            }`}>
                              <FileText className={`w-4 h-4 ${extrato.tipo === "ofx" ? "text-green-400" : "text-red-400"}`} />
                            </div>
                            <div>
                              <span className="font-medium text-foreground text-sm">{extrato.nome}</span>
                              {extrato.contaBancariaId && (
                                <div className="text-xs text-muted-foreground">
                                  {contas.find(c => c.id === extrato.contaBancariaId)?.nome || 'Conta desconhecida'}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                            extrato.tipo === "ofx" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                          }`}>
                            {extrato.tipo}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-sm">
                          {new Date(extrato.dataImportacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                            extrato.status === "confirmado" ? "bg-blue-500/20 text-blue-300" :
                            extrato.status === "concluido" ? "bg-green-500/20 text-green-300" :
                            extrato.status === "processando" ? "bg-blue-500/20 text-blue-300" :
                            extrato.status === "pendente" ? "bg-yellow-500/20 text-yellow-300" :
                            "bg-red-500/20 text-red-300"
                          }`}>
                            {extrato.status === "confirmado" && <CheckCircle2 className="w-3 h-3" />}
                            {extrato.status === "concluido" && <CheckCircle2 className="w-3 h-3" />}
                            {extrato.status === "processando" && <Clock className="w-3 h-3 animate-spin" />}
                            {extrato.status === "pendente" && <AlertTriangle className="w-3 h-3" />}
                            {extrato.status === "erro" && <XCircle className="w-3 h-3" />}
                            {extrato.status === "confirmado" ? "Confirmado" : 
                             extrato.status === "concluido" ? "Concluído" : 
                             extrato.status === "pendente" ? "Pendente" : extrato.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-foreground/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  extrato.conciliadas === extrato.transacoes ? "bg-green-500" : "bg-yellow-500"
                                }`}
                                style={{ width: `${extrato.transacoes > 0 ? (extrato.conciliadas / extrato.transacoes) * 100 : 0}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${
                              extrato.conciliadas === extrato.transacoes ? "text-green-400" : "text-yellow-400"
                            }`}>
                              {extrato.conciliadas}/{extrato.transacoes}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {extrato.status === "pendente" && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setExtratoSelecionado(extrato.id)}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                              >
                                <Link2 className="w-4 h-4 mr-1" />
                                Conciliar
                              </Button>
                            )}
                            {(extrato.status === "concluido" || extrato.status === "pendente") && !extrato.dbId && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleConfirmarExtrato(extrato.id)}
                                className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Confirmar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletarExtrato(extrato.id)}
                              disabled={isDeletingImportacao}
                              className="text-muted-foreground hover:text-red-400 hover:bg-red-500/20"
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
          </div>
        )}

        {activeTab === "relatorios" && modo === "pro" && empresaAtiva && (
          <RelatoriosManager empresaId={empresaAtiva.id} />
        )}
      </div>

      {/* Modal de Vinculação */}
      <Dialog open={!!lancamentoParaVincular} onOpenChange={() => setLancamentoParaVincular(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Lançamento</DialogTitle>
          </DialogHeader>
          
          {lancamentoParaVincular && (
            <div className="space-y-4">
              {/* Lancamento Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Lançamento do Extrato:</div>
                <div className="font-medium">{lancamentoParaVincular.descricao}</div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className={lancamentoParaVincular.tipo === 'credito' ? 'text-green-500' : 'text-red-500'}>
                    {lancamentoParaVincular.tipo === 'credito' ? '+' : '-'} {formatCurrency(lancamentoParaVincular.valor)}
                  </span>
                  <span className="text-muted-foreground">{lancamentoParaVincular.data}</span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Vincular a uma {lancamentoParaVincular.tipo === 'credito' ? 'receita' : 'despesa'} existente:
                </div>
                
                {getTransacoesParaVincular().length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {getTransacoesParaVincular().map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleVincular(t.id)}
                        className="w-full p-3 text-left rounded-lg border border-foreground/10 hover:bg-muted/50 transition-colors"
                      >
                        <div className="font-medium text-sm">{t.descricao}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className={t.tipo === 'receita' ? 'text-green-500' : 'text-red-500'}>
                            {formatCurrency(t.valor)}
                          </span>
                          <span>{t.data}</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted">{t.categoria}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    Nenhuma {lancamentoParaVincular.tipo === 'credito' ? 'receita' : 'despesa'} disponível para vincular.
                  </div>
                )}
              </div>

              {/* Create New Transaction */}
              <div className="pt-4 border-t border-foreground/10">
                <Button 
                  onClick={handleCriarTransacao}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar nova {lancamentoParaVincular.tipo === 'credito' ? 'receita' : 'despesa'} e vincular
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Importação com Competência e Conta */}
      <ImportExtratoModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onConfirm={handleFileUpload}
        fileName={pendingFile?.name || ''}
        contas={contas}
        isLoadingContas={isLoadingContas}
      />
    </div>
  );
}
