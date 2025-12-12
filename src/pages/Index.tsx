import { CheckSquare, FileText, Shield, DollarSign } from "lucide-react";
import { VaultLogo } from "@/components/VaultLogo";
import { FeatureCard } from "@/components/FeatureCard";

const features = [
  {
    icon: <CheckSquare className="w-7 h-7" />,
    title: "TASKVAULT",
    description: "Gerencie suas tarefas com prioridades e controle total",
    variant: "magenta" as const,
  },
  {
    icon: <FileText className="w-7 h-7" />,
    title: "AJUSTASPED",
    description: "Sistema inteligente para ajustes e validação de arquivos SPED",
    variant: "cyan" as const,
  },
  {
    icon: <Shield className="w-7 h-7" />,
    title: "CONTROLERETENCOES",
    description: "Controle completo de retenções fiscais e obrigações tributárias",
    variant: "orange" as const,
  },
  {
    icon: <DollarSign className="w-7 h-7" />,
    title: "FINANCEIRO",
    description: "Gestão financeira completa com fluxo de caixa e relatórios",
    variant: "blue" as const,
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradients */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, hsl(320 100% 40% / 0.4), transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 20%, hsl(260 100% 50% / 0.3), transparent 50%),
            radial-gradient(ellipse 50% 30% at 90% 80%, hsl(210 100% 50% / 0.2), transparent 50%)
          `
        }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <header className="text-center mb-16">
          <VaultLogo />
          <p className="mt-6 text-lg text-muted-foreground">
            Sua <span className="text-foreground font-medium">central de produtividade</span> definitiva
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha uma ferramenta e comece a transformar seu dia
          </p>
        </header>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              variant={feature.variant}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
