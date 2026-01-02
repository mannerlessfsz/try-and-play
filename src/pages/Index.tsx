import { CheckSquare, FileText, FileCheck, DollarSign, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VaultLogo } from "@/components/VaultLogo";
import { CompactFeatureCard } from "@/components/CompactFeatureCard";
import { ParticleField } from "@/components/ParticleField";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, AppModule } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
interface FeatureConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant: "magenta" | "cyan" | "orange" | "blue" | "green";
  href: string;
  module: AppModule;
}

const features: FeatureConfig[] = [
  {
    icon: <CheckSquare className="w-7 h-7" />,
    title: "TASKVAULT",
    description: "Gerencie suas tarefas com prioridades inteligentes e controle total sobre sua produtividade diária",
    variant: "magenta",
    href: "/taskvault",
    module: "taskvault",
  },
  {
    icon: <DollarSign className="w-7 h-7" />,
    title: "GESTÃO",
    description: "Sistema integrado de gestão financeira, produtos, clientes, vendas, compras e estoque",
    variant: "blue",
    href: "/financialace",
    module: "financialace",
  },
  {
    icon: <FileCheck className="w-7 h-7" />,
    title: "CONFERESPED",
    description: "Confira e valide arquivos SPED com precisão e gere relatórios detalhados",
    variant: "orange",
    href: "/conferesped",
    module: "conferesped",
  },
  {
    icon: <FileText className="w-7 h-7" />,
    title: "AJUSTASPED",
    description: "Sistema inteligente para ajustes e validação automática de arquivos SPED com precisão",
    variant: "cyan",
    href: "/ajustasped",
    module: "ajustasped",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, hasModuleAccess } = usePermissions();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-2 text-muted-foreground hover:text-foreground">
            <Settings className="w-4 h-4" /> Admin
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" /> Sair
        </Button>
      </div>
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
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <header className="text-center mb-12 md:mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase bg-muted/50 text-muted-foreground border border-border/50 backdrop-blur-sm">
              ✨ Plataforma de Produtividade
            </span>
          </div>
          
          <VaultLogo />
          
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Sua <span className="text-foreground font-semibold">central unificada</span> para 
            transformar a maneira como você trabalha
          </p>
          
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted-foreground">
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


        {/* Feature Cards Grid - 4 em uma linha */}
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-muted-foreground">Módulos Disponíveis</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CompactFeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  variant={feature.variant}
                  href={feature.href}
                  disabled={!hasModuleAccess(feature.module)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Você tem acesso total a todos os módulos' : 'Selecione uma ferramenta disponível para começar'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
