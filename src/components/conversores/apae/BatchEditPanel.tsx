import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, X, Layers, Check } from "lucide-react";
import { toast } from "sonner";

interface ContaOption {
  codigo: string;
  descricao: string;
}

interface Props {
  /** IDs dos resultados atualmente filtrados (visíveis na busca) */
  filteredIds: string[];
  filteredCount: number;
  planoOptions: ContaOption[];
  bancoOptions: ContaOption[];
  onBatchDebito: (ids: string[], codigo: string) => void;
  onBatchCredito: (ids: string[], codigo: string) => void;
}

function InlineBatchSelector({ options, placeholder, onSelect }: {
  options: ContaOption[];
  placeholder: string;
  onSelect: (codigo: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full text-xs justify-start"
        onClick={() => setOpen(true)}
      >
        <Search className="w-3 h-3 mr-1 shrink-0" />
        {placeholder}
      </Button>
    );
  }

  const filtered = search.trim()
    ? options.filter((o) => {
        const term = search.toLowerCase();
        return o.codigo.toLowerCase().includes(term) || o.descricao.toLowerCase().includes(term);
      }).slice(0, 30)
    : options.slice(0, 30);

  return (
    <div className="border border-border rounded-md bg-popover shadow-md">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
        <Search className="w-3 h-3 text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar conta..."
          className="flex-1 text-xs bg-transparent outline-none h-6"
        />
        <button onClick={() => { setOpen(false); setSearch(""); }} className="text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>
      <ScrollArea className="max-h-40">
        <div className="py-0.5">
          {filtered.length === 0 && (
            <p className="text-[10px] text-muted-foreground px-2 py-1">Nenhum resultado</p>
          )}
          {filtered.map((o) => (
            <button
              key={o.codigo}
              onClick={() => { onSelect(o.codigo); setOpen(false); setSearch(""); }}
              className="w-full text-left px-2 py-1 text-xs hover:bg-accent truncate"
            >
              <span className="font-mono">{o.codigo}</span>
              <span className="text-muted-foreground"> — {o.descricao}</span>
            </button>
          ))}
          {filtered.length === 30 && (
            <p className="text-[10px] text-muted-foreground px-2 py-1 italic">Refine a busca para ver mais...</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function BatchEditPanel({ filteredIds, filteredCount, planoOptions, bancoOptions, onBatchDebito, onBatchCredito }: Props) {
  const handleDebito = useCallback((codigo: string) => {
    onBatchDebito(filteredIds, codigo);
    const conta = planoOptions.find(c => c.codigo === codigo);
    toast.success(`Conta débito "${conta?.codigo || codigo}" aplicada a ${filteredIds.length} lançamento(s)`);
  }, [filteredIds, onBatchDebito, planoOptions]);

  const handleCredito = useCallback((codigo: string) => {
    onBatchCredito(filteredIds, codigo);
    const conta = bancoOptions.find(c => c.codigo === codigo);
    toast.success(`Conta crédito "${conta?.codigo || codigo}" aplicada a ${filteredIds.length} lançamento(s)`);
  }, [filteredIds, onBatchCredito, bancoOptions]);

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium">Edição em Lote</span>
        <Badge variant="secondary" className="text-[10px]">
          {filteredCount} lançamento(s) filtrado(s)
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Selecione uma conta para aplicar a <strong>todos os {filteredCount} lançamentos filtrados</strong>:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Conta Débito (todas as contas)
          </label>
          <InlineBatchSelector
            options={planoOptions}
            placeholder="Aplicar débito em lote..."
            onSelect={handleDebito}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Conta Crédito (bancos)
          </label>
          <InlineBatchSelector
            options={bancoOptions}
            placeholder="Aplicar crédito em lote..."
            onSelect={handleCredito}
          />
        </div>
      </div>
    </div>
  );
}
