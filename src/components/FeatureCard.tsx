import { ReactNode } from "react";

type CardVariant = "magenta" | "cyan" | "orange" | "blue";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  variant: CardVariant;
}

const variantStyles: Record<CardVariant, { border: string; iconBg: string; titleColor: string }> = {
  magenta: {
    border: "border-glow-magenta",
    iconBg: "bg-magenta/20",
    titleColor: "text-magenta",
  },
  cyan: {
    border: "border-glow-cyan",
    iconBg: "bg-cyan/20",
    titleColor: "text-cyan",
  },
  orange: {
    border: "border-glow-orange",
    iconBg: "bg-orange/20",
    titleColor: "text-orange",
  },
  blue: {
    border: "border-glow-blue",
    iconBg: "bg-blue/20",
    titleColor: "text-blue",
  },
};

export function FeatureCard({ icon, title, description, variant }: FeatureCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`
        relative rounded-2xl border bg-card/50 backdrop-blur-sm p-6
        transition-all duration-300 hover:scale-[1.02] cursor-pointer
        ${styles.border}
      `}
    >
      <div className={`w-14 h-14 rounded-xl ${styles.iconBg} flex items-center justify-center mb-5`}>
        <div className={styles.titleColor}>{icon}</div>
      </div>
      <h3 className={`text-lg font-bold tracking-wide mb-2 ${styles.titleColor}`}>
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
