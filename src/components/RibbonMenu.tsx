import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";

interface RibbonTab {
  id: string;
  label: string;
  icon: ReactNode;
  items: RibbonItem[];
}

interface RibbonItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
}

interface RibbonMenuProps {
  tabs: RibbonTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  title: string;
  accentColor: "magenta" | "cyan" | "orange" | "blue";
}

const accentStyles = {
  magenta: {
    border: "border-magenta/30",
    bg: "bg-magenta/10",
    text: "text-magenta",
    glow: "shadow-[0_0_20px_rgba(236,72,153,0.3)]",
    hoverBg: "hover:bg-magenta/20",
    activeBg: "bg-magenta/20",
  },
  cyan: {
    border: "border-cyan/30",
    bg: "bg-cyan/10",
    text: "text-cyan",
    glow: "shadow-[0_0_20px_rgba(34,211,238,0.3)]",
    hoverBg: "hover:bg-cyan/20",
    activeBg: "bg-cyan/20",
  },
  orange: {
    border: "border-orange/30",
    bg: "bg-orange/10",
    text: "text-orange",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.3)]",
    hoverBg: "hover:bg-orange/20",
    activeBg: "bg-orange/20",
  },
  blue: {
    border: "border-blue/30",
    bg: "bg-blue/10",
    text: "text-blue",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    hoverBg: "hover:bg-blue/20",
    activeBg: "bg-blue/20",
  },
};

export function RibbonMenu({ tabs, activeTab, onTabChange, title, accentColor }: RibbonMenuProps) {
  const location = useLocation();
  const styles = accentStyles[accentColor];
  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="w-full">
      {/* Top Bar with Logo and Breadcrumb */}
      <div className={`bg-card/40 backdrop-blur-xl border-b ${styles.border} px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className={`flex items-center gap-2 ${styles.text} ${styles.hoverBg} px-3 py-2 rounded-lg transition-all duration-300 group`}
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">VAULT</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className={`font-bold ${styles.text}`}>{title}</span>
        </div>
        
        {/* Mini profile/actions area */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${styles.bg} ${styles.border} border flex items-center justify-center`}>
            <span className={`text-xs font-bold ${styles.text}`}>U</span>
          </div>
        </div>
      </div>

      {/* Ribbon Tabs */}
      <div className={`bg-card/30 backdrop-blur-xl border-b ${styles.border}`}>
        <div className="flex items-center px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 relative
                ${activeTab === tab.id 
                  ? `${styles.text} ${styles.activeBg}` 
                  : `text-muted-foreground ${styles.hoverBg} hover:text-foreground`
                }
              `}
            >
              <span className="w-4 h-4">{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${styles.bg} ${styles.text} bg-current`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ribbon Content */}
      <div className={`bg-card/20 backdrop-blur-xl border-b ${styles.border} ${styles.glow}`}>
        <div className="flex items-stretch px-4 py-3 gap-6">
          {activeTabData?.items.map((item, index) => (
            <div key={item.id} className="flex items-center">
              <button
                onClick={item.onClick}
                className={`
                  flex flex-col items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300
                  ${styles.hoverBg} hover:scale-105 group
                `}
              >
                <div className={`w-8 h-8 flex items-center justify-center ${styles.text} group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {item.label}
                </span>
              </button>
              {index < activeTabData.items.length - 1 && (
                <div className={`w-px h-12 ${styles.border} border-l ml-4`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
