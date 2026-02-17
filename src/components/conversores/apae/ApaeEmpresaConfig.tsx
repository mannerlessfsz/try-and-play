import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileSpreadsheet, Upload, Trash2, Search, Loader2, ChevronLeft, ChevronRight, Building2, Landmark, Save, Check, Pencil, ChevronDown, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { parsePlanoContasFromCsvFile, parsePlanoContasFromExcelFile, type PlanoContasItem } from "@/utils/planoContasParser";
import { useApaePlanoEmpresa, type ApaePlanoEmpresaItem } from "@/hooks/useApaePlanoEmpresa";
import { useApaeBancoAplicacoesEmpresa } from "@/hooks/useApaeBancoAplicacoesEmpresa";

const ITEMS_PER_PAGE = 100;

export function ApaeEmpresaConfig() {
  const {
    planoEmpresa, planoArquivo, loadingPlano,
    salvarPlano, removerPlano, atualizarContaEmpresa, temPlano,
  } = useApaePlanoEmpresa();

  const {
    mapeamentos, loading: loadingMap, buscar: buscarMapeamentos,
    atualizar: atualizarMapeamento, sincronizar: sincronizarMapeamentos,
  } = useApaeBancoAplicacoesEmpresa();

  const [planoOpen, setPlanoOpen] = useState(!temPlano);
  const [bancosOpen, setBancosOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [syncingMap, setSyncingMap] = useState(false);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editingRelatorio, setEditingRelatorio] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { buscarMapeamentos(); }, [buscarMapeamentos]);
  useEffect(() => { setPlanoOpen(!temPlano); }, [temPlano]);

  const contasBanco = useMemo(() => planoEmpresa.filter((c) => c.is_banco), [planoEmpresa]);
  const contasAplicacao = useMemo(() => planoEmpresa.filter((c) => c.is_aplicacao), [planoEmpresa]);

  const mapeamentoByBanco = useMemo(() => {
    const map = new Map<string, typeof mapeamentos[0]>();
    mapeamentos.forEach((m) => map.set(m.banco_codigo, m));
    return map;
  }, [mapeamentos]);

  const aplicacoesUsadas = useMemo(() => {
    const used = new Map<string, string>();
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

  const filtradoPlano = useMemo(() => {
    if (!busca.trim()) return planoEmpresa;
    const termo = busca.toLowerCase();
    return planoEmpresa.filter(
      (c) =>
        c.descricao.toLowerCase().includes(termo) ||
        c.codigo.toLowerCase().includes(termo) ||
        (c.classificacao || "").toLowerCase().includes(termo)
    );
  }, [planoEmpresa, busca]);

  const totalPaginas = Math.ceil(filtradoPlano.length / ITEMS_PER_PAGE);
  const paginado = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE;
    return filtradoPlano.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [filtradoPlano, pagina]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
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
      if (!items || items.length === 0) throw new Error("Nenhuma conta encontrada.");
      await salvarPlano.mutateAsync({
        contas: items.map((i) => ({ codigo: i.codigo, descricao: i.descricao, classificacao: i.classificacao, cnpj: i.cnpj })),
        nomeArquivo: file.name,
      });
      setPagina(1);
      setBusca("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar arquivo");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleToggleBanco = async (id: string, value: boolean) => {
    await atualizarContaEmpresa(id, { is_banco: value });
  };

  const handleToggleAplicacao = async (id: string, value: boolean) => {
    await atualizarContaEmpresa(id, { is_aplicacao: value });
  };

  const syncMapeamentos = useCallback(async () => {
    setSyncingMap(true);
    const codigos = contasBanco.map((c) => c.codigo);
    const total = await sincronizarMapeamentos(codigos);
    if (total > 0) toast.success(`${total} banco(s) sincronizados!`);
    setSyncingMap(false);
  }, [contasBanco, sincronizarMapeamentos]);

  const handleAtualizarAplicacao = async (mapeamentoId: string, col: string, value: string, bancoCodigo: string) => {
    if (value !== "0") {
      const usadaPor = aplicacoesUsadas.get(value);
      if (usadaPor && usadaPor !== bancoCodigo) {
        toast.error("Aplicação já vinculada a outro banco");
        return;
      }
    }
    await atualizarMapeamento(mapeamentoId, { [col]: value });
  };

  const getAplicacoesDisponiveis = (bancoCodigo: string, currentValue: string) => {
    return contasAplicacao.filter((c) => {
      if (c.codigo === currentValue) return true;
      const usadaPor = aplicacoesUsadas.get(c.codigo);
      return !usadaPor || usadaPor === bancoCodigo;
    });
  };

  const bancosSemMapeamento = contasBanco.filter(c => !mapeamentoByBanco.has(c.codigo));

  return (
    <div className="space-y-3">
      {/* Plano de Contas */}
      <Collapsible open={planoOpen} onOpenChange={setPlanoOpen}>
        <Card>
          <CardContent className="pt-4 space-y-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Plano de Contas</span>
                {temPlano && <Badge variant="secondary" className="text-[10px]">{planoEmpresa.length} contas</Badge>}
                {planoArquivo && <Badge variant="outline" className="text-[10px]">{planoArquivo}</Badge>}
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${planoOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3">
              <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleUpload} />

              {!temPlano ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Carregue o plano de contas (.xls, .xlsx, .csv)</p>
                  <Button size="sm" onClick={() => inputRef.current?.click()} disabled={loading}>
                    {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                    Carregar Arquivo
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => inputRef.current?.click()} disabled={loading}>
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removerPlano.mutateAsync()}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Buscar conta..." value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} className="pl-8 h-8 text-xs" />
                  </div>

                  <ScrollArea className="max-h-[50vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-14 text-center text-[11px]">Banco</TableHead>
                          <TableHead className="w-14 text-center text-[11px]">Aplic.</TableHead>
                          <TableHead className="w-20 text-[11px]">Código</TableHead>
                          <TableHead className="text-[11px]">Descrição</TableHead>
                          <TableHead className="w-28 text-[11px]">Classif.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginado.map((conta) => (
                          <TableRow key={conta.id} className={conta.is_banco || conta.is_aplicacao ? "bg-primary/5" : ""}>
                            <TableCell className="text-center py-1">
                              <Checkbox checked={conta.is_banco} onCheckedChange={(v) => handleToggleBanco(conta.id, !!v)} />
                            </TableCell>
                            <TableCell className="text-center py-1">
                              <Checkbox checked={conta.is_aplicacao} onCheckedChange={(v) => handleToggleAplicacao(conta.id, !!v)} />
                            </TableCell>
                            <TableCell className="font-mono text-[11px] py-1">{conta.codigo}</TableCell>
                            <TableCell className="text-xs py-1">{conta.descricao}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground py-1">{conta.classificacao}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {totalPaginas > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{filtradoPlano.length} resultado(s) — Pág. {pagina}/{totalPaginas}</span>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>

      {/* Mapeamento Banco → Aplicações (empresa-level) */}
      {contasBanco.length > 0 && (
        <Collapsible open={bancosOpen} onOpenChange={setBancosOpen}>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Mapeamento Banco → Aplicações</span>
                  <Badge variant="secondary" className="text-[10px]">{contasBanco.length} banco(s)</Badge>
                  <Badge variant="secondary" className="text-[10px]">{contasAplicacao.length} aplic.</Badge>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${bancosOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" className="h-7 text-xs" onClick={syncMapeamentos} disabled={syncingMap}>
                    {syncingMap ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    {bancosSemMapeamento.length > 0 ? `Salvar (${bancosSemMapeamento.length} novo)` : "Salvar"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {contasBanco.map((banco) => {
                    const mapeamento = mapeamentoByBanco.get(banco.codigo);
                    const hasMapeamento = !!mapeamento;

                    return (
                      <div key={banco.id} className={`rounded-lg border p-3 space-y-2 ${hasMapeamento ? "bg-card border-border" : "bg-muted/30 border-dashed border-muted-foreground/30"}`}>
                        <div className="flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono text-muted-foreground">{banco.codigo}</p>
                            <p className="text-sm font-medium truncate">{banco.descricao}</p>
                          </div>
                          {hasMapeamento && (
                            editMode[banco.codigo] ? (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 border-emerald-500/50 text-emerald-400"
                                onClick={async () => {
                                  const nomeVal = editingRelatorio[banco.codigo]?.trim();
                                  if (nomeVal !== undefined && nomeVal !== (mapeamento.nome_relatorio || "")) {
                                    await atualizarMapeamento(mapeamento.id, { nome_relatorio: nomeVal || null });
                                  }
                                  setEditMode((prev) => ({ ...prev, [banco.codigo]: false }));
                                  toast.success("Configuração confirmada!");
                                }}>
                                <Check className="w-3.5 h-3.5" /> Confirmar
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                                onClick={() => {
                                  setEditingRelatorio((prev) => ({ ...prev, [banco.codigo]: mapeamento.nome_relatorio || "" }));
                                  setEditMode((prev) => ({ ...prev, [banco.codigo]: true }));
                                }}>
                                <Pencil className="w-3 h-3" /> Editar
                              </Button>
                            )
                          )}
                        </div>

                        {hasMapeamento ? (
                          <>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Nome no Relatório</label>
                              {editMode[banco.codigo] ? (
                                <Input value={editingRelatorio[banco.codigo] ?? mapeamento.nome_relatorio ?? ""} onChange={(e) => setEditingRelatorio((prev) => ({ ...prev, [banco.codigo]: e.target.value }))} placeholder="Ex: APAE GRAMADO CER II - 37.493-8" className="h-7 text-xs" />
                              ) : (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded block truncate">
                                  {mapeamento.nome_relatorio || <span className="italic text-muted-foreground">Não informado</span>}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Aplicações</label>
                              {(["aplicacao1_codigo", "aplicacao2_codigo", "aplicacao3_codigo", "aplicacao4_codigo", "aplicacao5_codigo"] as const).map((col, idx) => {
                                const currentVal = mapeamento[col] || "0";
                                const disponiveis = getAplicacoesDisponiveis(banco.codigo, currentVal);
                                const contaAplicacao = currentVal !== "0" ? contasAplicacao.find(c => c.codigo === currentVal) : null;

                                if (!editMode[banco.codigo]) {
                                  if (!contaAplicacao) return null;
                                  return <span key={col} className="text-xs bg-muted px-2 py-0.5 rounded block truncate">{contaAplicacao.codigo} - {contaAplicacao.descricao}</span>;
                                }

                                return (
                                  <Select key={col} value={currentVal} onValueChange={(v) => handleAtualizarAplicacao(mapeamento.id, col, v, banco.codigo)}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={`Aplicação ${idx + 1}`} /></SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                      <SelectItem value="0">— Nenhuma</SelectItem>
                                      {disponiveis.map((c) => <SelectItem key={c.codigo} value={c.codigo}>{c.codigo} - {c.descricao}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Salve para vincular aplicações</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
