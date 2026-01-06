import { CheckSquare, FileCheck, DollarSign, Settings, LogOut, RefreshCw, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VaultLogo } from "@/components/VaultLogo";
import { CompactFeatureCard } from "@/components/CompactFeatureCard";
import { GradientMesh } from "@/components/GradientMesh";
import { CursorGlow } from "@/components/CursorGlow";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, AppModule } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

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
    icon: <CheckSquare className="w-6 h-6" />,
    title: "TASKVAULT",
    description: "Gerencie suas tarefas com prioridades inteligentes e controle total sobre sua produtividade diária",
    variant: "magenta",
    href: "/taskvault",
    module: "taskvault",
  },
  {
    icon: <DollarSign className="w-6 h-6" />,
    title: "GESTÃO",
    description: "Sistema integrado de gestão financeira, produtos, clientes, vendas, compras e estoque",
    variant: "blue",
    href: "/gestao",
    module: "gestao",
  },
  {
    icon: <FileCheck className="w-6 h-6" />,
    title: "CONFERESPED",
    description: "Confira e valide arquivos SPED com precisão e gere relatórios detalhados",
    variant: "orange",
    href: "/conferesped",
    module: "conferesped",
  },
  {
    icon: <RefreshCw className="w-6 h-6" />,
    title: "CONVERSORES",
    description: "Converta arquivos fiscais, extratos, SPED, APAE, CASA e LÍDER",
    variant: "green",
    href: "/conversores",
    module: "conversores",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, hasModuleAccess } = usePermissions();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden cursor-none">
      {/* Cursor glow effect */}
      <CursorGlow />

      {/* Animated gradient mesh background */}
      <GradientMesh />

      {/* Subtle grid overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-magenta/60"
          animate={{ 
            y: [0, -20, 0],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-[40%] right-[15%] w-3 h-3 rounded-full bg-blue/50"
          animate={{ 
            y: [0, 15, 0],
            x: [0, -10, 0],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-[30%] left-[20%] w-2 h-2 rounded-full bg-cyan/40"
          animate={{ 
            y: [0, -25, 0],
            scale: [1, 1.5, 1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Top bar with glass effect */}
      <motion.div 
        className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4 text-magenta" />
            <span className="text-xs font-medium tracking-wider uppercase">Central Vault</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/admin')} 
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5 backdrop-blur-sm cursor-none"
              >
                <Settings className="w-4 h-4" /> Admin
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut} 
              className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5 backdrop-blur-sm cursor-none"
            >
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-24 md:py-32">
        {/* Header */}
        <motion.header 
          className="text-center mb-16 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-block mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <span className="px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase bg-gradient-to-r from-magenta/10 to-blue/10 text-muted-foreground border border-border/30 backdrop-blur-xl inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse" />
              Plataforma de Produtividade
            </span>
          </motion.div>
          
          <VaultLogo />
          
          <motion.p 
            className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Sua <span className="text-foreground font-semibold bg-gradient-to-r from-magenta to-blue bg-clip-text text-transparent">central unificada</span> para 
            transformar a maneira como você trabalha
          </motion.p>
          
          <motion.div 
            className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {[
              { color: 'bg-cyan', label: 'Rápido' },
              { color: 'bg-magenta', label: 'Seguro' },
              { color: 'bg-blue', label: 'Inteligente' },
            ].map((item, index) => (
              <motion.span 
                key={item.label}
                className="flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                {item.label}
              </motion.span>
            ))}
          </motion.div>
        </motion.header>

        {/* Feature Cards Grid */}
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="flex items-center gap-3 mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-border" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Módulos Disponíveis</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="h-full"
              >
                <CompactFeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  variant={feature.variant}
                  href={feature.href}
                  disabled={!hasModuleAccess(feature.module)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Footer hint with animation */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <p className="text-sm text-muted-foreground/70">
            {isAdmin ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Você tem acesso total a todos os módulos
              </span>
            ) : (
              'Selecione uma ferramenta disponível para começar'
            )}
          </p>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
};

export default Index;
