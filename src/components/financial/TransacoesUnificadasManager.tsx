import { useState, useMemo, useRef } from "react";
import { useTransacoes, TransacaoInput } from "@/hooks/useTransacoes";
import { useCategorias } from "@/hooks/useCategorias";
import { useContasBancarias } from "@/hooks/useContasBancarias";
import { useClientes } from "@/hooks/useClientes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseOFX, readFileAsText, normalizeAccountNumber } from "@/utils/ofxParser";
import { formatCurrency } from "@/lib/formatters";
import { useImportacoesExtrato } from "@/hooks/useImportacoesExtrato";
import { ImportExtratoModal } from "./ImportExtratoModal";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertCircle,
  Copy,
  Upload,
  FileUp,
  CheckCircle2,
  Link2,
  FileText,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Ban,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TransacoesUnificadasManagerProps {
  empresaId: string;
  empresaCnpj?: string | null;
  tipoFiltro?: string;
  statusFiltro?: string;
}

interface ExtratoImportado {
  id: string;
  dbId?: string;
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

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", color: "yellow" },
  { value: "pago", label: "Pago", color: "green" },
  { value: "cancelado", label: "Cancelado", color: "red" },
];

const FORMAS_PAGAMENTO = [
  "Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito",
  "Boleto", "Transferência", "Cheque", "Outro",
];

const MESES = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" }, { value: 4, label: "Abril" },
  { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" }, { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

const pad2 = (n: number) => String(n).padStart(2, "0");
const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const getDefaultCompetencia = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
};

const clampDateToCompetencia = (date: Date, ano: number, mes: number) => {
  const firstDay = new Date(ano, mes - 1, 1);
  const lastDay = new Date(ano, mes, 0);
  const time = Math.min(Math.max(date.getTime(), firstDay.getTime()), lastDay.getTime());
  return toDateInputValue(new Date(time));
};

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
};

