import { useState } from "react";
import { 
  Zap, FileText, CreditCard, BarChart3, ArrowLeft, ArrowRight, Sparkles,
  FileSpreadsheet, Receipt, Calculator
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AjustaSpedTab } from "./AjustaSpedTab";

type AjustaSpedView = "home" | "notas_entrada" | "guias_pagamentos" | "control_cred" | "ajusta_sped";

const subModules = [
  {
    id: "notas_entrada" as const,
    icon: FileText,
    title: "Notas Entrada ST",
    description: "Cadastro e importação das notas fiscais de entrada com Substituição Tributária para composição dos créditos",
    color: "hsl(var(--orange))",
    step: 1,
    status: "novo" as const,
  },
  {
    id: "guias_pagamentos" as const,
    icon: CreditCard,
    title: "Guias Pagamentos",
    description: "Registro das guias de pagamento (DARJ/GNRE) vinculadas às notas de entrada ST — autenticações e valores pagos",
    color: "hsl(var(--blue))",
    step: 2,
    status: "novo" as const,
  },
  {
    id: "control_cred" as const,
    icon: BarChart3,
    title: "ControlCredICMSST",
    description: "Controle e cálculo dos créditos de ICMS-ST — valores de ICMS Próprio e ST proporcionais por nota fiscal",
    color: "hsl(270 80% 60%)",
    step: 3,
    status: "novo" as const,
  },
  {
    id: "ajusta_sped" as const,
    icon: Zap,
    title: "Ajusta SPED",
    description: "Processamento final — aplica ajustes C110, C112, C113, C195 e C197 no arquivo SPED com base nos dados consolidados",
    color: "hsl(var(--cyan))",
    step: 4,
    status: "ativo" as const,
  },
];

const statusConfig = {
  novo: { label: "Em breve", bg: "hsl(var(--muted))", text: "text-muted-foreground" },
  ativo: { label: "Ativo", bg: "hsl(var(--cyan))", text: "text-[hsl(var(--cyan))]" },
};

