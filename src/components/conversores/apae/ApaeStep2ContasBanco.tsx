import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Link2, Check, Save } from "lucide-react";
import type { ApaePlanoContas } from "@/hooks/useApaeSessoes";
import { useApaeBancoAplicacoes } from "@/hooks/useApaeBancoAplicacoes";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 100;

interface Props {
  sessaoId: string;
  planoContas: ApaePlanoContas[];
  onToggleBanco: (id: string, value: boolean) => Promise<void>;
  onToggleAplicacao: (id: string, value: boolean) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export function ApaeStep2ContasBanco({ sessaoId, planoContas, onToggleBanco, onToggleAplicacao, onNext, onBack, saving }: Props) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [confirmado, setConfirmado] = useState(false);
  const [syncingMapeamentos, setSyncingMapeamentos] = useState(false);

  const { mapeamentos, loading: loadingMap, buscar, atualizar, sincronizar } = useApaeBancoAplicacoes(sessaoId);

  useEffect(() => { buscar(); }, [buscar]);

  // Contas marcadas como banco, na ordem do plano de contas
  const contasBanco = useMemo(
    () => planoContas.filter((c) => c.is_banco),
    [planoContas]
  );

  // Contas marcadas como aplicação, na ordem do plano de contas
  const contasAplicacao = useMemo(
    () => planoContas.filter((c) => c.is_aplicacao),
    [planoContas]
  );

  const contasBancoAplicacao = useMemo(
    () => planoContas.filter((c) => c.is_banco || c.is_aplicacao),
    [planoContas]
  );

  // Map codigo -> conta for labels
  const contasByCodigo = useMemo(() => {
    const map = new Map<string, ApaePlanoContas>();
    planoContas.forEach((c) => map.set(c.codigo, c));
    return map;
  }, [planoContas]);

  // Collect all aplicacao codes already used across all mapeamentos
  const aplicacoesUsadas = useMemo(() => {
    const used = new Map<string, string>(); // aplicacao_codigo -> banco_codigo
    for (const m of mapeamentos) {
      for (const col of ["aplicacao1_codigo", "aplicacao2_codigo", "aplicacao3_codigo", "aplicacao4_codigo", "aplicacao5_codigo"] as const) {
        const val = m[col];
        if (val && val !== "0") {
          used.set(val, m.banco_codigo);
        }
      }
    }
    return used;
  }, [mapeamentos]);

  // Busca no plano de contas completo para marcar
  const filtradoPlano = useMemo(() => {
    if (!busca.trim()) return planoContas;
    const termo = busca.toLowerCase();
    return planoContas.filter(
      (c) =>
        c.descricao.toLowerCase().includes(termo) ||
        c.codigo.toLowerCase().includes(termo) ||
        (c.classificacao || "").toLowerCase().includes(termo)
    );
  }, [planoContas, busca]);

