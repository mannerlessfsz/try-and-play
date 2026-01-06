import { ReactNode } from "react";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TiltCard } from "./TiltCard";

type CardVariant = "magenta" | "cyan" | "orange" | "blue" | "green";

interface CompactFeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  variant: CardVariant;
  href: string;
  disabled?: boolean;
}

const variantStyles: Record<CardVariant, { 
  gradient: string; 
  glow: string; 
  iconBg: string;
  hoverBorder: string;
  glareColor: string;
  accentColor: string;
}> = {
  magenta: {
    gradient: "from-magenta/30 via-magenta/10 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-15px_hsl(320,100%,60%)]",
    iconBg: "bg-gradient-to-br from-magenta to-magenta/60",
    hoverBorder: "group-hover:border-magenta/70",
    glareColor: "rgba(220, 40, 100, 0.2)",
    accentColor: "hsl(320, 100%, 60%)",
  },
  cyan: {
    gradient: "from-cyan/30 via-cyan/10 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-15px_hsl(160,100%,50%)]",
    iconBg: "bg-gradient-to-br from-cyan to-cyan/60",
    hoverBorder: "group-hover:border-cyan/70",
    glareColor: "rgba(20, 184, 166, 0.2)",
    accentColor: "hsl(160, 100%, 50%)",
  },
  orange: {
    gradient: "from-orange/30 via-orange/10 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-15px_hsl(25,100%,55%)]",
    iconBg: "bg-gradient-to-br from-orange to-orange/60",
    hoverBorder: "group-hover:border-orange/70",
    glareColor: "rgba(249, 115, 22, 0.2)",
    accentColor: "hsl(25, 100%, 55%)",
  },
  blue: {
    gradient: "from-blue/30 via-blue/10 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-15px_hsl(210,100%,55%)]",
    iconBg: "bg-gradient-to-br from-blue to-blue/60",
    hoverBorder: "group-hover:border-blue/70",
    glareColor: "rgba(60, 130, 246, 0.2)",
    accentColor: "hsl(210, 100%, 55%)",
  },
  green: {
    gradient: "from-green-500/30 via-green-500/10 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-15px_hsl(142,76%,36%)]",
    iconBg: "bg-gradient-to-br from-green-500 to-green-500/60",
    hoverBorder: "group-hover:border-green-500/70",
    glareColor: "rgba(34, 197, 94, 0.2)",
    accentColor: "hsl(142, 76%, 36%)",
  },
};

export function CompactFeatureCard({ icon, title, description, variant, href, disabled = false }: CompactFeatureCardProps) {
  const styles = variantStyles[variant];

  const cardContent = (
    <TiltCard 
      className="group relative block h-full" 
      glareColor={disabled ? "transparent" : styles.glareColor}
      maxTilt={disabled ? 0 : 12}
      scale={disabled ? 1 : 1.02}
    >
      {/* Animated border gradient */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:from-magenta/50 group-hover:via-blue/50 group-hover:to-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
      
      {/* Glow background */}
      <motion.div 
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${styles.gradient} blur-2xl`}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: disabled ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      />
      
      {/* Card */}
      <div
        className={`
          relative overflow-hidden rounded-2xl border border-border/50 
          bg-card/40 backdrop-blur-2xl p-5
          transition-all duration-500 ease-out h-full
          ${!disabled ? `${styles.glow} ${styles.hoverBorder}` : 'opacity-50 grayscale'}
        `}
      >
        {/* Animated mesh gradient inside card */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${styles.gradient} blur-2xl animate-pulse`} />
          <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${styles.gradient} blur-xl animate-pulse`} style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Disabled overlay */}
        {disabled && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium bg-muted/80 px-3 py-1.5 rounded-full border border-border/50">
              <Lock className="w-3 h-3" />
              Sem acesso
            </div>
          </div>
        )}

        {/* Sparkle decoration */}
        {!disabled && (
          <motion.div 
            className="absolute top-3 right-3 text-muted-foreground/30 group-hover:text-foreground/50"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {/* Icon with enhanced animation */}
          <motion.div 
            className={`w-12 h-12 rounded-xl ${disabled ? 'bg-muted' : styles.iconBg} flex items-center justify-center shadow-lg mb-4`}
            whileHover={!disabled ? { 
              scale: 1.1, 
              rotate: [0, -5, 5, 0],
              boxShadow: `0 0 30px ${styles.accentColor}40`
            } : {}}
            transition={{ duration: 0.4 }}
          >
            <div className={`${disabled ? 'text-muted-foreground' : 'text-primary-foreground'}`}>
              {icon}
            </div>
          </motion.div>

          {/* Title with gradient on hover */}
          <h3 className={`text-base font-bold tracking-wide mb-2 ${disabled ? 'text-muted-foreground' : 'text-foreground group-hover:text-gradient-animated'} transition-all duration-300`}>
            {title}
          </h3>

          {/* Description with better typography */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
            {description}
          </p>

          {/* Enhanced action hint */}
          <motion.div 
            className={`flex items-center gap-2 text-sm font-medium ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground group-hover:text-foreground'} transition-colors duration-300`}
            whileHover={!disabled ? { x: 4 } : {}}
          >
            <span>{disabled ? 'Bloqueado' : 'Explorar módulo'}</span>
            {disabled ? (
              <Lock className="w-4 h-4" />
            ) : (
              <motion.div
                className="flex items-center"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Bottom accent line */}
        <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${!disabled ? `via-current to-transparent opacity-0 group-hover:opacity-50` : ''} transition-opacity duration-500`} 
          style={{ color: styles.accentColor }}
        />
      </div>
    </TiltCard>
  );

  if (disabled) {
    return <div className="cursor-not-allowed h-full">{cardContent}</div>;
  }

  return <Link to={href} className="block h-full">{cardContent}</Link>;
}
