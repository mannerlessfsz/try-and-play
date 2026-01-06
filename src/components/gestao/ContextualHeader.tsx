import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface ContextualHeaderProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  moduleColor?: "blue" | "magenta" | "orange" | "green";
  actions?: React.ReactNode;
}

export function ContextualHeader({
  title,
  subtitle,
  icon,
  breadcrumbs = [],
  moduleColor = "blue",
  actions,
}: ContextualHeaderProps) {
  const navigate = useNavigate();

  const colorMap = {
    blue: {
      gradient: "from-blue/20 via-cyan/10 to-transparent",
      border: "border-blue/20",
      text: "text-blue",
      glow: "shadow-blue/20",
    },
    magenta: {
      gradient: "from-magenta/20 via-pink-500/10 to-transparent",
      border: "border-magenta/20",
      text: "text-magenta",
      glow: "shadow-magenta/20",
    },
    orange: {
      gradient: "from-orange/20 via-yellow-500/10 to-transparent",
      border: "border-orange/20",
      text: "text-orange",
      glow: "shadow-orange/20",
    },
    green: {
      gradient: "from-green-500/20 via-emerald-500/10 to-transparent",
      border: "border-green-500/20",
      text: "text-green-500",
      glow: "shadow-green-500/20",
    },
  };

  const colors = colorMap[moduleColor];

  return (
    <motion.header
      className={cn(
        "relative px-6 py-4 border-b",
        "bg-gradient-to-r",
        colors.gradient,
        colors.border,
        "backdrop-blur-xl"
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Ambient glow */}
      <div 
        className={cn(
          "absolute inset-0 opacity-30",
          "bg-gradient-to-r from-transparent via-current to-transparent",
          colors.text
        )}
        style={{ filter: "blur(40px)" }}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Icon with animated glow */}
          <motion.div
            className={cn(
              "relative p-3 rounded-2xl",
              "bg-gradient-to-br from-white/10 to-white/5",
              "border border-white/10",
              "shadow-lg",
              colors.glow
            )}
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className={cn("relative z-10", colors.text)}
              animate={{ 
                rotate: [0, -5, 5, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {icon}
            </motion.div>
            {/* Icon glow effect */}
            <div className={cn(
              "absolute inset-0 rounded-2xl opacity-50",
              "bg-gradient-to-br",
              colors.gradient
            )} />
          </motion.div>

          <div>
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <motion.nav 
                className="flex items-center gap-1.5 mb-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <button
                  onClick={() => navigate("/dashboard")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Home className="w-3.5 h-3.5" />
                </button>
                {breadcrumbs.map((crumb, index) => (
                  <motion.div
                    key={crumb.label}
                    className="flex items-center gap-1.5"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                    {crumb.href ? (
                      <button
                        onClick={() => navigate(crumb.href!)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className={cn("text-xs font-medium", colors.text)}>
                        {crumb.label}
                      </span>
                    )}
                  </motion.div>
                ))}
              </motion.nav>
            )}

            {/* Title */}
            <motion.h1
              className="text-xl font-bold text-foreground"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {title}
            </motion.h1>

            {/* Subtitle */}
            {subtitle && (
              <motion.p
                className="text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            {actions}
          </motion.div>
        )}
      </div>

      {/* Bottom accent line */}
      <motion.div
        className={cn(
          "absolute bottom-0 left-0 h-px",
          "bg-gradient-to-r from-transparent via-current to-transparent",
          colors.text
        )}
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </motion.header>
  );
}
