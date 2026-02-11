import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Search, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { ApaePlanoContas } from "@/hooks/useApaeSessoes";

const ITEMS_PER_PAGE = 20;

/** Heurística para sugerir contas bancárias */
function sugerirBanco(conta: ApaePlanoContas): boolean {
  const desc = conta.descricao.toLowerCase();
  const cod = conta.codigo.toLowerCase();
  const cls = (conta.classificacao || "").toLowerCase();
  // Classificações típicas de banco: 1.1.1, 1.1.01, etc.
  if (cls.match(/^1\.1\.(0?[1-9]|[1-9]\d)/)) return true;
  // Palavras-chave
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
  planoContas: ApaePlanoContas[];
  onToggleBanco: (id: string, value: boolean) => Promise<void>;
  onToggleAplicacao: (id: string, value: boolean) => Promise<void>;
  onAutoSugerir: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export function ApaeStep2ContasBanco({ planoContas, onToggleBanco, onToggleAplicacao, onAutoSugerir, onNext, onBack, saving }: Props) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [filtro, setFiltro] = useState<"todos" | "banco" | "aplicacao" | "selecionados">("todos");

  const contasSelecionadas = useMemo(() => planoContas.filter((c) => c.is_banco || c.is_aplicacao), [planoContas]);

  const filtrado = useMemo(() => {
    let lista = planoContas;
    if (filtro === "banco") lista = planoContas.filter((c) => c.is_banco);
    else if (filtro === "aplicacao") lista = planoContas.filter((c) => c.is_aplicacao);
    else if (filtro === "selecionados") lista = contasSelecionadas;

    if (!busca.trim()) return lista;
    const termo = busca.toLowerCase();
    return lista.filter(
      (c) =>
        c.descricao.toLowerCase().includes(termo) ||
        c.codigo.toLowerCase().includes(termo) ||
        (c.classificacao || "").toLowerCase().includes(termo)
    );
  }, [planoContas, busca, filtro, contasSelecionadas]);

  const totalPaginas = Math.ceil(filtrado.length / ITEMS_PER_PAGE);
  const paginado = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return filtrado.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [filtrado, pagina]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            Passo 2: Contas de Banco e Aplicações
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Identifique quais contas do plano são bancos ou aplicações financeiras
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onAutoSugerir} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Sugerir automaticamente
            </Button>
            <Badge variant="secondary">{contasSelecionadas.filter((c) => c.is_banco).length} banco(s)</Badge>
            <Badge variant="secondary">{contasSelecionadas.filter((c) => c.is_aplicacao).length} aplicação(ões)</Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conta..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {(["todos", "banco", "aplicacao", "selecionados"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filtro === f ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setFiltro(f); setPagina(1); }}
                >
                  {f === "todos" ? "Todos" : f === "banco" ? "Bancos" : f === "aplicacao" ? "Aplicações" : "Selecionados"}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="max-h-[400px]">
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
                {filtrado.length} resultado(s) — Página {pagina}/{totalPaginas}
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

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={contasSelecionadas.length === 0}>
          Próximo: Relatório <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export { sugerirBanco, sugerirAplicacao };
