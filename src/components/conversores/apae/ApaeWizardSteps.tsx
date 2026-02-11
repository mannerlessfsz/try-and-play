import { cn } from "@/lib/utils";
import { Check, FileSpreadsheet, Building2, FileText, Settings2, Download } from "lucide-react";

export type ApaeStep = 1 | 2 | 3 | 4 | 5;

const steps = [
  { id: 1 as const, label: "Plano", icon: FileSpreadsheet },
  { id: 2 as const, label: "Bancos", icon: Building2 },
  { id: 3 as const, label: "Relatório", icon: FileText },
  { id: 4 as const, label: "Processar", icon: Settings2 },
  { id: 5 as const, label: "Exportar", icon: Download },
];

interface Props {
  current: ApaeStep;
  onStepClick: (step: ApaeStep) => void;
  canGoTo: (step: ApaeStep) => boolean;
}

export function ApaeWizardSteps({ current, onStepClick, canGoTo }: Props) {
  return (
    <div className="flex items-center gap-0.5 mb-4 overflow-x-auto">
      {steps.map((step, idx) => {
        const isActive = current === step.id;
        const isDone = current > step.id;
        const canClick = canGoTo(step.id);
        const Icon = isDone ? Check : step.icon;

        return (
          <div key={step.id} className="flex items-center">
            {idx > 0 && (
              <div className={cn("w-6 h-px mx-0.5", isDone ? "bg-primary" : "bg-muted")} />
            )}
            <button
              onClick={() => canClick && onStepClick(step.id)}
              disabled={!canClick}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                isActive && "bg-primary text-primary-foreground shadow-sm",
                isDone && !isActive && "bg-primary/10 text-primary",
                !isActive && !isDone && canClick && "hover:bg-muted text-muted-foreground",
                !canClick && !isActive && !isDone && "text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
