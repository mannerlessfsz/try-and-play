import { useState, useRef, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();

  const filtered = useMemo(() => {
    if (!value.trim()) return planoContas.slice(0, MAX_RESULTS);
    const termo = value.toLowerCase();
    return planoContas
      .filter(
        (c) =>
          c.codigo.toLowerCase().includes(termo) ||
          c.descricao.toLowerCase().includes(termo) ||
          c.classificacao.toLowerCase().includes(termo)
      )
      .slice(0, MAX_RESULTS);
  }, [planoContas, value]);

  const handleSelect = useCallback((conta: PlanoContasItem) => {
    onChange(conta.codigo);
    setOpen(false);
    inputRef.current?.focus();
  }, [onChange]);

  const handleFocus = useCallback(() => {
    clearTimeout(blurTimeout.current);
    if (planoContas.length > 0) setOpen(true);
  }, [planoContas.length]);

  const handleBlur = useCallback(() => {
    // Delay closing so click on list item registers first
    blurTimeout.current = setTimeout(() => setOpen(false), 200);
  }, []);

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
    <div ref={containerRef} className={`relative ${className}`}>
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="pr-7 w-full"
        autoComplete="off"
      />
      <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />

      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-72 z-50 rounded-md border bg-popover text-popover-foreground shadow-md">
          <ScrollArea className="max-h-52">
            <div className="py-1">
              {filtered.map((conta, idx) => (
                <button
                  key={`${conta.codigo}-${idx}`}
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors flex items-center gap-2"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur on the input
                    handleSelect(conta);
                  }}
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
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
