import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ChevronRight, GripVertical, X, Maximize2, Minimize2 } from "lucide-react";

interface WidgetItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string | number;
}

interface WidgetGroup {
  id: string;
  label: string;
  icon: ReactNode;
  items: WidgetItem[];
}

interface WidgetRibbonProps {
  groups: WidgetGroup[];
  title: string;
  accentColor: "magenta" | "cyan" | "orange" | "blue";
}

const accentStyles = {
  magenta: {
    border: "border-magenta/30",
    borderActive: "border-magenta/60",
    bg: "bg-magenta/10",
    bgSolid: "bg-magenta",
    text: "text-magenta",
    glow: "shadow-[0_0_30px_rgba(220,38,38,0.4)]",
    glowSubtle: "shadow-[0_0_20px_rgba(220,38,38,0.2)]",
    hoverBg: "hover:bg-magenta/20",
    gradient: "from-magenta/20 via-magenta/5 to-transparent",
    gradientSolid: "from-magenta to-magenta/70",
  },
  cyan: {
    border: "border-cyan/30",
    borderActive: "border-cyan/60",
    bg: "bg-cyan/10",
    bgSolid: "bg-cyan",
    text: "text-cyan",
    glow: "shadow-[0_0_30px_rgba(34,211,238,0.4)]",
    glowSubtle: "shadow-[0_0_20px_rgba(34,211,238,0.2)]",
    hoverBg: "hover:bg-cyan/20",
    gradient: "from-cyan/20 via-cyan/5 to-transparent",
    gradientSolid: "from-cyan to-cyan/70",
  },
  orange: {
    border: "border-orange/30",
    borderActive: "border-orange/60",
    bg: "bg-orange/10",
    bgSolid: "bg-orange",
    text: "text-orange",
    glow: "shadow-[0_0_30px_rgba(249,115,22,0.4)]",
    glowSubtle: "shadow-[0_0_20px_rgba(249,115,22,0.2)]",
    hoverBg: "hover:bg-orange/20",
    gradient: "from-orange/20 via-orange/5 to-transparent",
    gradientSolid: "from-orange to-orange/70",
  },
  blue: {
    border: "border-blue/30",
    borderActive: "border-blue/60",
    bg: "bg-blue/10",
    bgSolid: "bg-blue",
    text: "text-blue",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.4)]",
    glowSubtle: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",
    hoverBg: "hover:bg-blue/20",
    gradient: "from-blue/20 via-blue/5 to-transparent",
    gradientSolid: "from-blue to-blue/70",
  },
};

