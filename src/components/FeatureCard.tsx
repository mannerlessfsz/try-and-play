import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type CardVariant = "magenta" | "cyan" | "orange" | "blue" | "green";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  variant: CardVariant;
  href: string;
}

const variantStyles: Record<CardVariant, { 
  gradient: string; 
  glow: string; 
  iconBg: string;
  hoverBorder: string;
}> = {
  magenta: {
    gradient: "from-magenta/20 via-magenta/5 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-10px_hsl(320,100%,60%)]",
    iconBg: "bg-gradient-to-br from-magenta to-magenta/60",
    hoverBorder: "group-hover:border-magenta/60",
  },
  cyan: {
    gradient: "from-cyan/20 via-cyan/5 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-10px_hsl(160,100%,50%)]",
    iconBg: "bg-gradient-to-br from-cyan to-cyan/60",
    hoverBorder: "group-hover:border-cyan/60",
  },
  orange: {
    gradient: "from-orange/20 via-orange/5 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-10px_hsl(25,100%,55%)]",
    iconBg: "bg-gradient-to-br from-orange to-orange/60",
    hoverBorder: "group-hover:border-orange/60",
  },
  blue: {
    gradient: "from-blue/20 via-blue/5 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-10px_hsl(210,100%,55%)]",
    iconBg: "bg-gradient-to-br from-blue to-blue/60",
    hoverBorder: "group-hover:border-blue/60",
  },
  green: {
    gradient: "from-green-500/20 via-green-500/5 to-transparent",
    glow: "group-hover:shadow-[0_0_60px_-10px_hsl(142,76%,36%)]",
    iconBg: "bg-gradient-to-br from-green-500 to-green-500/60",
    hoverBorder: "group-hover:border-green-500/60",
  },
};

export function FeatureCard({ icon, title, description, variant, href }: FeatureCardProps) {
  const styles = variantStyles[variant];

  return (
    <Link to={href} className="group relative block">
      {/* Glow background */}
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${styles.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
      
      {/* Card */}
      <div
        className={`
          relative overflow-hidden rounded-3xl border border-border/50 
          bg-card/30 backdrop-blur-xl p-8
          transition-all duration-500 ease-out
          group-hover:translate-y-[-4px]
          ${styles.glow}
          ${styles.hoverBorder}
        `}
      >
        {/* Corner accent */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${styles.gradient} opacity-50`} />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${styles.iconBg} flex items-center justify-center mb-6 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            <div className="text-primary-foreground">{icon}</div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold tracking-wide mb-3 text-foreground group-hover:text-gradient-animated transition-all duration-300">
            {title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            {description}
          </p>

          {/* Action hint */}
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
            <span>Acessar</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>

        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />
        </div>
      </div>
    </Link>
  );
}
