import { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, CheckCircle, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden shadow-[0_0_40px_hsl(var(--cyan)/0.4)]">
          <img src="/pwa-512x512.png" alt="VaultCorp" className="w-full h-full" />
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Instalar VaultCorp</h1>
          <p className="text-sm text-muted-foreground">
            Acesse seus conversores e ferramentas direto da tela inicial do seu dispositivo.
          </p>
        </div>

        {isInstalled ? (
          <div className="glass rounded-xl p-6 space-y-3">
            <CheckCircle className="w-10 h-10 text-[hsl(var(--cyan))] mx-auto" />
            <p className="text-sm font-medium">App já instalado!</p>
            <Link to="/conversores">
              <Button variant="outline" size="sm" className="mt-2">Abrir Conversores</Button>
            </Link>
          </div>
        ) : isIOS ? (
          <div className="glass rounded-xl p-6 space-y-4 text-left">
            <p className="text-sm font-semibold text-center">Como instalar no iPhone/iPad:</p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="bg-[hsl(var(--cyan)/0.15)] text-[hsl(var(--cyan))] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <p>Toque no botão <Share className="inline w-4 h-4 -mt-0.5" /> <strong>Compartilhar</strong> na barra do Safari</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-[hsl(var(--cyan)/0.15)] text-[hsl(var(--cyan))] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <p>Role e toque em <strong>"Adicionar à Tela de Início"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-[hsl(var(--cyan)/0.15)] text-[hsl(var(--cyan))] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <p>Toque em <strong>"Adicionar"</strong> no canto superior direito</p>
              </div>
            </div>
          </div>
        ) : deferredPrompt ? (
          <Button
            onClick={handleInstall}
            size="lg"
            className="w-full gap-2 bg-[hsl(var(--cyan))] hover:bg-[hsl(var(--cyan)/0.9)] text-background font-bold"
          >
            <Download className="w-5 h-5" />
            Instalar Agora
          </Button>
        ) : (
          <div className="glass rounded-xl p-6 space-y-4 text-left">
            <p className="text-sm font-semibold text-center">Como instalar no Android:</p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="bg-[hsl(var(--cyan)/0.15)] text-[hsl(var(--cyan))] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <p>Toque em <MoreVertical className="inline w-4 h-4 -mt-0.5" /> <strong>Menu</strong> do navegador</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-[hsl(var(--cyan)/0.15)] text-[hsl(var(--cyan))] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <p>Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong></p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-xs">
            <Smartphone className="w-3.5 h-3.5" />
            Celular
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Monitor className="w-3.5 h-3.5" />
            Desktop
          </div>
        </div>

        <Link to="/conversores" className="block">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            Continuar no navegador
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default InstallApp;