export function TransacoesUnificadasManager({ 
  empresaId, 
  empresaCnpj,
  tipoFiltro, 
  statusFiltro 
}: TransacoesUnificadasManagerProps) {
  const { toast } = useToast();
  const today = new Date();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultCompetencia = getDefaultCompetencia();

  // State
  const [competenciaAno, setCompetenciaAno] = useState(defaultCompetencia.ano);
  const [competenciaMes, setCompetenciaMes] = useState(defaultCompetencia.mes);
  const [showPendentesExtrato, setShowPendentesExtrato] = useState(true);
  const [showExtratosImportados, setShowExtratosImportados] = useState(false);

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Extrato state
  const [extratosImportados, setExtratosImportados] = useState<ExtratoImportado[]>([]);
  const [lancamentosExtrato, setLancamentosExtrato] = useState<LancamentoExtrato[]>([]);
  const [lancamentoParaVincular, setLancamentoParaVincular] = useState<LancamentoExtrato | null>(null);

  // Transaction form state
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TransacaoInput> & { competencia_ano?: number; competencia_mes?: number }>({
    descricao: "",
    valor: 0,
    tipo: "despesa",
    status: "pendente",
    data_transacao: clampDateToCompetencia(today, defaultCompetencia.ano, defaultCompetencia.mes),
    categoria_id: "",
    conta_bancaria_id: "",
    cliente_id: "",
    forma_pagamento: "",
    observacoes: "",
    competencia_ano: defaultCompetencia.ano,
    competencia_mes: defaultCompetencia.mes,
  });

  // Data hooks
  const dataInicio = `${competenciaAno}-${pad2(competenciaMes)}-01`;
  const lastDayCompetencia = new Date(competenciaAno, competenciaMes, 0).getDate();
  const dataFim = `${competenciaAno}-${pad2(competenciaMes)}-${pad2(lastDayCompetencia)}`;

  const { 
    transacoes, 
    isLoading, 
    createTransacao, 
    createTransacaoAsync,
    updateTransacao, 
    deleteTransacao, 
    isCreating,
    conciliarTransacaoAsync,
    conciliarEmMassaAsync,
    desconciliarEmMassaAsync,
  } = useTransacoes(empresaId, {
    tipo: tipoFiltro,
    status: statusFiltro,
    dataInicio,
    dataFim,
  });
  
  const { categorias } = useCategorias(empresaId);
  const { contas } = useContasBancarias(empresaId);
  const { clientes } = useClientes(empresaId);
  const { 
    importacoes, 
    createImportacao, 
    deleteImportacao, 
    isDeleting: isDeletingImportacao 
  } = useImportacoesExtrato(empresaId);

  // Lançamentos pendentes do extrato (não conciliados)
  const lancamentosPendentes = useMemo(() => 
    lancamentosExtrato.filter(l => !l.conciliado),
    [lancamentosExtrato]
  );

  // Date limits
  const dateLimits = useMemo(() => {
    const ano = formData.competencia_ano || today.getFullYear();
    const mes = formData.competencia_mes || (today.getMonth() + 1);
    const firstDay = new Date(ano, mes - 1, 1);
    const lastDay = new Date(ano, mes, 0);
    const primeiroDiaMesAnterior = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const minDate = firstDay > primeiroDiaMesAnterior ? firstDay : primeiroDiaMesAnterior;
    return {
      min: minDate.toISOString().split("T")[0],
      max: lastDay.toISOString().split("T")[0],
      firstDay: firstDay.toISOString().split("T")[0],
      lastDay: lastDay.toISOString().split("T")[0],
    };
  }, [formData.competencia_ano, formData.competencia_mes, today]);

  const isDateValid = useMemo(() => {
    if (!formData.data_transacao) return false;
    const selectedDate = new Date(formData.data_transacao + "T00:00:00");
    const primeiroDiaMesAnterior = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const minDate = new Date(dateLimits.firstDay + "T00:00:00");
    const maxDate = new Date(dateLimits.lastDay + "T00:00:00");
    return selectedDate >= primeiroDiaMesAnterior && selectedDate >= minDate && selectedDate <= maxDate;
  }, [formData.data_transacao, dateLimits, today]);

  // Form handlers
  const resetForm = () => {
    setFormData({
      descricao: "",
      valor: 0,
      tipo: "despesa",
      status: "pendente",
      data_transacao: clampDateToCompetencia(today, competenciaAno, competenciaMes),
      categoria_id: "",
      conta_bancaria_id: "",
      cliente_id: "",
      forma_pagamento: "",
      observacoes: "",
      competencia_ano: competenciaAno,
      competencia_mes: competenciaMes,
    });
    setEditingId(null);
  };

  const handleOpenEdit = (transacao: typeof transacoes[0]) => {
    setFormData({
      descricao: transacao.descricao,
      valor: transacao.valor,
      tipo: transacao.tipo,
      status: transacao.status,
      data_transacao: transacao.data_transacao,
      data_vencimento: transacao.data_vencimento || undefined,
      categoria_id: transacao.categoria_id || "",
      conta_bancaria_id: transacao.conta_bancaria_id || "",
      cliente_id: transacao.cliente_id || "",
      forma_pagamento: transacao.forma_pagamento || "",
      observacoes: transacao.observacoes || "",
    });
    setEditingId(transacao.id);
    setIsOpen(true);
  };

  const handleCopyTransacao = (transacao: typeof transacoes[0]) => {
    setFormData({
      descricao: transacao.descricao,
      valor: transacao.valor,
      tipo: transacao.tipo,
      status: "pendente",
      data_transacao: clampDateToCompetencia(today, competenciaAno, competenciaMes),
      data_vencimento: undefined,
      categoria_id: transacao.categoria_id || "",
      conta_bancaria_id: transacao.conta_bancaria_id || "",
      cliente_id: transacao.cliente_id || "",
      forma_pagamento: transacao.forma_pagamento || "",
      observacoes: transacao.observacoes || "",
      competencia_ano: competenciaAno,
      competencia_mes: competenciaMes,
    });
    setEditingId(null);
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.descricao || !formData.valor) return;

    if (!isDateValid && !editingId) {
      toast({
        title: "Data inválida",
        description: `A data deve estar dentro da competência ${String(formData.competencia_mes).padStart(2, "0")}/${formData.competencia_ano} e não pode ser anterior ao mês passado.`,
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      categoria_id: formData.categoria_id || undefined,
      conta_bancaria_id: formData.conta_bancaria_id || undefined,
      cliente_id: formData.cliente_id || undefined,
      competencia_ano: formData.competencia_ano,
      competencia_mes: formData.competencia_mes,
    };

    if (editingId) {
      updateTransacao({ id: editingId, ...submitData });
    } else {
      createTransacao({ ...submitData, empresa_id: empresaId } as TransacaoInput);
    }
    setIsOpen(false);
    resetForm();
  };

  const categoriasDoTipo = categorias.filter(c => c.tipo === formData.tipo);

  // ==== EXTRATO / CONCILIAÇÃO ====
  
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

    setPendingFile(file);
    setImportModalOpen(true);
    
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

    const contaSelecionada = contas.find(c => c.id === data.contaBancariaId);
    if (!contaSelecionada) {
      toast({ title: "Erro", description: "Conta bancária não encontrada.", variant: "destructive" });
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
        const content = await readFileAsText(file);
        const result = parseOFX(content);
        
        const ofxConta = normalizeAccountNumber(result.accountId);
        const cadastroConta = normalizeAccountNumber(contaSelecionada.conta);
        
        if (ofxConta && cadastroConta && ofxConta !== cadastroConta) {
          setExtratosImportados(prev => prev.map(e => e.id === novoExtrato.id ? { ...e, status: "erro" } : e));
          toast({ title: "Conta não confere", description: `O extrato é da conta ${result.accountId}, mas você selecionou ${contaSelecionada.conta}.`, variant: "destructive" });
          return;
        }

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

      } else if (extension === 'pdf') {
        toast({ title: "Processando PDF", description: "Usando IA para extrair transações..." });

        const formData = new FormData();
        formData.append('file', file);

        const { data: pdfData, error } = await supabase.functions.invoke('parse-pdf-extrato', {
          body: formData,
        });

        if (error || !pdfData?.success) {
          throw new Error(pdfData?.error || error?.message || 'Falha ao extrair transações do PDF');
        }

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
        setExtratosImportados(prev => prev.map(e => e.id === novoExtrato.id ? { ...e, status: "erro" } : e));
        toast({ title: "Nenhuma transação", description: `Arquivo não contém transações para ${data.mes.toString().padStart(2, '0')}/${data.ano}.`, variant: "destructive" });
        return;
      }

      // AUTO-CONCILIAÇÃO
      let conciliadasAuto = 0;
      const transacoesDisponiveis = transacoes.filter(t => !t.conciliado);
      const idsParaConciliar: string[] = [];
      
      novosLancamentos = novosLancamentos.map(lancamento => {
        const tipoTransacao = lancamento.tipo === 'credito' ? 'receita' : 'despesa';
        const dataLancamento = new Date(lancamento.data);
        
        const match = transacoesDisponiveis.find(t => {
          if (t.tipo !== tipoTransacao) return false;
          if (Math.abs(Number(t.valor) - lancamento.valor) > 0.01) return false;
          const dataTransacao = new Date(t.data_transacao);
          const diffDias = Math.abs((dataLancamento.getTime() - dataTransacao.getTime()) / (1000 * 60 * 60 * 24));
          return diffDias <= 5;
        });

        if (match) {
          const idx = transacoesDisponiveis.findIndex(t => t.id === match.id);
          if (idx > -1) transacoesDisponiveis.splice(idx, 1);
          conciliadasAuto++;
          idsParaConciliar.push(match.id);
          return { ...lancamento, conciliado: true, transacaoVinculadaId: match.id };
        }
        
        return lancamento;
      });

      if (idsParaConciliar.length > 0) {
        await conciliarEmMassaAsync({ ids: idsParaConciliar, origemExtrato: true });
      }

      setLancamentosExtrato(prev => [...prev, ...novosLancamentos]);
      setExtratosImportados(prev => 
        prev.map(e => 
          e.id === novoExtrato.id 
            ? { ...e, status: conciliadasAuto === numTransacoes ? "concluido" : "pendente", transacoes: numTransacoes, conciliadas: conciliadasAuto }
            : e
        )
      );
      setShowPendentesExtrato(true);
      
      toast({
        title: conciliadasAuto > 0 ? "Extrato importado com auto-conciliação" : "Extrato importado",
        description: `${numTransacoes} lançamentos. ${conciliadasAuto > 0 ? `${conciliadasAuto} conciliados automaticamente!` : 'Verifique os itens pendentes.'}`,
      });

    } catch (error) {
      console.error('Error processing file:', error);
      setExtratosImportados(prev => prev.map(e => e.id === novoExtrato.id ? { ...e, status: "erro" } : e));
      toast({ title: "Erro ao processar arquivo", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    }
  };

  // Vincular lançamento a transação existente
  const handleVincular = async (transacaoId: string) => {
    if (!lancamentoParaVincular) return;

    try {
      await conciliarTransacaoAsync({ id: transacaoId, origemExtrato: true });
      
      setLancamentosExtrato(prev => 
        prev.map(l => l.id === lancamentoParaVincular.id ? { ...l, conciliado: true, transacaoVinculadaId: transacaoId } : l)
      );

      setExtratosImportados(prev => 
        prev.map(e => {
          if (e.id === lancamentoParaVincular.extratoId) {
            const newConciliadas = e.conciliadas + 1;
            return { ...e, conciliadas: newConciliadas, status: newConciliadas >= e.transacoes ? "concluido" : "pendente" };
          }
          return e;
        })
      );

      setLancamentoParaVincular(null);
      toast({ title: "Lançamento conciliado" });
    } catch (err) {
      toast({ title: "Erro ao conciliar", variant: "destructive" });
    }
  };

  // Criar transação a partir do lançamento
  const handleCriarTransacaoFromLancamento = async (lancamento: LancamentoExtrato) => {
    try {
      const extrato = extratosImportados.find(e => e.id === lancamento.extratoId);
      
      const novaTransacao = await createTransacaoAsync({
        empresa_id: empresaId,
        descricao: lancamento.descricao,
        valor: lancamento.valor,
        tipo: lancamento.tipo === 'credito' ? 'receita' : 'despesa',
        data_transacao: lancamento.data,
        status: 'pago',
        conta_bancaria_id: extrato?.contaBancariaId,
        origem_extrato: true,
      });

      if (novaTransacao?.id) {
        await conciliarTransacaoAsync({ id: novaTransacao.id, origemExtrato: true });
      }
      
      setLancamentosExtrato(prev => 
        prev.map(l => l.id === lancamento.id ? { ...l, conciliado: true, transacaoVinculadaId: novaTransacao?.id } : l)
      );

      setExtratosImportados(prev => 
        prev.map(e => {
          if (e.id === lancamento.extratoId) {
            const newConciliadas = e.conciliadas + 1;
            return { ...e, conciliadas: newConciliadas, status: newConciliadas >= e.transacoes ? "concluido" : "pendente" };
          }
          return e;
        })
      );
      
      toast({ title: "Transação criada e conciliada", description: `${lancamento.tipo === 'credito' ? 'Receita' : 'Despesa'} de ${formatCurrency(lancamento.valor)}` });
    } catch (error) {
      toast({ title: "Erro ao criar transação", variant: "destructive" });
    }
  };

  // Ignorar lançamento (marcar como conciliado sem vincular)
  const handleIgnorarLancamento = (lancamento: LancamentoExtrato) => {
    setLancamentosExtrato(prev => 
      prev.map(l => l.id === lancamento.id ? { ...l, conciliado: true } : l)
    );

    setExtratosImportados(prev => 
      prev.map(e => {
        if (e.id === lancamento.extratoId) {
          const newConciliadas = e.conciliadas + 1;
          return { ...e, conciliadas: newConciliadas, status: newConciliadas >= e.transacoes ? "concluido" : "pendente" };
        }
        return e;
      })
    );
    
    toast({ title: "Lançamento ignorado" });
  };

  // Transações disponíveis para vincular
  const getTransacoesParaVincular = () => {
    if (!lancamentoParaVincular) return [];
    const tipoTransacao = lancamentoParaVincular.tipo === 'credito' ? 'receita' : 'despesa';
    const jaVinculadas = lancamentosExtrato
      .filter(l => l.conciliado && l.transacaoVinculadaId)
      .map(l => l.transacaoVinculadaId);
    
    return transacoes.filter(t => 
      t.tipo === tipoTransacao && 
      !t.conciliado &&
      !jaVinculadas.includes(t.id)
    );
  };

  // Deletar extrato
  const handleDeletarExtrato = async (extratoId: string) => {
    const extrato = extratosImportados.find(e => e.id === extratoId);
    if (!extrato) return;

    try {
      const lancamentosDoExtrato = lancamentosExtrato.filter(l => l.extratoId === extratoId);
      const idsVinculados = lancamentosDoExtrato
        .filter(l => l.conciliado && l.transacaoVinculadaId)
        .map(l => l.transacaoVinculadaId!)
        .filter(Boolean);

      if (idsVinculados.length > 0) {
        await desconciliarEmMassaAsync(idsVinculados);
      }

      if (extrato.dbId) {
        await deleteImportacao(extrato.dbId);
      }

      setExtratosImportados(prev => prev.filter(e => e.id !== extratoId));
      setLancamentosExtrato(prev => prev.filter(l => l.extratoId !== extratoId));

      toast({ title: "Extrato excluído", description: `${idsVinculados.length} transações desconciliadas.` });
    } catch (error) {
      toast({ title: "Erro ao excluir extrato", variant: "destructive" });
    }
  };

  // Confirmar extrato
  const handleConfirmarExtrato = async (extratoId: string) => {
    const extrato = extratosImportados.find(e => e.id === extratoId);
    if (!extrato || !extrato.contaBancariaId) {
      toast({ title: "Selecione uma conta bancária", variant: "destructive" });
      return;
    }

    try {
      const lancamentosDoExtrato = lancamentosExtrato.filter(l => l.extratoId === extratoId);
      const lancamentosNaoConciliados = lancamentosDoExtrato.filter(l => !l.conciliado);

      for (const lancamento of lancamentosNaoConciliados) {
        const novaTransacao = await createTransacaoAsync({
          empresa_id: empresaId,
          descricao: lancamento.descricao,
          valor: lancamento.valor,
          tipo: lancamento.tipo === 'credito' ? 'receita' : 'despesa',
          data_transacao: lancamento.data,
          status: 'pago',
          conta_bancaria_id: extrato.contaBancariaId,
          conciliado: true,
          origem_extrato: true,
        });

        if (novaTransacao?.id) {
          setLancamentosExtrato(prev => 
            prev.map(l => l.id === lancamento.id ? { ...l, conciliado: true, transacaoVinculadaId: novaTransacao.id } : l)
          );
        }
      }

      const allDates = lancamentosDoExtrato.map(l => new Date(l.data + 'T12:00:00'));
      const dataInicio = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null;
      const dataFim = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null;

      const dbRecord = await createImportacao({
        empresa_id: empresaId,
        conta_bancaria_id: extrato.contaBancariaId,
        nome_arquivo: extrato.nome,
        tipo_arquivo: extrato.tipo,
        status: 'confirmado',
        total_transacoes: extrato.transacoes,
        transacoes_importadas: extrato.transacoes,
        transacoes_duplicadas: 0,
        data_inicio: dataInicio?.toISOString().split('T')[0],
        data_fim: dataFim?.toISOString().split('T')[0],
      });

      setExtratosImportados(prev => 
        prev.map(e => e.id === extratoId ? { ...e, status: "confirmado", dbId: dbRecord.id, conciliadas: e.transacoes } : e)
      );

      toast({ title: "Extrato confirmado", description: `${lancamentosNaoConciliados.length} transações criadas.` });
    } catch (error) {
      toast({ title: "Erro ao confirmar extrato", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com Competência e Ações */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Competência:</span>
            <Select value={String(competenciaMes)} onValueChange={(v) => setCompetenciaMes(parseInt(v))}>
              <SelectTrigger className="w-32 h-8 border-0 bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map(mes => (
                  <SelectItem key={mes.value} value={String(mes.value)}>{mes.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">/</span>
            <Select value={String(competenciaAno)} onValueChange={(v) => setCompetenciaAno(parseInt(v))}>
              <SelectTrigger className="w-20 h-8 border-0 bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableYears().map(ano => (
                  <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">{transacoes.length} transações</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Importar Extrato */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.ofx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button 
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <FileUp className="w-4 h-4 mr-1" />
            Importar Extrato
          </Button>

          {/* Nova Transação */}
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                <Plus className="w-4 h-4 mr-1" /> Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Transação" : "Nova Transação"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Tipo */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo: "receita", categoria_id: "" }))}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      formData.tipo === "receita" ? "bg-green-500 text-white" : "bg-card/50 text-muted-foreground hover:bg-card border border-foreground/10"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo: "despesa", categoria_id: "" }))}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      formData.tipo === "despesa" ? "bg-red-500 text-white" : "bg-card/50 text-muted-foreground hover:bg-card border border-foreground/10"
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" /> Despesa
                  </button>
                </div>

                {/* Descrição e Valor */}
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input placeholder="Ex: Pagamento fornecedor" value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={formData.valor} onChange={(e) => setFormData(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))} />
                </div>

                {/* Competência */}
                <div className="space-y-2">
                  <Label>Competência *</Label>
                  <div className="flex gap-2">
                    <Select value={String(formData.competencia_mes)} onValueChange={(v) => setFormData(prev => ({ ...prev, competencia_mes: parseInt(v) }))}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MESES.map(mes => (<SelectItem key={mes.value} value={String(mes.value)}>{mes.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={String(formData.competencia_ano)} onValueChange={(v) => setFormData(prev => ({ ...prev, competencia_ano: parseInt(v) }))}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {getAvailableYears().map(ano => (<SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input type="date" value={formData.data_transacao} min={dateLimits.min} max={dateLimits.max} onChange={(e) => setFormData(prev => ({ ...prev, data_transacao: e.target.value }))} />
                    {!isDateValid && formData.data_transacao && !editingId && (
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Data inválida</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input type="date" value={formData.data_vencimento || ""} onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))} />
                  </div>
                </div>

                {/* Status e Categoria */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formData.categoria_id || ""} onValueChange={(v) => setFormData(prev => ({ ...prev, categoria_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {categoriasDoTipo.map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Conta e Forma de Pagamento */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Conta Bancária</Label>
                    <Select value={formData.conta_bancaria_id || ""} onValueChange={(v) => setFormData(prev => ({ ...prev, conta_bancaria_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {contas.map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select value={formData.forma_pagamento || ""} onValueChange={(v) => setFormData(prev => ({ ...prev, forma_pagamento: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGAMENTO.map(f => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={formData.cliente_id || ""} onValueChange={(v) => setFormData(prev => ({ ...prev, cliente_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea placeholder="Observações..." value={formData.observacoes || ""} onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} rows={2} />
                </div>

                <Button onClick={handleSubmit} className="w-full bg-blue-500 hover:bg-blue-600" disabled={isCreating}>
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingId ? "Salvar Alterações" : "Criar Transação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seção: Pendentes do Extrato */}
      <AnimatePresence>
        {lancamentosPendentes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-0">
                <button
                  onClick={() => setShowPendentesExtrato(!showPendentesExtrato)}
                  className="w-full p-4 flex items-center justify-between hover:bg-yellow-500/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">Pendentes do Extrato</h3>
                      <p className="text-xs text-muted-foreground">
                        {lancamentosPendentes.length} lançamentos aguardando ação
                      </p>
                    </div>
                  </div>
                  {showPendentesExtrato ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </button>

                {showPendentesExtrato && (
                  <div className="border-t border-yellow-500/20">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-500/10">
                        <tr>
                          <th className="text-left p-3 font-medium text-foreground/80">Data</th>
                          <th className="text-left p-3 font-medium text-foreground/80">Descrição</th>
                          <th className="text-right p-3 font-medium text-foreground/80">Valor</th>
                          <th className="text-center p-3 font-medium text-foreground/80">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-foreground/5">
                        {lancamentosPendentes.map(lancamento => (
                          <tr key={lancamento.id} className="hover:bg-foreground/5 transition-colors">
                            <td className="p-3 text-muted-foreground">
                              {new Date(lancamento.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded flex items-center justify-center ${lancamento.tipo === "credito" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                                  {lancamento.tipo === "credito" ? <ArrowUpRight className="w-3 h-3 text-green-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                                </div>
                                <span className="font-medium text-foreground text-xs truncate max-w-[200px]">{lancamento.descricao}</span>
                              </div>
                            </td>
                            <td className={`p-3 text-right font-semibold ${lancamento.tipo === "credito" ? "text-green-400" : "text-red-400"}`}>
                              {lancamento.tipo === "credito" ? "+" : "-"}{formatCurrency(lancamento.valor)}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setLancamentoParaVincular(lancamento)}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 h-8 px-2"
                                >
                                  <Link2 className="w-4 h-4 mr-1" />
                                  Vincular
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleCriarTransacaoFromLancamento(lancamento)}
                                  className="text-green-400 hover:text-green-300 hover:bg-green-500/20 h-8 px-2"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Criar
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleIgnorarLancamento(lancamento)}
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 px-2"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extratos Importados (colapsável) */}
      {extratosImportados.length > 0 && (
        <Card className="border-blue-500/20">
          <CardContent className="p-0">
            <button
              onClick={() => setShowExtratosImportados(!showExtratosImportados)}
              className="w-full p-4 flex items-center justify-between hover:bg-blue-500/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">Extratos Importados</h3>
                  <p className="text-xs text-muted-foreground">{extratosImportados.length} arquivo(s)</p>
                </div>
              </div>
              {showExtratosImportados ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>

            {showExtratosImportados && (
              <div className="border-t border-blue-500/20">
                <table className="w-full text-sm">
                  <thead className="bg-blue-500/10">
                    <tr>
                      <th className="text-left p-3 font-medium text-foreground/80">Arquivo</th>
                      <th className="text-left p-3 font-medium text-foreground/80">Status</th>
                      <th className="text-center p-3 font-medium text-foreground/80">Progresso</th>
                      <th className="text-center p-3 font-medium text-foreground/80">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {extratosImportados.map(extrato => (
                      <tr key={extrato.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${extrato.tipo === "ofx" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                              {extrato.tipo}
                            </span>
                            <span className="font-medium text-foreground text-sm truncate max-w-[150px]">{extrato.nome}</span>
                          </div>
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
                            {extrato.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-foreground/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${extrato.conciliadas === extrato.transacoes ? "bg-green-500" : "bg-yellow-500"}`}
                                style={{ width: `${extrato.transacoes > 0 ? (extrato.conciliadas / extrato.transacoes) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground">{extrato.conciliadas}/{extrato.transacoes}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(extrato.status === "concluido" || extrato.status === "pendente") && !extrato.dbId && (
                              <Button variant="ghost" size="sm" onClick={() => handleConfirmarExtrato(extrato.id)} className="text-green-400 hover:text-green-300 hover:bg-green-500/20 h-8 px-2">
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleDeletarExtrato(extrato.id)} disabled={isDeletingImportacao} className="text-muted-foreground hover:text-red-400 hover:bg-red-500/20 h-8 px-2">
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
          </CardContent>
        </Card>
      )}

      {/* Lista de Transações */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="text-left p-3 font-medium text-foreground/80">Data</th>
                <th className="text-left p-3 font-medium text-foreground/80">Descrição</th>
                <th className="text-left p-3 font-medium text-foreground/80">Categoria</th>
                <th className="text-right p-3 font-medium text-foreground/80">Valor</th>
                <th className="text-center p-3 font-medium text-foreground/80">Status</th>
                <th className="text-center p-3 font-medium text-foreground/80">Conc.</th>
                <th className="text-center p-3 font-medium text-foreground/80">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {transacoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Nenhuma transação encontrada para esta competência
                  </td>
                </tr>
              ) : (
                transacoes.map(transacao => (
                  <tr key={transacao.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-muted-foreground">
                      {new Date(transacao.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${transacao.tipo === "receita" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                          {transacao.tipo === "receita" ? <ArrowUpRight className="w-3 h-3 text-green-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                        </div>
                        <span className="font-medium text-foreground">{transacao.descricao}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {transacao.categoria?.nome || "-"}
                    </td>
                    <td className={`p-3 text-right font-semibold ${transacao.tipo === "receita" ? "text-green-400" : "text-red-400"}`}>
                      {transacao.tipo === "receita" ? "+" : "-"}{formatCurrency(transacao.valor)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transacao.status === "pago" ? "bg-green-500/20 text-green-300" :
                        transacao.status === "pendente" ? "bg-yellow-500/20 text-yellow-300" :
                        "bg-red-500/20 text-red-300"
                      }`}>
                        {transacao.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {transacao.conciliado ? (
                        transacao.origem_extrato ? (
                          <div className="flex items-center justify-center gap-1 cursor-help" title="Conciliado por importação de extrato">
                            <FileText className="w-3 h-3 text-blue-400" />
                            <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          </div>
                        ) : (
                          <div className="cursor-help" title="Conciliado manualmente">
                            <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                          </div>
                        )
                      ) : (
                        <span className="w-4 h-4 block mx-auto rounded-full border-2 border-muted-foreground/30 cursor-help" title="Não conciliado" />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleCopyTransacao(transacao)} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(transacao)} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteTransacao(transacao.id)} className="text-muted-foreground hover:text-red-400 h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal Importar Extrato */}
      <ImportExtratoModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onConfirm={handleFileUpload}
        contas={contas}
        defaultMes={competenciaMes}
        defaultAno={competenciaAno}
      />

      {/* Modal de Vinculação */}
      <Dialog open={!!lancamentoParaVincular} onOpenChange={() => setLancamentoParaVincular(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Lançamento</DialogTitle>
          </DialogHeader>
          
          {lancamentoParaVincular && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Lançamento do Extrato:</div>
                <div className="font-medium">{lancamentoParaVincular.descricao}</div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className={lancamentoParaVincular.tipo === 'credito' ? 'text-green-500' : 'text-red-500'}>
                    {lancamentoParaVincular.tipo === 'credito' ? '+' : '-'} {formatCurrency(lancamentoParaVincular.valor)}
                  </span>
                  <span className="text-muted-foreground">{new Date(lancamentoParaVincular.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

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
                          <span>{new Date(t.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted">{t.categoria?.nome || 'Sem categoria'}</span>
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

              <div className="pt-2 border-t">
                <Button onClick={() => { handleCriarTransacaoFromLancamento(lancamentoParaVincular); setLancamentoParaVincular(null); }} className="w-full" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar nova transação a partir deste lançamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
