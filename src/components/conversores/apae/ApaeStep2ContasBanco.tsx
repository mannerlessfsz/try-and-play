import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Link2 } from "lucide-react";
import type { ApaePlanoContas } from "@/hooks/useApaeSessoes";
import { useApaeBancoAplicacoes } from "@/hooks/useApaeBancoAplicacoes";

const ITEMS_PER_PAGE = 100;

/** Heurística para sugerir contas bancárias */
function sugerirBanco(conta: ApaePlanoContas): boolean {
  const desc = conta.descricao.toLowerCase();
  const cod = conta.codigo.toLowerCase();
  const cls = (conta.classificacao || "").toLowerCase();
  if (cls.match(/^1\.1\.(0?[1-9]|[1-9]\d)/)) return true;
  const keywords = ["banco", "caixa", "bradesco", "itau", "itaú", "santander", "bb ", "sicredi", "sicoob", "cef ", "nubank", "inter", "c/c", "conta corrente"];
  return keywords.some((k) => desc.includes(k) || cod.includes(k));
}

/** Heurística para sugerir aplicações */
function sugerirAplicacao(conta: ApaePlanoContas): boolean {
  const desc = conta.descricao.toLowerCase();
  const cls = (conta.classificacao || "").toLowerCase();
  if (cls.match(/^1\.1\.(2|3)/)) return true;
  const keywords = ["aplicaç", "investimento", "poupança", "poupanca", "renda fixa", "cdb", "lci", "lca", "fundo"];
  return keywords.some((k) => desc.includes(k));
}

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
  const [novoBancoCodigo, setNovoBancoCodigo] = useState("");

  const { mapeamentos, loading: loadingMap, buscar, adicionar, atualizar, remover } = useApaeBancoAplicacoes(sessaoId);

  useEffect(() => { buscar(); }, [buscar]);

  // Contas marcadas como banco ou aplicação, na ordem do plano de contas
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

  const handleAdicionarMapeamento = async () => {
    if (!novoBancoCodigo) return;
    await adicionar(novoBancoCodigo);
    setNovoBancoCodigo("");
  };

  const getContaLabel = (codigo: string) => {
    if (!codigo || codigo === "0") return "—";
    const conta = contasByCodigo.get(codigo);
    return conta ? `${codigo} - ${conta.descricao}` : codigo;
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
            <Badge variant="secondary">{contasBancoAplicacao.filter((c) => c.is_banco).length} banco(s)</Badge>
            <Badge variant="secondary">{contasBancoAplicacao.filter((c) => c.is_aplicacao).length} aplicação(ões)</Badge>
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
                        onCheckedChange={(v) => onToggleBanco(conta.id, !!v)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={conta.is_aplicacao}
                        onCheckedChange={(v) => onToggleAplicacao(conta.id, !!v)}
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
      {contasBancoAplicacao.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="w-5 h-5 text-primary" />
              Mapeamento Banco → Aplicações
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Vincule cada conta de banco às suas contas de aplicação
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={novoBancoCodigo} onValueChange={setNovoBancoCodigo}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {contasBancoAplicacao.map((c) => (
                    <SelectItem key={c.codigo} value={c.codigo}>
                      {c.codigo} - {c.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdicionarMapeamento} disabled={!novoBancoCodigo}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>

            {loadingMap ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : mapeamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum mapeamento cadastrado.</p>
            ) : (
              <ScrollArea className="max-h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Banco</TableHead>
                      <TableHead>Aplicação 1</TableHead>
                      <TableHead>Aplicação 2</TableHead>
                      <TableHead>Aplicação 3</TableHead>
                      <TableHead>Aplicação 4</TableHead>
                      <TableHead>Aplicação 5</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapeamentos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {getContaLabel(m.banco_codigo)}
                        </TableCell>
                        {(["aplicacao1_codigo", "aplicacao2_codigo", "aplicacao3_codigo", "aplicacao4_codigo", "aplicacao5_codigo"] as const).map((col) => (
                          <TableCell key={col}>
                            <Select
                              value={m[col] || "0"}
                              onValueChange={(v) => atualizar(m.id, { [col]: v })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                <SelectItem value="0">— Nenhuma</SelectItem>
                                {contasBancoAplicacao.map((c) => (
                                  <SelectItem key={c.codigo} value={c.codigo}>
                                    {c.codigo} - {c.descricao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => remover(m.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
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

export { sugerirBanco, sugerirAplicacao };
