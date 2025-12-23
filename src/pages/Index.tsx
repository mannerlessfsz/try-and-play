import { CheckSquare, FileText, FileCheck, DollarSign } from "lucide-react";
import { VaultLogo } from "@/components/VaultLogo";
import { FeatureCard } from "@/components/FeatureCard";
import { ParticleField } from "@/components/ParticleField";

const features = [
  {
    icon: <CheckSquare className="w-7 h-7" />,
    title: "TASKVAULT",
    description: "Gerencie suas tarefas com prioridades inteligentes e controle total sobre sua produtividade diária",
    variant: "magenta" as const,
    href: "/taskvault",
  },
  {
    icon: <DollarSign className="w-7 h-7" />,
    title: "FINANCIALACE",
    description: "Gestão financeira profissional e pessoal com controle de fluxo de caixa e orçamentos",
    variant: "blue" as const,
    href: "/financialace",
  },
  {
    icon: <FileCheck className="w-7 h-7" />,
    title: "CONFERESPED",
    description: "Confira e valide arquivos SPED com precisão e gere relatórios detalhados",
    variant: "orange" as const,
    href: "/conferesped",
  },
  {
    icon: <FileText className="w-7 h-7" />,
    title: "AJUSTASPED",
    description: "Sistema inteligente para ajustes e validação automática de arquivos SPED com precisão",
    variant: "cyan" as const,
    href: "/ajustasped",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-magenta/30 via-magenta/10 to-transparent blur-3xl animate-pulse-slow opacity-60" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-radial from-blue/20 via-blue/5 to-transparent blur-3xl animate-float-slow opacity-50" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-radial from-cyan/15 via-cyan/5 to-transparent blur-3xl animate-float opacity-40" />
      </div>

      {/* Particle field */}
      <ParticleField />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 md:py-32">
        {/* Header */}
        <header className="text-center mb-20 md:mb-28">
          <div className="inline-block mb-6">
            <span className="px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase bg-muted/50 text-muted-foreground border border-border/50 backdrop-blur-sm">
              ✨ Plataforma de Produtividade
            </span>
          </div>
          
          <VaultLogo />
          
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Sua <span className="text-foreground font-semibold">central unificada</span> para 
            transformar a maneira como você trabalha
          </p>
          
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
              Rápido
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-magenta animate-pulse" />
              Seguro
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue animate-pulse" />
              Inteligente
            </span>
          </div>
        </header>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                variant={feature.variant}
                href={feature.href}
              />
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="mt-20 text-center">
          <p className="text-sm text-muted-foreground">
            Selecione uma ferramenta para começar
          </p>
          <div className="mt-4 flex justify-center">
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
