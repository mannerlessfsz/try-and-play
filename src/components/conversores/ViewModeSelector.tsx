import { TableIcon, LayoutGrid, List, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ViewMode = "table" | "cards" | "accordion" | "grid";

const modes: { value: ViewMode; label: string; icon: React.ElementType }[] = [
  { value: "table", label: "Tabela", icon: TableIcon },
  { value: "cards", label: "Cards compactos", icon: List },
  { value: "accordion", label: "Acordeão", icon: Columns },
  { value: "grid", label: "Grid de cards", icon: LayoutGrid },
];

interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ value, onChange }: ViewModeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 glass rounded-lg p-0.5">
      {modes.map((m) => {
        const Icon = m.icon;
        const active = value === m.value;
        return (
          <Tooltip key={m.value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 rounded-md transition-all ${
                  active
                    ? "bg-primary/20 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onChange(m.value)}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {m.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
