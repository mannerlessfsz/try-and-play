import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ChevronRight, ChevronDown, Minimize2, Maximize2 } from "lucide-react";

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
  disabled?: boolean;
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
    borderActive: "border-magenta",
    bg: "bg-magenta/10",
    bgHover: "bg-magenta/5",
    text: "text-magenta",
    glow: "shadow-[0_0_30px_rgba(236,72,153,0.4)]",
    glowSubtle: "shadow-[0_0_15px_rgba(236,72,153,0.2)]",
    hoverBg: "hover:bg-magenta/20",
    activeBg: "bg-magenta/20",
    gradient: "from-magenta/20 via-magenta/5 to-transparent",
    ring: "ring-magenta/50",
  },
  cyan: {
    border: "border-cyan/30",
    borderActive: "border-cyan",
    bg: "bg-cyan/10",
    bgHover: "bg-cyan/5",
    text: "text-cyan",
    glow: "shadow-[0_0_30px_rgba(34,211,238,0.4)]",
    glowSubtle: "shadow-[0_0_15px_rgba(34,211,238,0.2)]",
    hoverBg: "hover:bg-cyan/20",
    activeBg: "bg-cyan/20",
    gradient: "from-cyan/20 via-cyan/5 to-transparent",
    ring: "ring-cyan/50",
  },
  orange: {
    border: "border-orange/30",
    borderActive: "border-orange",
    bg: "bg-orange/10",
    bgHover: "bg-orange/5",
    text: "text-orange",
    glow: "shadow-[0_0_30px_rgba(249,115,22,0.4)]",
    glowSubtle: "shadow-[0_0_15px_rgba(249,115,22,0.2)]",
    hoverBg: "hover:bg-orange/20",
    activeBg: "bg-orange/20",
    gradient: "from-orange/20 via-orange/5 to-transparent",
    ring: "ring-orange/50",
  },
  blue: {
    border: "border-blue/30",
    borderActive: "border-blue",
    bg: "bg-blue/10",
    bgHover: "bg-blue/5",
    text: "text-blue",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.4)]",
    glowSubtle: "shadow-[0_0_15px_rgba(59,130,246,0.2)]",
    hoverBg: "hover:bg-blue/20",
    activeBg: "bg-blue/20",
    gradient: "from-blue/20 via-blue/5 to-transparent",
    ring: "ring-blue/50",
  },
};

export function RibbonMenu({ tabs, activeTab, onTabChange, title, accentColor }: RibbonMenuProps) {
  const styles = accentStyles[accentColor];
  const activeTabData = tabs.find(t => t.id === activeTab);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div className="w-full relative">
      {/* Ambient glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-b ${styles.gradient} opacity-50 pointer-events-none`} />
      
      {/* Top Bar with Logo and Breadcrumb */}
      <div className={`relative bg-card/60 backdrop-blur-2xl border-b ${styles.border} px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className={`
              flex items-center gap-2 ${styles.text} px-4 py-2 rounded-xl 
              transition-all duration-500 group relative overflow-hidden
              bg-gradient-to-r from-transparent to-transparent
              hover:from-white/5 hover:to-transparent
              border border-transparent hover:${styles.border}
            `}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${styles.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <Home className="w-5 h-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10" />
            <span className="font-bold tracking-wider relative z-10">VAULT</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-muted-foreground animate-pulse" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${styles.bg} ${styles.border} border`}>
              <span className={`font-bold ${styles.text} tracking-wide`}>{title}</span>
            </div>
          </div>
        </div>
        
        {/* Collapse toggle and profile */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              p-2 rounded-lg ${styles.hoverBg} transition-all duration-300
              ${styles.text} hover:scale-110 active:scale-95
            `}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          
          <div className={`
            w-9 h-9 rounded-xl ${styles.bg} ${styles.border} border-2 
            flex items-center justify-center cursor-pointer
            hover:scale-110 transition-all duration-300 ${styles.glowSubtle}
            group relative overflow-hidden
          `}>
            <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <span className={`text-sm font-bold ${styles.text} relative z-10`}>U</span>
          </div>
        </div>
      </div>

      {/* Ribbon Tabs */}
      <div className={`relative bg-card/40 backdrop-blur-xl border-b ${styles.border}`}>
        <div className="flex items-center px-4 gap-1">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-2 px-5 py-3 text-sm font-medium 
                transition-all duration-300 rounded-t-xl mt-1
                ${activeTab === tab.id 
                  ? `${styles.text} ${styles.activeBg} ${styles.border} border border-b-0` 
                  : `text-muted-foreground hover:text-foreground ${styles.hoverBg}`
                }
              `}
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              {/* Active tab glow */}
              {activeTab === tab.id && (
                <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full ${styles.bg} ${styles.glow}`} />
              )}
              
              <span className={`w-4 h-4 transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className="relative">
                {tab.label}
                {activeTab === tab.id && (
                  <span className={`absolute -bottom-1 left-0 right-0 h-0.5 ${styles.bg} rounded-full`} />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ribbon Content - Collapsible */}
      <div 
        className={`
          relative bg-card/30 backdrop-blur-xl border-b ${styles.border} ${styles.glowSubtle}
          transition-all duration-500 ease-out overflow-hidden
          ${isCollapsed ? 'max-h-0 opacity-0 py-0' : 'max-h-40 opacity-100'}
        `}
      >
        <div className="flex items-stretch px-4 py-4 gap-2">
          {activeTabData?.items.map((item, index) => (
            <div key={item.id} className="flex items-center">
              <button
                onClick={item.onClick}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                disabled={item.disabled}
                className={`
                  relative flex flex-col items-center gap-2 px-5 py-3 rounded-xl 
                  transition-all duration-300 group min-w-[80px]
                  ${item.disabled 
                    ? 'opacity-40 cursor-not-allowed' 
                    : `${styles.hoverBg} hover:scale-105 active:scale-95 cursor-pointer`
                  }
                `}
                style={{
                  animationDelay: `${index * 75}ms`
                }}
              >
                {/* Hover glow effect */}
                {hoveredItem === item.id && !item.disabled && (
                  <div className={`absolute inset-0 rounded-xl ${styles.bg} ${styles.glowSubtle} animate-pulse`} />
                )}
                
                {/* Icon container with animated border */}
                <div className={`
                  relative w-12 h-12 rounded-xl flex items-center justify-center
                  ${styles.bgHover} border ${styles.border}
                  group-hover:${styles.borderActive} group-hover:${styles.glow}
                  transition-all duration-300
                `}>
                  <div className={`
                    ${styles.text} transition-all duration-300
                    group-hover:scale-110 group-hover:drop-shadow-lg
                  `}>
                    {item.icon}
                  </div>
                  
                  {/* Corner accent */}
                  <div className={`
                    absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${styles.bg}
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    ${styles.glow}
                  `} />
                </div>
                
                {/* Label */}
                <span className={`
                  text-xs font-medium text-muted-foreground 
                  group-hover:text-foreground group-hover:${styles.text}
                  transition-all duration-300 relative z-10
                `}>
                  {item.label}
                </span>
              </button>
              
              {/* Separator with gradient */}
              {index < activeTabData.items.length - 1 && (
                <div className={`
                  w-px h-16 mx-2 bg-gradient-to-b 
                  from-transparent via-muted-foreground/30 to-transparent
                `} />
              )}
            </div>
          ))}
        </div>
        
        {/* Bottom accent line */}
        <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${accentColor}/30 to-transparent`} />
      </div>
    </div>
  );
}
