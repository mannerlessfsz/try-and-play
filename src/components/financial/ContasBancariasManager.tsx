import { useState, useMemo } from "react";
import { useContasBancarias, ContaBancariaInput } from "@/hooks/useContasBancarias";
import { useSaldoContas } from "@/hooks/useSaldoContas";
import { useImportacoesExtrato } from "@/hooks/useImportacoesExtrato";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, Building2, Wallet, Loader2, TrendingUp, TrendingDown, AlertCircle, ChevronDown, FileText, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContasBancariasManagerProps {
  empresaId: string;
}

const BANCOS = [
  "Banco do Brasil", "Bradesco", "Caixa Econômica", "Itaú", "Santander",
  "Nubank", "Inter", "C6 Bank", "BTG Pactual", "Sicoob", "Sicredi", "Outro"
];

const TIPOS_CONTA = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "investimento", label: "Investimento" },
  { value: "caixa", label: "Caixa" },
];

const CORES = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

export function ContasBancariasManager({ empresaId }: ContasBancariasManagerProps) {
  const { contas, isLoading, createConta, updateConta, deleteConta, isCreating } = useContasBancarias(empresaId);
  const { saldos, saldoTotal, isLoading: isLoadingSaldos } = useSaldoContas(empresaId);
  const { importacoes, isLoading: isLoadingImportacoes } = useImportacoesExtrato(empresaId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedContas, setExpandedContas] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Partial<ContaBancariaInput>>({
    nome: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo: "corrente",
    saldo_inicial: 0,
    cor: "#3b82f6",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      banco: "",
      agencia: "",
      conta: "",
      tipo: "corrente",
      saldo_inicial: 0,
      cor: "#3b82f6",
    });
    setEditingId(null);
  };

  const handleOpenEdit = (conta: typeof contas[0]) => {
    setFormData({
      nome: conta.nome,
      banco: conta.banco,
      agencia: conta.agencia || "",
      conta: conta.conta || "",
      tipo: conta.tipo,
      saldo_inicial: conta.saldo_inicial || 0,
      cor: conta.cor || "#3b82f6",
    });
    setEditingId(conta.id);
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.banco) return;

    if (editingId) {
      updateConta({ id: editingId, ...formData });
    } else {
      createConta({ ...formData, empresa_id: empresaId } as ContaBancariaInput);
    }
    setIsOpen(false);
    resetForm();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const toggleExpandConta = (contaId: string) => {
    setExpandedContas(prev => {
      const next = new Set(prev);
      if (next.has(contaId)) {
        next.delete(contaId);
      } else {
        next.add(contaId);
      }
      return next;
    });
  };

  // Agrupar importações por conta bancária e mês
  const importacoesPorConta = useMemo(() => {
    const grouped = new Map<string, typeof importacoes>();
    importacoes.forEach(imp => {
      const list = grouped.get(imp.conta_bancaria_id) || [];
      list.push(imp);
      grouped.set(imp.conta_bancaria_id, list);
    });
    return grouped;
  }, [importacoes]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
      case 'confirmado':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'pendente':
      case 'processando':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'erro':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluido': return 'Concluído';
      case 'confirmado': return 'Confirmado';
      case 'pendente': return 'Pendente';
      case 'processando': return 'Processando';
      case 'erro': return 'Erro';
      default: return status;
    }
  };

  if (isLoading || isLoadingSaldos) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const getSaldoConta = (contaId: string) => saldos.find(s => s.conta.id === contaId);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {saldos.some(s => s.temExtratoConfirmado) && (
        <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 backdrop-blur-xl rounded-xl border border-blue-500/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Total Consolidado</p>
                <p className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                  {formatCurrency(saldoTotal)}
                </p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-green-400 font-semibold">
                  +{formatCurrency(saldos.filter(s => s.temExtratoConfirmado).reduce((acc, s) => acc + s.totalReceitas, 0))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="text-red-400 font-semibold">
                  -{formatCurrency(saldos.filter(s => s.temExtratoConfirmado).reduce((acc, s) => acc + s.totalDespesas, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Contas Bancárias</h3>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome da Conta *</Label>
                <Input
                  placeholder="Ex: Conta Principal"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Select value={formData.banco} onValueChange={(v) => setFormData(prev => ({ ...prev, banco: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANCOS.map(banco => (
                      <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Agência</Label>
                  <Input
                    placeholder="0000"
                    value={formData.agencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, agencia: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Input
                    placeholder="00000-0"
                    value={formData.conta}
                    onChange={(e) => setFormData(prev => ({ ...prev, conta: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONTA.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData(prev => ({ ...prev, saldo_inicial: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {CORES.map(cor => (
                    <button
                      key={cor}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.cor === cor ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: cor }}
                      onClick={() => setFormData(prev => ({ ...prev, cor }))}
                    />
                  ))}
                </div>
              </div>
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600" 
                onClick={handleSubmit}
                disabled={isCreating || !formData.nome || !formData.banco}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? "Salvar Alterações" : "Criar Conta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {contas.length === 0 ? (
        <div className="bg-card/30 backdrop-blur-xl rounded-xl border border-blue-500/20 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
          <h4 className="font-semibold text-foreground mb-2">Nenhuma conta cadastrada</h4>
          <p className="text-sm text-muted-foreground mb-4">Cadastre suas contas bancárias para gerenciar seu fluxo de caixa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map(conta => {
            const extratosContaRaw = importacoesPorConta.get(conta.id) || [];
            const extratosConta = extratosContaRaw.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const isExpanded = expandedContas.has(conta.id);
            
            return (
              <div 
                key={conta.id} 
                className="bg-card/30 backdrop-blur-xl rounded-xl border border-blue-500/20 p-4 hover:border-blue-500/40 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${conta.cor}20` }}
                    >
                      <Wallet className="w-5 h-5" style={{ color: conta.cor || "#3b82f6" }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{conta.nome}</h4>
                      <p className="text-xs text-muted-foreground">{conta.banco}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenEdit(conta)}
                      className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteConta(conta.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {conta.agencia && <p>Agência: {conta.agencia}</p>}
                  {conta.conta && <p>Conta: {conta.conta}</p>}
                  <p className="capitalize">Tipo: {conta.tipo}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-foreground/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Saldo Inicial</span>
                    <span className="text-foreground">{formatCurrency(conta.saldo_inicial || 0)}</span>
                  </div>
                  {(() => {
                    const saldo = getSaldoConta(conta.id);
                    if (!saldo) return null;
                    
                    // If no confirmed extrato, show warning
                    if (!saldo.temExtratoConfirmado) {
                      return (
                        <div className="flex items-center gap-2 text-amber-400 text-xs">
                          <AlertCircle className="w-4 h-4" />
                          <span>Sem extrato confirmado</span>
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-green-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Entradas
                          </span>
                          <span className="text-green-400">+{formatCurrency(saldo.totalReceitas)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-red-400 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> Saídas
                          </span>
                          <span className="text-red-400">-{formatCurrency(saldo.totalDespesas)}</span>
                        </div>
                        <div className="pt-2 border-t border-foreground/10">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Saldo Atual</span>
                            <span className={`text-lg font-bold ${saldo.saldoAtual >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                              {formatCurrency(saldo.saldoAtual)}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Extratos Importados */}
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpandConta(conta.id)}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full mt-3 pt-3 border-t border-foreground/10 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Extratos Importados ({extratosConta.length})
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-2">
                      {extratosConta.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Nenhum extrato importado
                        </p>
                      ) : (
                        extratosConta.map(extrato => (
                          <div 
                            key={extrato.id}
                            className="bg-background/50 rounded-lg p-2 text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-foreground truncate flex-1 mr-2">
                                {extrato.nome_arquivo}
                              </span>
                              {getStatusIcon(extrato.status)}
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {extrato.data_inicio && extrato.data_fim 
                                  ? `${format(new Date(extrato.data_inicio + 'T00:00:00'), 'MMM/yy', { locale: ptBR })}`
                                  : format(new Date(extrato.created_at), 'dd/MM/yy', { locale: ptBR })
                                }
                              </span>
                              <span>
                                {extrato.transacoes_importadas || extrato.total_transacoes || 0} transações
                              </span>
                            </div>
                            <div className="text-muted-foreground mt-1">
                              Status: <span className={
                                extrato.status === 'concluido' || extrato.status === 'confirmado' 
                                  ? 'text-green-400' 
                                  : extrato.status === 'erro' 
                                    ? 'text-red-400' 
                                    : 'text-amber-400'
                              }>
                                {getStatusLabel(extrato.status)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
