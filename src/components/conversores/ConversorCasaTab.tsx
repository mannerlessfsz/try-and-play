import { useState } from "react";
import { motion } from "framer-motion";
import { Home, FileSpreadsheet } from "lucide-react";
import { CasaStep1PlanoContas } from "./casa/CasaStep1PlanoContas";

type CasaStep = "plano" | "importar" | "revisar" | "exportar";

const steps: { key: CasaStep; label: string; icon: React.ReactNode }[] = [
  { key: "plano", label: "Plano de Contas", icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
];

export function ConversorCasaTab() {
  const [currentStep, setCurrentStep] = useState<CasaStep>("plano");

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 px-1">
        {steps.map((step, idx) => (
          <motion.button
            key={step.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setCurrentStep(step.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentStep === step.key
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {step.icon}
            {step.label}
          </motion.button>
        ))}
      </div>

      {/* Step content */}
      {currentStep === "plano" && (
        <CasaStep1PlanoContas onNext={() => {/* próximos passos */}} />
      )}
    </div>
  );
}
