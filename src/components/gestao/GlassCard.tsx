import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  accentColor?: string;
  index?: number;
  onClick?: () => void;
  hoverable?: boolean;
}

export function GlassCard({ 
  children, 
  className, 
  accentColor = "hsl(var(--blue))", 
  index = 0,
  onClick,
  hoverable = true,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200, damping: 20 }}
      onClick={onClick}
      className={cn(
        "glass rounded-2xl relative overflow-hidden group",
        hoverable && "transition-all duration-300 hover:shadow-[0_0_35px_hsl(var(--cyan)/0.1)]",
        onClick && "cursor-pointer",
        className
      )}
      style={{ borderColor: 'transparent' }}
      onMouseEnter={hoverable ? (e) => {
        (e.currentTarget as HTMLElement).style.borderColor = accentColor + '40';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${accentColor}15`;
      } : undefined}
      onMouseLeave={hoverable ? (e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      } : undefined}
    >
      {/* Radial ambient glow */}
      <div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
        style={{ background: accentColor }}
      />

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
        <motion.div
          className="h-full"
          style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
          initial={{ width: "0%" }}
          whileInView={{ width: "50%" }}
          transition={{ duration: 1, delay: index * 0.05 + 0.3 }}
        />
      </div>

      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

interface MetricGlassCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  accentColor?: string;
  index?: number;
  onClick?: () => void;
  subtitle?: string;
}

export function MetricGlassCard({
  icon,
  label,
  value,
  accentColor = "hsl(var(--blue))",
  index = 0,
  onClick,
  subtitle,
}: MetricGlassCardProps) {
  return (
    <GlassCard accentColor={accentColor} index={index} onClick={onClick}>
      <div className="p-4 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 shrink-0"
          style={{
            backgroundColor: accentColor + '12',
            borderColor: accentColor + '25',
          }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-lg font-bold leading-tight" style={{ color: accentColor }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

interface GlassSectionHeaderProps {
  icon: ReactNode;
  title: string;
  count?: number;
  accentColor?: string;
}

export function GlassSectionHeader({ icon, title, count, accentColor = "hsl(var(--blue))" }: GlassSectionHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          backgroundColor: accentColor + '15',
        }}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        {count !== undefined && (
          <p className="text-[11px] text-muted-foreground">{count} registro{count !== 1 ? 's' : ''}</p>
        )}
      </div>
    </div>
  );
}
