import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  icon?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
  accentColor?: "blue" | "emerald";
}

export function PageHeader({ 
  title, 
  subtitle, 
  breadcrumbs, 
  actions,
  accentColor = "blue" 
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm mb-2">
        <Home className="w-3.5 h-3.5 text-muted-foreground" />
        {breadcrumbs.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className={cn(
              index === breadcrumbs.length - 1 
                ? accentColor === "blue" ? "text-blue-400 font-medium" : "text-emerald-400 font-medium"
                : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          </div>
        ))}
      </nav>
      
      {/* Title and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
