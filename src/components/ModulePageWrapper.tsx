import { type ReactNode } from "react";

/**
 * Wraps a module page and overrides --primary/--ring/--accent
 * with the module's own color so all semantic tokens automatically
 * reflect the module identity.
 *
 * Usage:
 *   <ModulePageWrapper module="taskvault">…</ModulePageWrapper>
 */

const MODULE_COLORS = {
  taskvault: "var(--module-red)",
  gestao: "var(--module-blue)",
  messenger: "var(--module-orange)",
} as const;

type ModuleId = keyof typeof MODULE_COLORS;

interface Props {
  module: ModuleId;
  children: ReactNode;
  className?: string;
}

export function ModulePageWrapper({ module, children, className = "" }: Props) {
  const color = MODULE_COLORS[module];

  return (
    <div
      className={className}
      style={{
        // Override semantic tokens with module color
        "--primary": color,
        "--ring": color,
        "--accent": color,
        "--primary-foreground": "0 0% 100%",
        "--accent-foreground": "0 0% 100%",
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