  const totalPaginas = Math.ceil(filtradoPlano.length / ITEMS_PER_PAGE);
  const paginado = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return filtradoPlano.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [filtradoPlano, pagina]);

  // Sync mapeamentos: batch operation via hook
  const syncMapeamentos = useCallback(async () => {
    setSyncingMapeamentos(true);
    const codigos = contasBanco.map((c) => c.codigo);
    const total = await sincronizar(codigos);
    if (total > 0) {
      setConfirmado(true);
      toast.success(`${total} banco(s) sincronizados!`);
    }
    setSyncingMapeamentos(false);
  }, [contasBanco, sincronizar]);

  const handleToggleBancoWrapped = async (id: string, value: boolean) => {
    setConfirmado(false);
    await onToggleBanco(id, value);
  };

  const handleToggleAplicacaoWrapped = async (id: string, value: boolean) => {
    setConfirmado(false);
    await onToggleAplicacao(id, value);
  };

  const handleAtualizarAplicacao = async (mapeamentoId: string, col: string, value: string, bancoCodigo: string) => {
    // Check if this aplicacao is already used by another banco
    if (value !== "0") {
      const usadaPor = aplicacoesUsadas.get(value);
      if (usadaPor && usadaPor !== bancoCodigo) {
        const contaUsada = contasByCodigo.get(value);
        const bancoUsado = contasByCodigo.get(usadaPor);
        toast.error(`A aplicação "${contaUsada?.descricao || value}" já está vinculada ao banco "${bancoUsado?.descricao || usadaPor}"`);
        return;
      }
    }
    await atualizar(mapeamentoId, { [col]: value });
  };

  const getContaLabel = (codigo: string) => {
    if (!codigo || codigo === "0") return "— Nenhuma";
    const conta = contasByCodigo.get(codigo);
    return conta ? `${codigo} - ${conta.descricao}` : codigo;
  };

  // Get available aplicacoes for a specific select (exclude already used by other bancos)
  const getAplicacoesDisponiveis = (bancoCodigo: string, currentValue: string) => {
    return contasAplicacao.filter((c) => {
      if (c.codigo === currentValue) return true; // always show current selection
      const usadaPor = aplicacoesUsadas.get(c.codigo);
      return !usadaPor || usadaPor === bancoCodigo; // available if not used or used by same banco
    });
  };

  return (
    <div className="space-y-4">
      {/* Seção 1: Buscar e marcar contas como banco ou aplicação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            Marcar Contas de Banco e Aplicações
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Busque no plano de contas e marque quais são bancos ou aplicações financeiras
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{contasBanco.length} banco(s)</Badge>
            <Badge variant="secondary">{contasAplicacao.length} aplicação(ões)</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no plano de contas..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
              className="pl-9"
            />
          </div>

          <ScrollArea className="max-h-[70vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Banco</TableHead>
                  <TableHead className="w-16 text-center">Aplic.</TableHead>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-32">Classificação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginado.map((conta) => (
                  <TableRow key={conta.id} className={conta.is_banco || conta.is_aplicacao ? "bg-primary/5" : ""}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={conta.is_banco}
                        onCheckedChange={(v) => handleToggleBancoWrapped(conta.id, !!v)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={conta.is_aplicacao}
                        onCheckedChange={(v) => handleToggleAplicacaoWrapped(conta.id, !!v)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{conta.codigo}</TableCell>
                    <TableCell className="text-sm">{conta.descricao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{conta.classificacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {filtradoPlano.length} resultado(s) — Página {pagina}/{totalPaginas}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção 2: Mapeamento Banco → Aplicações */}
      {contasBanco.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="w-5 h-5 text-primary" />
              Mapeamento Banco → Aplicações
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Clique em "Confirmar e Sincronizar" para gerar as linhas de cada banco. Depois vincule as aplicações.
              Uma aplicação só pode ser vinculada a um banco.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={syncMapeamentos}
                disabled={syncingMapeamentos || saving}
              >
                {syncingMapeamentos ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Confirmar e Sincronizar ({contasBanco.length} banco(s))
              </Button>
              {confirmado && (
                <Badge variant="default" className="bg-green-600 text-white">
                  <Check className="w-3 h-3 mr-1" /> Confirmado
                </Badge>
              )}
            </div>

            {loadingMap || syncingMapeamentos ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : mapeamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Clique em "Confirmar e Sincronizar" para gerar as linhas de mapeamento.
              </p>
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Banco</TableHead>
                      <TableHead>Aplicação 1</TableHead>
                      <TableHead>Aplicação 2</TableHead>
                      <TableHead>Aplicação 3</TableHead>
                      <TableHead>Aplicação 4</TableHead>
                      <TableHead>Aplicação 5</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapeamentos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs font-medium whitespace-normal">
                          {getContaLabel(m.banco_codigo)}
                        </TableCell>
                        {(["aplicacao1_codigo", "aplicacao2_codigo", "aplicacao3_codigo", "aplicacao4_codigo", "aplicacao5_codigo"] as const).map((col) => {
                          const currentVal = m[col] || "0";
                          const disponiveis = getAplicacoesDisponiveis(m.banco_codigo, currentVal);
                          return (
                            <TableCell key={col}>
                              <Select
                                value={currentVal}
                                onValueChange={(v) => handleAtualizarAplicacao(m.id, col, v, m.banco_codigo)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  <SelectItem value="0">— Nenhuma</SelectItem>
                                  {disponiveis.map((c) => (
                                    <SelectItem key={c.codigo} value={c.codigo}>
                                      {c.codigo} - {c.descricao}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={contasBancoAplicacao.length === 0}>
          Próximo: Relatório <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
