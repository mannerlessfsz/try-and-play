import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface WheelItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  children?: WheelItem[];
}

interface SidebarModule {
  id: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  accentHsl: string;
  href: string;
  items: WheelItem[];
  hasAccess: boolean;
}

function SidebarItem({
  item,
  depth = 0,
  accent,
  onNavigate,
}: {
  item: WheelItem;
  depth?: number;
  accent: string;
  onNavigate: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!(item.children && item.children.length > 0);
  const pl = 12 + depth * 16;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setOpen(!open);
          else onNavigate(item.href);
        }}
        className={cn(
          "w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-left transition-all duration-150",
          "hover:bg-muted/50 group text-sm",
          open && hasChildren && "bg-muted/30"
        )}
        style={{ paddingLeft: `${pl}px` }}
      >
        <span className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: accent }}>
          {item.icon}
        </span>
        <span className="flex-1 text-foreground/80 group-hover:text-foreground transition-colors font-medium text-[13px]">
          {item.label}
        </span>
        {hasChildren && (
          <motion.span
            className="text-muted-foreground/50"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.span>
        )}
        {!hasChildren && (
          <ChevronRight className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
      <AnimatePresence>
        {open && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {item.children!.map((child, i) => (
              <SidebarItem
                key={`${child.label}-${i}`}
                item={child}
                depth={depth + 1}
                accent={accent}
                onNavigate={onNavigate}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DashboardSidebar({ modules }: { modules: SidebarModule[] }) {
  const navigate = useNavigate();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  return (
    <motion.div
      className="w-full max-w-sm mx-auto flex flex-col gap-2"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      {modules.map((mod) => {
        const accent = `hsl(${mod.accentHsl})`;
        const isExpanded = expandedModule === mod.id;

        return (
          <motion.div
            key={mod.id}
            className={cn(
              "rounded-xl border backdrop-blur-xl overflow-hidden transition-colors duration-200 relative",
              mod.hasAccess ? "cursor-pointer" : "opacity-30 grayscale cursor-not-allowed"
            )}
            style={{
              borderColor: isExpanded ? `${accent}50` : "hsl(var(--border) / 0.3)",
            }}
            layout
          >
            {/* Light mode: colored bg / Dark mode: dark card */}
            <div
              className="absolute inset-0 rounded-xl dark:hidden"
              style={{ background: `linear-gradient(135deg, hsl(${mod.accentHsl}), hsl(${mod.accentHsl} / 0.85))` }}
            />
            <div
              className="absolute inset-0 rounded-xl hidden dark:block"
              style={{ background: isExpanded ? "hsl(var(--card) / 0.97)" : "hsl(var(--card) / 0.85)" }}
            />
            {/* Module header */}
            <button
              className="relative z-10 w-full flex items-center gap-3 p-4 hover:bg-white/10 dark:hover:bg-muted/30 transition-colors"
              onClick={() => {
                if (!mod.hasAccess) return;
                setExpandedModule(isExpanded ? null : mod.id);
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/20 dark:bg-transparent"
                style={{ color: "white" }}
              >
                <span className="dark:hidden">{mod.hasAccess ? mod.icon : <Lock className="w-5 h-5" />}</span>
                <span className="hidden dark:inline" style={{ color: accent }}>{mod.hasAccess ? mod.icon : <Lock className="w-5 h-5" />}</span>
              </div>
              <div className="flex-1 text-left">
                <span className="text-sm font-bold tracking-wider text-white dark:hidden">
                  {mod.title}
                </span>
                <span className="text-sm font-bold tracking-wider hidden dark:inline" style={{ color: accent }}>
                  {mod.title}
                </span>
                <p className="text-[11px] text-white/70 dark:text-muted-foreground">{mod.tagline}</p>
              </div>
              {mod.hasAccess && (
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-white/60 dark:text-muted-foreground/50"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              )}
            </button>

            {/* Expandable items */}
            <AnimatePresence>
              {isExpanded && mod.hasAccess && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden relative z-10"
                >
                  <div className="px-2 pb-3 border-t border-white/20 dark:border-border/10 pt-2">
                    {mod.items.map((item, i) => (
                      <SidebarItem
                        key={`${item.label}-${i}`}
                        item={item}
                        accent={accent}
                        onNavigate={navigate}
                      />
                    ))}
                    {/* Direct access button */}
                    <button
                      onClick={() => navigate(mod.href)}
                      className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-bold tracking-wider text-center transition-colors hover:bg-muted/40"
                      style={{ color: accent, borderTop: `1px solid ${accent}15` }}
                    >
                      Acessar {mod.title} →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
