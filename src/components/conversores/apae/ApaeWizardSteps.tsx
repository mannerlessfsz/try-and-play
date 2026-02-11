import { cn } from "@/lib/utils";
import { Check, FileSpreadsheet, Building2, FileText, Settings2, Download } from "lucide-react";

export type ApaeStep = 1 | 2 | 3 | 4 | 5;

const steps = [
  { id: 1 as const, title: "Plano de Contas", icon: FileSpreadsheet },
  { id: 2 as const, title: "Contas de Banco", icon: Building2 },
  { id: 3 as const, title: "Relatório", icon: FileText },
  { id: 4 as const, title: "Processamento", icon: Settings2 },
  { id: 5 as const, title: "Conferência", icon: Download },
];

interface Props {
  current: ApaeStep;
  onStepClick: (step: ApaeStep) => void;
  canGoTo: (step: ApaeStep) => boolean;
}

export function ApaeWizardSteps({ current, onStepClick, canGoTo }: Props) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
      {steps.map((step, idx) => {
        const isActive = current === step.id;
        const isDone = current > step.id;
        const canClick = canGoTo(step.id);
        const Icon = isDone ? Check : step.icon;

        return (
          <div key={step.id} className="flex items-center">
            {idx > 0 && (
              <div className={cn("w-8 h-0.5 mx-1", isDone ? "bg-primary" : "bg-muted")} />
            )}
            <button
              onClick={() => canClick && onStepClick(step.id)}
              disabled={!canClick}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                isActive && "bg-primary text-primary-foreground shadow-sm",
                isDone && !isActive && "bg-primary/10 text-primary",
                !isActive && !isDone && canClick && "hover:bg-muted text-muted-foreground",
                !canClick && !isActive && !isDone && "text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