export function AjustaSpedHome() {
  const [activeView, setActiveView] = useState<AjustaSpedView>("home");

  return (
    <AnimatePresence mode="wait">
      {activeView === "home" ? (
        <motion.div
          key="home"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--blue))] flex items-center justify-center shadow-[0_0_30px_hsl(var(--cyan)/0.4)]">
              <Zap className="w-5 h-5 text-background" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Ajusta SPED</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pipeline de ajuste — da entrada de notas ao arquivo SPED ajustado
              </p>
            </div>
          </div>

          {/* Bento Cascade Grid */}
          <div className="grid grid-cols-12 gap-3 md:gap-4">
            {subModules.map((mod, index) => {
              const Icon = mod.icon;
              const isActive = mod.status === "ativo";
              const stCfg = statusConfig[mod.status];

              // Cascade staircase: each step shifts 2 cols right, widths vary for bento feel
              const gridPositions = [
                "col-span-12 md:col-span-8 md:col-start-1",   // 1 - starts left, wide
                "col-span-12 md:col-span-8 md:col-start-2",   // 2 - slight shift
                "col-span-12 md:col-span-9 md:col-start-3",   // 3 - wider, more shift
                "col-span-12 md:col-span-10 md:col-start-3",  // 4 - widest, final position (hero)
              ];

              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 20, x: index % 2 === 0 ? -15 : 15 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 180, damping: 20 }}
                  className={`${gridPositions[index]} relative`}
                >
                  {/* Diagonal connector from previous card */}
                  {index > 0 && (
                    <div className="hidden md:block absolute -top-4 left-0 right-0 h-4 pointer-events-none overflow-visible">
                      <svg className="absolute w-full h-8 -top-2" viewBox="0 0 100 16" preserveAspectRatio="none">
                        <path
                          d={index % 2 === 0 ? "M 30 0 Q 50 16, 20 16" : "M 20 0 Q 40 16, 50 16"}
                          fill="none"
                          stroke={mod.color}
                          strokeWidth="0.5"
                          strokeOpacity="0.3"
                          strokeDasharray="2 2"
                        />
                      </svg>
                    </div>
                  )}

                  <motion.div
                    whileHover={isActive ? { scale: 1.01, y: -2 } : {}}
                    whileTap={isActive ? { scale: 0.99 } : {}}
                    onClick={() => isActive && setActiveView(mod.id)}
                    className={`glass rounded-2xl p-5 md:p-6 relative overflow-hidden transition-all duration-300 group ${
                      isActive
                        ? "cursor-pointer"
                        : "opacity-45 cursor-default"
                    }`}
                    style={{ borderColor: "transparent" }}
                    onMouseEnter={(e) => {
                      if (isActive) {
                        (e.currentTarget as HTMLElement).style.borderColor = mod.color + "50";
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${mod.color}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    {/* Radial glow */}
                    <div
                      className="absolute -top-10 -right-10 w-36 h-36 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
                      style={{ background: mod.color }}
                    />

                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                      style={{ background: mod.color, opacity: isActive ? 0.8 : 0.25 }}
                    />

                    {/* Step number watermark */}
                    <div
                      className="absolute -right-2 -bottom-4 text-[72px] font-black font-mono leading-none pointer-events-none select-none"
                      style={{ color: mod.color, opacity: 0.04 }}
                    >
                      {mod.step}
                    </div>

                    <div className="relative z-10 flex items-start gap-4">
                      {/* Step badge + Icon stacked */}
                      <div className="shrink-0 flex flex-col items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono border"
                          style={{
                            backgroundColor: mod.color + "15",
                            borderColor: mod.color + "30",
                            color: mod.color,
                          }}
                        >
                          {mod.step}
                        </div>
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110"
                          style={{
                            backgroundColor: mod.color + "12",
                            borderColor: mod.color + "25",
                          }}
                        >
                          <Icon className="w-5.5 h-5.5" style={{ color: mod.color }} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-bold text-base">{mod.title}</h3>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 shrink-0"
                            style={{
                              borderColor: isActive ? mod.color + "40" : undefined,
                              color: isActive ? mod.color : undefined,
                              backgroundColor: isActive ? mod.color + "10" : undefined,
                            }}
                          >
                            {stCfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {mod.description}
                        </p>

                        {/* Action */}
                        {isActive && (
                          <div
                            className="flex items-center gap-1.5 mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ color: mod.color }}
                          >
                            Abrir módulo <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
                      <motion.div
                        className="h-full"
                        style={{ background: `linear-gradient(90deg, ${mod.color}, transparent)` }}
                        initial={{ width: "0%" }}
                        whileInView={{ width: isActive ? "85%" : "20%" }}
                        transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={activeView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView("home")}
            className="mb-4 h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar ao painel
          </Button>

          {activeView === "ajusta_sped" && <AjustaSpedTab />}
          
          {activeView === "notas_entrada" && (
            <PlaceholderCard title="Notas Entrada ST" icon={FileText} color="hsl(var(--orange))" />
          )}
          {activeView === "guias_pagamentos" && (
            <PlaceholderCard title="Guias Pagamentos" icon={CreditCard} color="hsl(var(--blue))" />
          )}
          {activeView === "control_cred" && (
            <PlaceholderCard title="ControlCredICMSST" icon={BarChart3} color="hsl(270 80% 60%)" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlaceholderCard({ title, icon: Icon, color }: { title: string; icon: React.ComponentType<any>; color: string }) {
  return (
    <div className="glass rounded-2xl p-8 text-center space-y-4">
      <div
        className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border"
        style={{ backgroundColor: color + "12", borderColor: color + "25" }}
      >
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Este módulo será implementado em breve. Os dados gerados aqui alimentarão o processamento final do Ajusta SPED.
      </p>
    </div>
  );
}
