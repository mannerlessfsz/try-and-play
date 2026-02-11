import { cn } from "@/lib/utils";
import { Check, FileSpreadsheet, Building2, FileText, Settings2, Download } from "lucide-react";
import { motion } from "framer-motion";

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
  const progress = ((current - 1) / (steps.length - 1)) * 100;

  return (
    <div className="relative mb-6">
      {/* Glass container */}
      <div className="glass rounded-xl p-3 relative overflow-hidden">
        {/* Animated background glow */}
        <div
          className="absolute inset-0 opacity-20 transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 40% 100% at ${progress}% 50%, hsl(var(--cyan)), transparent)`,
          }}
        />

        <div className="flex items-center justify-between relative z-10">
          {steps.map((step, idx) => {
            const isActive = current === step.id;
            const isDone = current > step.id;
            const canClick = canGoTo(step.id);
            const Icon = isDone ? Check : step.icon;

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                {/* Step node */}
                <button
                  onClick={() => canClick && onStepClick(step.id)}
                  disabled={!canClick}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 whitespace-nowrap group",
                    isActive && "text-background",
                    isDone && !isActive && "text-foreground",
                    !isActive && !isDone && canClick && "text-muted-foreground hover:text-foreground",
                    !canClick && !isActive && !isDone && "text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  {/* Active glow pill */}
                  {isActive && (
                    <motion.div
                      layoutId="apae-step-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--blue)))",
                        boxShadow: "0 0 20px hsl(var(--cyan) / 0.5), 0 0 40px hsl(var(--cyan) / 0.2)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}

                  {/* Done indicator dot */}
                  {isDone && !isActive && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_hsl(160_100%_50%/0.6)]" />
                  )}

                  <Icon className={cn("w-3.5 h-3.5 relative z-10", isDone && "text-emerald-400")} />
                  <span className="hidden sm:inline relative z-10">{step.label}</span>
                </button>

                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 mx-1 h-px relative">
                    <div className="absolute inset-0 bg-border" />
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[hsl(var(--cyan))] to-[hsl(var(--cyan)/0.3)]"
                      initial={false}
                      animate={{ width: isDone ? "100%" : "0%" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
