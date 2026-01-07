import { useEffect } from "react";
import { CheckSquare, FileText, MessageCircle, DollarSign, ArrowRight, Shield, Zap, Users, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VaultLogo } from "@/components/VaultLogo";
import { ParticleField } from "@/components/ParticleField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const services = [
  {
    icon: <CheckSquare className="w-8 h-8" />,
    title: "TaskVault",
    description: "Sistema completo de gestão de tarefas com Kanban, prioridades inteligentes e acompanhamento em tempo real.",
    color: "text-magenta",
    bgGlow: "from-magenta/20"
  },
  {
    icon: <DollarSign className="w-8 h-8" />,
    title: "GESTÃO",
    description: "Sistema integrado de gestão financeira, produtos, clientes, vendas, compras e estoque.",
    color: "text-blue",
    bgGlow: "from-blue/20"
  },
  {
    icon: <MessageCircle className="w-8 h-8" />,
    title: "Messenger",
    description: "Comunicação integrada via WhatsApp Business para atendimento e envio de documentos aos clientes.",
    color: "text-emerald-500",
    bgGlow: "from-emerald-500/20"
  },
  {
    icon: <FileText className="w-8 h-8" />,
    title: "AjustaSped",
    description: "Correção e ajuste inteligente de arquivos SPED com validação automática e histórico de alterações.",
    color: "text-cyan",
    bgGlow: "from-cyan/20"
  }
];

const benefits = [
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Segurança Total",
    description: "Dados protegidos com criptografia e controle de acesso granular"
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Alta Performance",
    description: "Sistema otimizado para processar grandes volumes de dados"
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Multi-usuário",
    description: "Gerencie equipes com permissões personalizadas por módulo"
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading while checking auth or redirecting
  if (loading || user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-magenta/20 via-magenta/5 to-transparent blur-3xl opacity-60" />
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-gradient-radial from-blue/15 via-blue/5 to-transparent blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-radial from-cyan/10 via-cyan/5 to-transparent blur-3xl opacity-40" />
      </div>

      <ParticleField />

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Header */}
      <header className="relative z-50 border-b border-border/30 bg-background/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-magenta to-primary flex items-center justify-center">
              <span className="text-xl font-black text-primary-foreground">V</span>
            </div>
            <span className="text-xl font-bold text-foreground">VAULTCORP</span>
          </div>
          <Button 
            onClick={() => navigate('/auth')} 
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <LogIn className="w-4 h-4" />
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 py-20 md:py-32 text-center">
        <div className="inline-block mb-6">
          <span className="px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase bg-muted/50 text-muted-foreground border border-border/50 backdrop-blur-sm">
            ✨ Plataforma Empresarial Completa
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6">
          <span className="text-foreground">Transforme sua</span>
          <br />
          <span className="text-gradient-animated">Produtividade</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Uma suíte completa de ferramentas para gestão empresarial. 
          Tarefas, finanças e arquivos fiscais em uma única plataforma.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="gap-2 bg-primary hover:bg-primary/90 text-lg px-8"
          >
            Começar Agora <ArrowRight className="w-5 h-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-lg px-8"
          >
            Ver Serviços
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-foreground">4+</div>
            <div className="text-sm text-muted-foreground">Módulos Integrados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-foreground">100%</div>
            <div className="text-sm text-muted-foreground">Dados Seguros</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-foreground">24/7</div>
            <div className="text-sm text-muted-foreground">Disponibilidade</div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nossos Serviços
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Ferramentas especializadas para cada necessidade do seu negócio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <Card 
              key={service.title}
              className="glass border-border/50 hover:border-border transition-all duration-300 group overflow-hidden animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6 relative">
                <div className={`absolute inset-0 bg-gradient-radial ${service.bgGlow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`${service.color} mb-4`}>
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{service.title}</h3>
                  <p className="text-muted-foreground">{service.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 container mx-auto px-4 py-20">
        <div className="glass border-border/50 rounded-2xl p-8 md:p-12 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Por que escolher a VaultCorp?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={benefit.title}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Pronto para começar?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Acesse agora e descubra como a VaultCorp pode transformar a gestão do seu negócio.
        </p>
        <Button 
          size="lg" 
          onClick={() => navigate('/auth')}
          className="gap-2 bg-primary hover:bg-primary/90 text-lg px-10"
        >
          Acessar Plataforma <ArrowRight className="w-5 h-5" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} VaultCorp. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