export function WidgetRibbon({ groups, title, accentColor }: WidgetRibbonProps) {
  const styles = accentStyles[accentColor];
  const [expandedWidgets, setExpandedWidgets] = useState<string[]>(groups.map(g => g.id));
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleWidget = (id: string) => {
    setExpandedWidgets(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full relative">
      {/* Ambient gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${styles.gradient} opacity-30 pointer-events-none`} />
      
      {/* Top Bar */}
      <div className={`relative bg-card/60 backdrop-blur-2xl border-b ${styles.border} px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className={`
              flex items-center gap-2 ${styles.text} px-4 py-2 rounded-xl 
              transition-all duration-300 group relative overflow-hidden
              hover:bg-white/5 border border-transparent hover:${styles.border}
            `}
          >
            <Home className="w-5 h-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
            <span className="font-bold tracking-wider">VAULT</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${styles.bg} ${styles.border} border`}>
              <span className={`font-bold ${styles.text} tracking-wide`}>{title}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className={`p-2 rounded-lg ${styles.hoverBg} transition-all duration-300 ${styles.text}`}
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Widgets Container */}
      <div 
        className={`
          relative bg-card/20 backdrop-blur-xl border-b ${styles.border}
          transition-all duration-500 ease-out overflow-hidden
          ${isMinimized ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'}
        `}
      >
        <div className="flex items-stretch gap-4 p-4 overflow-x-auto scrollbar-thin">
          {groups.map((group, groupIndex) => (
            <div 
              key={group.id}
              className={`
                relative flex-shrink-0 rounded-2xl 
                bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl
                border ${styles.border} 
                transition-all duration-500 ease-out
                ${expandedWidgets.includes(group.id) ? styles.glowSubtle : ''}
                hover:${styles.borderActive}
              `}
              style={{
                animationDelay: `${groupIndex * 100}ms`
              }}
            >
              {/* Widget Header */}
              <div 
                className={`
                  flex items-center justify-between gap-3 px-4 py-3
                  border-b ${styles.border} cursor-pointer
                  transition-all duration-300
                `}
                onClick={() => toggleWidget(group.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-lg ${styles.bg} flex items-center justify-center
                    ${styles.text} transition-all duration-300
                  `}>
                    {group.icon}
                  </div>
                  <span className="font-semibold text-foreground text-sm whitespace-nowrap">
                    {group.label}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWidget(group.id);
                    }}
                    className={`
                      p-1 rounded-md ${styles.hoverBg} transition-all duration-300
                      text-muted-foreground hover:text-foreground
                    `}
                  >
                    <X className={`w-3 h-3 transition-transform duration-300 ${expandedWidgets.includes(group.id) ? '' : 'rotate-45'}`} />
                  </button>
                </div>
              </div>
              
              {/* Widget Content */}
              <div 
                className={`
                  grid grid-cols-2 gap-2 p-3
                  transition-all duration-500 ease-out
                  ${expandedWidgets.includes(group.id) ? 'opacity-100' : 'opacity-0 max-h-0 p-0 overflow-hidden'}
                `}
              >
                {group.items.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    disabled={item.disabled}
                    className={`
                      relative flex flex-col items-center gap-2 p-3 rounded-xl
                      transition-all duration-300 group min-w-[70px]
                      ${item.disabled 
                        ? 'opacity-40 cursor-not-allowed' 
                        : `cursor-pointer hover:scale-105 active:scale-95 ${styles.hoverBg}`
                      }
                    `}
                    style={{
                      animationDelay: `${itemIndex * 50}ms`
                    }}
                  >
                    {/* Hover effect */}
                    <div className={`
                      absolute inset-0 rounded-xl transition-all duration-300
                      ${hoveredItem === item.id && !item.disabled 
                        ? `${styles.bg} ${styles.glowSubtle}` 
                        : 'opacity-0'
                      }
                    `} />
                    
                    {/* Badge */}
                    {item.badge && (
                      <div className={`
                        absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                        rounded-full bg-gradient-to-r ${styles.gradientSolid}
                        flex items-center justify-center
                        text-[10px] font-bold text-primary-foreground
                        ${styles.glow}
                      `}>
                        {item.badge}
                      </div>
                    )}
                    
                    {/* Icon */}
                    <div className={`
                      relative w-10 h-10 rounded-xl flex items-center justify-center
                      bg-card/50 border ${styles.border}
                      group-hover:${styles.borderActive} group-hover:scale-110
                      transition-all duration-300 z-10
                    `}>
                      <div className={`${styles.text} transition-all duration-300`}>
                        {item.icon}
                      </div>
                      
                      {/* Corner dot */}
                      <div className={`
                        absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full
                        ${styles.bgSolid} opacity-0 group-hover:opacity-100
                        transition-opacity duration-300
                      `} />
                    </div>
                    
                    {/* Label */}
                    <span className={`
                      text-[10px] font-medium text-muted-foreground 
                      group-hover:${styles.text}
                      transition-all duration-300 relative z-10
                      whitespace-nowrap
                    `}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Widget footer glow line */}
              <div className={`
                absolute bottom-0 left-4 right-4 h-px 
                bg-gradient-to-r from-transparent ${styles.bg} to-transparent
              `} />
            </div>
          ))}
        </div>
        
        {/* Bottom accent */}
        <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${accentColor}/30 to-transparent`} />
      </div>
    </div>
  );
}