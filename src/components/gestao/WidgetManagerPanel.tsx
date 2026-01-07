import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings2, 
  X, 
  Wallet, 
  AlertTriangle, 
  TrendingUp, 
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useWidgetPreferences, 
  AVAILABLE_WIDGETS, 
  WidgetType 
} from "@/hooks/useWidgetPreferences";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WidgetManagerPanelProps {
  empresaId: string | undefined;
  isExpanded: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  Wallet: <Wallet className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  TrendingUp: <TrendingUp className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
};

const colorClasses: Record<string, string> = {
  green: "text-green-500 bg-green-500/10 border-green-500/30",
  orange: "text-orange bg-orange/10 border-orange/30",
  blue: "text-blue bg-blue/10 border-blue/30",
  magenta: "text-magenta bg-magenta/10 border-magenta/30",
};

export function WidgetManagerPanel({ empresaId, isExpanded }: WidgetManagerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isWidgetActive, toggleWidget, isLoading } = useWidgetPreferences(empresaId);

  const handleToggle = (widgetType: WidgetType, currentActive: boolean) => {
    toggleWidget.mutate({ widgetType, isActive: !currentActive });
  };

  const triggerButton = (
    <motion.button
      onClick={() => setIsOpen(true)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
        "transition-all duration-200",
        "border border-transparent",
        "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}
      whileHover={{ x: isExpanded ? -4 : 0, scale: isExpanded ? 1 : 1.1 }}
      whileTap={{ scale: 0.98 }}
    >
      <Settings2 className="w-5 h-5" />
      <AnimatePresence>
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="text-sm font-medium whitespace-nowrap"
          >
            Widgets
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  return (
    <>
      {/* Trigger Button in Sidebar */}
      {!isExpanded ? (
        <Tooltip>
          <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
          <TooltipContent side="left" className="bg-background/90 backdrop-blur-xl border-white/10">
            Widgets
          </TooltipContent>
        </Tooltip>
      ) : (
        triggerButton
      )}

      {/* Manager Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "fixed top-1/2 right-[280px] -translate-y-1/2 z-50",
                "w-80 max-h-[70vh]",
                "rounded-2xl border backdrop-blur-2xl",
                "bg-gradient-to-br from-background/95 to-background/80",
                "border-white/10 shadow-2xl",
                "overflow-hidden"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-magenta" />
                  <h3 className="font-semibold text-foreground">Gerenciar Widgets</h3>
                </div>
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Widget List */}
              <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
                {AVAILABLE_WIDGETS.map((widget) => {
                  const isActive = isWidgetActive(widget.type);
                  return (
                    <motion.div
                      key={widget.type}
                      layout
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl",
                        "border transition-all duration-200",
                        isActive
                          ? colorClasses[widget.moduleColor]
                          : "bg-white/5 border-white/10 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isActive ? "bg-white/10" : "bg-white/5"
                        )}>
                          {iconMap[widget.icon]}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {widget.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Navega para: {widget.navigateTo}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => handleToggle(widget.type, isActive)}
                        disabled={isLoading || toggleWidget.isPending}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-white/10 bg-white/5">
                <p className="text-xs text-muted-foreground text-center">
                  Widgets aparecem na parte inferior da tela
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
