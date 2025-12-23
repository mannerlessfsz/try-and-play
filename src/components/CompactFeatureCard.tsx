import { ReactNode } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Link } from "react-router-dom";

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
}> = {
  magenta: {
    gradient: "from-magenta/20 via-magenta/5 to-transparent",
    glow: "group-hover:shadow-[0_0_40px_-10px_hsl(320,100%,60%)]",
    iconBg: "bg-gradient-to-br from-magenta to-magenta/60",
    hoverBorder: "group-hover:border-magenta/60",
  },
  cyan: {
    gradient: "from-cyan/20 via-cyan/5 to-transparent",
    glow: "group-hover:shadow-[0_0_40px_-10px_hsl(160,100%,50%)]",
    iconBg: "bg-gradient-to-br from-cyan to-cyan/60",
    hoverBorder: "group-hover:border-cyan/60",
  },
  orange: {
    gradient: "from-orange/20 via-orange/5 to-transparent",
    glow: "group-hover:shadow-[0_0_40px_-10px_hsl(25,100%,55%)]",
    iconBg: "bg-gradient-to-br from-orange to-orange/60",
    hoverBorder: "group-hover:border-orange/60",
  },
  blue: {
    gradient: "from-blue/20 via-blue/5 to-transparent",
    glow: "group-hover:shadow-[0_0_40px_-10px_hsl(210,100%,55%)]",
    iconBg: "bg-gradient-to-br from-blue to-blue/60",
    hoverBorder: "group-hover:border-blue/60",
  },
  green: {
    gradient: "from-green-500/20 via-green-500/5 to-transparent",
    glow: "group-hover:shadow-[0_0_40px_-10px_hsl(142,76%,36%)]",
    iconBg: "bg-gradient-to-br from-green-500 to-green-500/60",
    hoverBorder: "group-hover:border-green-500/60",
  },
};

export function CompactFeatureCard({ icon, title, description, variant, href, disabled = false }: CompactFeatureCardProps) {
  const styles = variantStyles[variant];

  const content = (
    <>
      {/* Glow background */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${styles.gradient} opacity-0 ${!disabled ? 'group-hover:opacity-100' : ''} transition-opacity duration-500 blur-xl`} />
      
      {/* Card */}
      <div
        className={`
          relative overflow-hidden rounded-2xl border border-border/50 
          bg-card/30 backdrop-blur-xl p-4
          transition-all duration-500 ease-out
          ${!disabled ? `group-hover:translate-y-[-2px] ${styles.glow} ${styles.hoverBorder}` : 'opacity-50 grayscale'}
        `}
      >
        {/* Disabled overlay */}
        {disabled && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium bg-muted/80 px-3 py-1.5 rounded-full">
              <Lock className="w-3 h-3" />
              Sem acesso
            </div>
          </div>
        )}

        {/* Corner accent */}
        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${styles.gradient} opacity-50`} />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Icon and Title row */}
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl ${disabled ? 'bg-muted' : styles.iconBg} flex items-center justify-center shadow-lg transition-transform duration-300 ${!disabled ? 'group-hover:scale-110' : ''}`}>
              <div className={`${disabled ? 'text-muted-foreground' : 'text-primary-foreground'} scale-75`}>{icon}</div>
            </div>
            <h3 className={`text-sm font-bold tracking-wide ${disabled ? 'text-muted-foreground' : 'text-foreground group-hover:text-gradient-animated'} transition-all duration-300`}>
              {title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-xs leading-relaxed mb-3 line-clamp-2">
            {description}
          </p>

          {/* Action hint */}
          <div className={`flex items-center gap-1 text-xs font-medium ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground group-hover:text-foreground'} transition-colors duration-300`}>
            <span>{disabled ? 'Bloqueado' : 'Acessar'}</span>
            {disabled ? <Lock className="w-3 h-3" /> : <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />}
          </div>
        </div>
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className="group relative block cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <Link to={href} className="group relative block">
      {content}
    </Link>
  );
}
