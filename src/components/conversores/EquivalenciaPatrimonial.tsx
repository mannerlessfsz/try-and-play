import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Trash2, Building2, TrendingUp, TrendingDown, 
  FileText, Plus, Calculator, Download, Eye, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

interface Investida {
  id: string;
  nome: string;
  cnpj: string;
  percentualParticipacao: number;
}

interface BalancoImportado {
  id: string;
  investidaId: string;
  investidaNome: string;
  periodo: string;
  patrimonioLiquido: number;
  ativoTotal: number;
  passivoTotal: number;
  capitalSocial: number;
  reservas: number;
  lucrosPrejuizos: number;
  arquivo: string;
  importadoEm: string;
}

interface ResultadoEquivalencia {
  investidaId: string;
  investidaNome: string;
  percentual: number;
  plAnterior: number;
  plAtual: number;
  variacaoPL: number;
  resultadoEquivalencia: number;
  tipo: 'ganho' | 'perda';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EquivalenciaPatrimonial() {
  const [investidas, setInvestidas] = useState<Investida[]>([]);
  const [balancos, setBalancos] = useState<BalancoImportado[]>([]);
  const [resultados, setResultados] = useState<ResultadoEquivalencia[]>([]);
  const [step, setStep] = useState<'investidas' | 'importar' | 'resultados'>('investidas');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedBalanco, setExpandedBalanco] = useState<string | null>(null);

  // Form state for new investida
  const [novaInvestida, setNovaInvestida] = useState({ nome: '', cnpj: '', percentual: '' });

  const adicionarInvestida = () => {
    if (!novaInvestida.nome || !novaInvestida.percentual) {
      toast.error("Preencha nome e percentual de participação");
      return;
    }
    const perc = parseFloat(novaInvestida.percentual);
    if (isNaN(perc) || perc <= 0 || perc > 100) {
      toast.error("Percentual deve ser entre 0 e 100");
      return;
    }
    setInvestidas(prev => [...prev, {
      id: crypto.randomUUID(),
      nome: novaInvestida.nome,
      cnpj: novaInvestida.cnpj,
      percentualParticipacao: perc,
    }]);
    setNovaInvestida({ nome: '', cnpj: '', percentual: '' });
    toast.success("Investida adicionada");
  };

  const removerInvestida = (id: string) => {
    setInvestidas(prev => prev.filter(i => i.id !== id));
    setBalancos(prev => prev.filter(b => b.investidaId !== id));
  };

