import { Rocket, Sparkles } from "lucide-react";

export function VaultLogo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <Rocket className="w-10 h-10 text-magenta animate-pulse-glow" />
      <h1 className="text-5xl md:text-6xl font-black tracking-tight text-gradient">
        VAULT
      </h1>
      <Sparkles className="w-8 h-8 text-yellow animate-float" />
    </div>
  );
}
