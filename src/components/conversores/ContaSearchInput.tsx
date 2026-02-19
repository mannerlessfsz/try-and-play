import { useState, useRef, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PlanoContasItem } from "@/utils/planoContasParser";

interface ContaSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  planoContas: PlanoContasItem[];
  placeholder?: string;
  className?: string;
  id?: string;
}

const MAX_RESULTS = 50;

export function ContaSearchInput({
  value,
  onChange,
  planoContas,
  placeholder = "Ex: 1",
  className = "w-24",
  id,
}: ContaSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync search with value when popover opens
  useEffect(() => {
    if (open) setSearch(value || "");
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return planoContas.slice(0, MAX_RESULTS);
    const termo = search.toLowerCase();
    return planoContas
      .filter(
        (c) =>
          c.codigo.toLowerCase().includes(termo) ||
          c.descricao.toLowerCase().includes(termo) ||
          c.classificacao.toLowerCase().includes(termo)
      )
      .slice(0, MAX_RESULTS);
  }, [planoContas, search]);

  const handleSelect = (conta: PlanoContasItem) => {
    onChange(conta.codigo);
    setOpen(false);
  };

  if (planoContas.length === 0) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={`relative ${className}`}>
          <Input
            id={id}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pr-7 w-full"
            ref={inputRef}
            autoComplete="off"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código ou descrição..."
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-60">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma conta encontrada
            </p>
          ) : (
            <div className="py-1">
              {filtered.map((conta, idx) => (
                <button
                  key={`${conta.codigo}-${idx}`}
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => handleSelect(conta)}
                >
                  <span className="font-mono text-xs text-primary min-w-[60px]">
                    {conta.codigo}
                  </span>
                  <span className="text-xs text-foreground truncate flex-1">
                    {conta.descricao}
                  </span>
                </button>
              ))}
              {filtered.length >= MAX_RESULTS && (
                <p className="text-[10px] text-muted-foreground text-center py-1">
                  Refine a busca para ver mais resultados
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