  const processarArquivo = useCallback(async (file: File, investidaId: string) => {
    setIsProcessing(true);
    const investida = investidas.find(i => i.id === investidaId);
    if (!investida) return;

    try {
      let base64 = '';
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach(b => binary += String.fromCharCode(b));
      base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('parse-fiscal', {
        body: {
          fileBase64: base64,
          fileName: file.name,
          tipo: 'balanco_patrimonial',
          promptOverride: `Analise este arquivo de Balanço Patrimonial e extraia os seguintes dados em JSON:
{
  "periodo": "MM/AAAA ou descrição do período",
  "patrimonio_liquido": number,
  "ativo_total": number,
  "passivo_total": number,
  "capital_social": number,
  "reservas": number,
  "lucros_prejuizos": number
}
Retorne APENAS o JSON, sem markdown. Se não encontrar algum valor, use 0.`
        }
      });

      if (error) throw error;

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const info = parsed.notas?.[0] || parsed;

      const balanco: BalancoImportado = {
        id: crypto.randomUUID(),
        investidaId,
        investidaNome: investida.nome,
        periodo: info.periodo || 'Não identificado',
        patrimonioLiquido: parseFloat(info.patrimonio_liquido) || 0,
        ativoTotal: parseFloat(info.ativo_total) || 0,
        passivoTotal: parseFloat(info.passivo_total) || 0,
        capitalSocial: parseFloat(info.capital_social) || 0,
        reservas: parseFloat(info.reservas) || 0,
        lucrosPrejuizos: parseFloat(info.lucros_prejuizos) || 0,
        arquivo: file.name,
        importadoEm: new Date().toLocaleString('pt-BR'),
      };

      setBalancos(prev => [...prev, balanco]);
      toast.success(`Balanço de ${investida.nome} importado com sucesso`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar arquivo: " + (err.message || "Tente novamente"));
    } finally {
      setIsProcessing(false);
    }
  }, [investidas]);

  const calcularEquivalencia = () => {
    const results: ResultadoEquivalencia[] = [];

    for (const inv of investidas) {
      const balancosInv = balancos
        .filter(b => b.investidaId === inv.id)
        .sort((a, b) => a.importadoEm.localeCompare(b.importadoEm));

      if (balancosInv.length < 2) continue;

      const anterior = balancosInv[balancosInv.length - 2];
      const atual = balancosInv[balancosInv.length - 1];
      const variacao = atual.patrimonioLiquido - anterior.patrimonioLiquido;
      const resultado = variacao * (inv.percentualParticipacao / 100);

      results.push({
        investidaId: inv.id,
        investidaNome: inv.nome,
        percentual: inv.percentualParticipacao,
        plAnterior: anterior.patrimonioLiquido,
        plAtual: atual.patrimonioLiquido,
        variacaoPL: variacao,
        resultadoEquivalencia: resultado,
        tipo: resultado >= 0 ? 'ganho' : 'perda',
      });
    }

    if (results.length === 0) {
      toast.error("Importe pelo menos 2 balanços por investida para calcular");
      return;
    }

    setResultados(results);
    setStep('resultados');
    toast.success("Cálculo realizado com sucesso");
  };

  const exportarCSV = () => {
    const headers = ['Investida', '% Participação', 'PL Anterior', 'PL Atual', 'Variação PL', 'Resultado Equivalência', 'Tipo'];
    const rows = resultados.map(r => [
      r.investidaNome,
      r.percentual.toFixed(2),
      r.plAnterior.toFixed(2),
      r.plAtual.toFixed(2),
      r.variacaoPL.toFixed(2),
      r.resultadoEquivalencia.toFixed(2),
      r.tipo === 'ganho' ? 'Ganho' : 'Perda',
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equivalencia_patrimonial_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--orange)/0.15)] border border-[hsl(var(--orange)/0.25)] flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-[hsl(var(--orange))]" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Equivalência Patrimonial</h2>
          <p className="text-xs text-muted-foreground">Importe balanços patrimoniais e calcule o resultado de equivalência</p>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="flex gap-1 glass rounded-xl p-1.5">
        {[
          { key: 'investidas', label: 'Investidas', icon: Building2 },
          { key: 'importar', label: 'Importar Balanços', icon: Upload },
          { key: 'resultados', label: 'Resultados', icon: Calculator },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = step === s.key;
          const isDisabled = (s.key === 'importar' && investidas.length === 0) || 
                             (s.key === 'resultados' && resultados.length === 0);
          return (
            <button
              key={s.key}
              onClick={() => !isDisabled && setStep(s.key as any)}
              disabled={isDisabled}
              className={`relative flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="eq-step"
                  className="absolute inset-0 rounded-lg bg-[hsl(var(--orange)/0.15)] border border-[hsl(var(--orange)/0.3)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 flex items-center gap-1.5 ${isActive ? 'text-[hsl(var(--orange))]' : 'text-muted-foreground'}`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Cadastro de Investidas */}
        {step === 'investidas' && (
          <motion.div key="investidas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {/* Add form */}
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">Adicionar Empresa Investida</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input placeholder="Razão Social" value={novaInvestida.nome} onChange={e => setNovaInvestida(p => ({ ...p, nome: e.target.value }))} className="text-sm" />
                <Input placeholder="CNPJ (opcional)" value={novaInvestida.cnpj} onChange={e => setNovaInvestida(p => ({ ...p, cnpj: e.target.value }))} className="text-sm" />
                <Input placeholder="% Participação" type="number" min="0.01" max="100" step="0.01" value={novaInvestida.percentual} onChange={e => setNovaInvestida(p => ({ ...p, percentual: e.target.value }))} className="text-sm" />
                <Button onClick={adicionarInvestida} className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            </div>

            {/* List */}
            {investidas.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">Nenhuma investida cadastrada</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione as empresas investidas para começar</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {investidas.map((inv, i) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass rounded-xl p-4 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[hsl(var(--orange)/0.1)] flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-[hsl(var(--orange))]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{inv.nome}</p>
                        <p className="text-xs text-muted-foreground">{inv.cnpj || 'CNPJ não informado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[hsl(var(--orange))] border-[hsl(var(--orange)/0.3)] bg-[hsl(var(--orange)/0.08)]">
                        {inv.percentualParticipacao}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {balancos.filter(b => b.investidaId === inv.id).length} balanço(s)
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removerInvestida(inv.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {investidas.length > 0 && (
              <Button onClick={() => setStep('importar')} className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background">
                Próximo: Importar Balanços <Upload className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        )}

        {/* STEP 2: Importar Balanços */}
        {step === 'importar' && (
          <motion.div key="importar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importe pelo menos <strong>2 balanços</strong> por investida (anterior e atual) para calcular a equivalência.
            </p>

            {investidas.map((inv) => {
              const balancosInv = balancos.filter(b => b.investidaId === inv.id);
              return (
                <div key={inv.id} className="glass rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[hsl(var(--orange))]" />
                      <span className="text-sm font-semibold">{inv.nome}</span>
                      <Badge variant="outline" className="text-[10px]">{inv.percentualParticipacao}%</Badge>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) processarArquivo(f, inv.id);
                          e.target.value = '';
                        }}
                        disabled={isProcessing}
                      />
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--orange)/0.12)] text-[hsl(var(--orange))] border border-[hsl(var(--orange)/0.25)] hover:bg-[hsl(var(--orange)/0.2)] transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        {isProcessing ? 'Processando...' : 'Importar PDF/Excel'}
                      </div>
                    </label>
                  </div>

                  {balancosInv.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum balanço importado ainda</p>
                  ) : (
                    <div className="space-y-2">
                      {balancosInv.map(b => (
                        <div key={b.id} className="rounded-lg bg-foreground/[0.03] border border-border/50 overflow-hidden">
                          <button
                            onClick={() => setExpandedBalanco(expandedBalanco === b.id ? null : b.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-foreground/[0.02] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium">{b.arquivo}</span>
                              <Badge variant="secondary" className="text-[10px]">{b.periodo}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-semibold">{fmt(b.patrimonioLiquido)}</span>
                              {expandedBalanco === b.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </div>
                          </button>
                          <AnimatePresence>
                            {expandedBalanco === b.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {[
                                    { label: 'Ativo Total', value: b.ativoTotal },
                                    { label: 'Passivo Total', value: b.passivoTotal },
                                    { label: 'Capital Social', value: b.capitalSocial },
                                    { label: 'Reservas', value: b.reservas },
                                    { label: 'Lucros/Prejuízos', value: b.lucrosPrejuizos },
                                    { label: 'Patrimônio Líquido', value: b.patrimonioLiquido },
                                  ].map(item => (
                                    <div key={item.label} className="rounded-lg bg-background/50 p-2">
                                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                      <p className="text-xs font-mono font-semibold">{fmt(item.value)}</p>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('investidas')} className="text-xs">
                Voltar
              </Button>
              <Button 
                onClick={calcularEquivalencia} 
                disabled={investidas.some(inv => balancos.filter(b => b.investidaId === inv.id).length < 2)}
                className="gap-1.5 bg-[hsl(var(--orange))] hover:bg-[hsl(var(--orange)/0.9)] text-background text-xs"
              >
                <Calculator className="w-4 h-4" /> Calcular Equivalência
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Resultados */}
        {step === 'resultados' && (
          <motion.div key="resultados" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  label: 'Total Ganhos',
                  value: resultados.filter(r => r.tipo === 'ganho').reduce((s, r) => s + r.resultadoEquivalencia, 0),
                  icon: TrendingUp,
                  color: 'hsl(var(--cyan))',
                },
                {
                  label: 'Total Perdas',
                  value: resultados.filter(r => r.tipo === 'perda').reduce((s, r) => s + Math.abs(r.resultadoEquivalencia), 0),
                  icon: TrendingDown,
                  color: 'hsl(var(--orange))',
                },
                {
                  label: 'Resultado Líquido',
                  value: resultados.reduce((s, r) => s + r.resultadoEquivalencia, 0),
                  icon: Calculator,
                  color: resultados.reduce((s, r) => s + r.resultadoEquivalencia, 0) >= 0 ? 'hsl(var(--cyan))' : 'hsl(var(--orange))',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" style={{ color: card.color }} />
                      <span className="text-xs text-muted-foreground">{card.label}</span>
                    </div>
                    <p className="text-lg font-bold font-mono" style={{ color: card.color }}>{fmt(card.value)}</p>
                  </div>
                );
              })}
            </div>

            {/* Detail cards per investida */}
            <div className="space-y-3">
              {resultados.map((r, i) => (
                <motion.div
                  key={r.investidaId}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[hsl(var(--orange))]" />
                      <span className="text-sm font-semibold">{r.investidaNome}</span>
                      <Badge variant="outline" className="text-[10px]">{r.percentual}%</Badge>
                    </div>
                    <Badge className={r.tipo === 'ganho' 
                      ? 'bg-[hsl(var(--cyan)/0.15)] text-[hsl(var(--cyan))] border-[hsl(var(--cyan)/0.3)]' 
                      : 'bg-[hsl(var(--orange)/0.15)] text-[hsl(var(--orange))] border-[hsl(var(--orange)/0.3)]'
                    }>
                      {r.tipo === 'ganho' ? 'Ganho' : 'Perda'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'PL Anterior', value: r.plAnterior },
                      { label: 'PL Atual', value: r.plAtual },
                      { label: 'Variação PL', value: r.variacaoPL },
                      { label: 'Resultado Equivalência', value: r.resultadoEquivalencia },
                    ].map(item => (
                      <div key={item.label} className="rounded-lg bg-foreground/[0.03] p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                        <p className={`text-sm font-mono font-bold ${item.value >= 0 ? 'text-[hsl(var(--cyan))]' : 'text-[hsl(var(--orange))]'}`}>
                          {fmt(item.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 rounded-lg bg-foreground/[0.02] border border-border/30">
                    <p className="text-[10px] text-muted-foreground">
                      Cálculo: ({fmt(r.plAtual)} - {fmt(r.plAnterior)}) × {r.percentual}% = <strong className="text-foreground">{fmt(r.resultadoEquivalencia)}</strong>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('importar')} className="text-xs">
                Voltar
              </Button>
              <Button onClick={exportarCSV} className="gap-1.5 text-xs" variant="outline">
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
