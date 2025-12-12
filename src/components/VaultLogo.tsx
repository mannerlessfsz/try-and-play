import { Zap } from "lucide-react";

export function VaultLogo() {
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Outer glow ring */}
      <div className="absolute w-40 h-40 rounded-full bg-gradient-to-r from-magenta/20 via-blue/20 to-cyan/20 blur-3xl animate-spin-slow" />
      
      {/* Logo container */}
      <div className="relative flex items-center gap-4">
        {/* Animated icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-magenta/30 blur-xl rounded-full animate-pulse-glow" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-magenta via-primary to-blue flex items-center justify-center shadow-xl">
            <Zap className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-[0.4em] text-muted-foreground uppercase">
            Central
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-gradient-animated">
            VAULT
          </h1>
        </div>
      </div>

      {/* Floating orbs */}
      <div className="absolute -top-4 -right-8 w-3 h-3 rounded-full bg-cyan animate-float-delayed opacity-70" />
      <div className="absolute -bottom-2 -left-6 w-2 h-2 rounded-full bg-magenta animate-float opacity-60" />
      <div className="absolute top-1/2 -right-12 w-4 h-4 rounded-full bg-blue/50 animate-float-slow opacity-50" />
    </div>
  );
}
