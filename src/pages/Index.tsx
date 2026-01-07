import { CheckSquare, MessageCircle, DollarSign, Settings, LogOut, RefreshCw, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { CompactFeatureCard } from "@/components/CompactFeatureCard";
import { GradientMesh } from "@/components/GradientMesh";
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
    icon: <MessageCircle className="w-6 h-6" />,
    title: "MESSENGER",
    description: "Comunicação integrada via WhatsApp Business para atendimento e envio de documentos",
    variant: "green",
    href: "/messenger",
    module: "messenger",
  },
  {
    icon: <RefreshCw className="w-6 h-6" />,
    title: "CONVERSORES",
    description: "Converta arquivos fiscais, extratos, SPED, APAE, CASA e LÍDER",
    variant: "cyan",
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
    <div className="min-h-screen bg-background relative overflow-hidden">
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
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-magenta/20 to-blue/20 backdrop-blur-xl border border-white/10 shadow-lg shadow-magenta/5">
              <Zap className="w-6 h-6 text-magenta fill-magenta" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                VAULT<span className="text-magenta">CORP</span>
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-wider">ENTERPRISE SUITE</p>
            </div>
          </motion.div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/admin')} 
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5 backdrop-blur-sm"
              >
                <Settings className="w-4 h-4" /> Admin
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut} 
              className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main content with cinematic entrance */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-24">
        {/* Hero section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-magenta/10 to-blue/10 border border-magenta/20 backdrop-blur-xl mb-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Zap className="w-4 h-4 text-magenta" />
            <span className="text-sm font-medium text-foreground/90">Plataforma Empresarial Unificada</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              Selecione seu
            </span>
            <br />
            <span className="bg-gradient-to-r from-magenta via-blue to-cyan bg-clip-text text-transparent">
              Módulo
            </span>
          </h2>
          
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Ferramentas poderosas para gestão empresarial integrada
          </p>
        </motion.div>
        
        {/* Feature cards grid with stagger animation */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature) => {
            const hasAccess = hasModuleAccess(feature.module);
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
              >
                <CompactFeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  variant={feature.variant}
                  href={feature.href}
                  disabled={!hasAccess}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom gradient fade */}
        <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default Index;
