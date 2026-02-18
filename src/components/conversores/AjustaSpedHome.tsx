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

          {/* Cascade Flow */}
          <div className="flex flex-col gap-0">
            {subModules.map((mod, index) => {
              const Icon = mod.icon;
              const isActive = mod.status === "ativo";
              const stCfg = statusConfig[mod.status];
              const isLast = index === subModules.length - 1;

              return (
                <div key={mod.id} className="relative" style={{ paddingLeft: `${index * 16}px` }}>
                  {/* Connector line from previous */}
                  {index > 0 && (
                    <div
                      className="absolute top-0 h-4 w-[2px] rounded-full"
                      style={{
                        left: `${index * 16 + 18}px`,
                        background: `linear-gradient(180deg, ${subModules[index - 1].color}50, ${mod.color}50)`,
                      }}
                    />
                  )}

                  {/* Connector arrow */}
                  {index > 0 && (
                    <div
                      className="absolute top-0 flex items-center justify-center"
                      style={{ left: `${index * 16 + 12}px` }}
                    >
                      <ArrowRight
                        className="w-3 h-3 rotate-90 opacity-30"
                        style={{ color: mod.color }}
                      />
                    </div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, type: "spring", stiffness: 180, damping: 20 }}
                    whileHover={isActive ? { scale: 1.01, x: 4 } : {}}
                    whileTap={isActive ? { scale: 0.99 } : {}}
                    onClick={() => isActive && setActiveView(mod.id)}
                    className={`glass rounded-2xl p-4 relative overflow-hidden flex items-center gap-4 transition-all duration-300 group ${
                      index > 0 ? "mt-2" : ""
                    } ${
                      isActive
                        ? "cursor-pointer hover:shadow-[0_0_35px_hsl(var(--cyan)/0.15)]"
                        : "opacity-50 cursor-default"
                    }`}
                    style={{ borderColor: "transparent" }}
                    onMouseEnter={(e) => {
                      if (isActive) {
                        (e.currentTarget as HTMLElement).style.borderColor = mod.color + "50";
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 35px ${mod.color}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    {/* Radial glow */}
                    <div
                      className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
                      style={{ background: mod.color }}
                    />

                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                      style={{ background: mod.color, opacity: isActive ? 0.8 : 0.25 }}
                    />

                    {/* Step badge */}
                    <div
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono border transition-all duration-300"
                      style={{
                        backgroundColor: mod.color + "15",
                        borderColor: mod.color + "30",
                        color: mod.color,
                      }}
                    >
                      {mod.step}
                    </div>

                    {/* Icon */}
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110"
                      style={{
                        backgroundColor: mod.color + "12",
                        borderColor: mod.color + "25",
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: mod.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{mod.title}</p>
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
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {mod.description}
                      </p>
                    </div>

                    {/* Action */}
                    {isActive && (
                      <div
                        className="shrink-0 flex items-center gap-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ color: mod.color }}
                      >
                        Abrir <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Bottom progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
                      <motion.div
                        className="h-full"
                        style={{ background: `linear-gradient(90deg, ${mod.color}, transparent)` }}
                        initial={{ width: "0%" }}
                        whileInView={{ width: isActive ? "80%" : "20%" }}
                        transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                      />
                    </div>
                  </motion.div>
                </div>
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
