import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ChevronRight, ChevronDown, Maximize2, Minimize2, Building2, Calendar, CalendarRange, ListTodo } from "lucide-react";

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
  sidebarContent?: ReactNode;
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

export function WidgetRibbon({ groups, title, accentColor, sidebarContent }: WidgetRibbonProps) {
  const styles = accentStyles[accentColor];
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleGroup = (id: string) => {
    setExpandedGroup(prev => prev === id ? null : id);
  };

  return (
    <>
      {/* Top Bar - Fixed at top */}
      <div className={`fixed top-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-b ${styles.border} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Link 
            to="/" 
            className={`
              flex items-center gap-2 ${styles.text} px-3 py-1.5 rounded-lg 
              transition-all duration-300 group
              hover:bg-white/10 border border-transparent hover:${styles.border}
            `}
          >
            <Home className="w-4 h-4 group-hover:scale-110 transition-all duration-300" />
            <span className="font-bold text-sm tracking-wider">VAULT</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${styles.bg} border ${styles.border}`}>
              <span className={`font-bold text-sm ${styles.text}`}>{title}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className={`p-1.5 rounded-md ${styles.hoverBg} transition-all duration-300 ${styles.text}`}
          title={isMinimized ? "Mostrar sidebar" : "Ocultar sidebar"}
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Right Sidebar - Now includes action groups */}
      <div 
        className={`
          fixed top-14 right-0 bottom-0 z-30
          w-64 bg-card/90 backdrop-blur-xl border-l ${styles.border}
          transition-all duration-400 ease-out
          ${isMinimized ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
          flex flex-col
        `}
      >
        {/* Custom sidebar content - Takes available space */}
        <div className="flex-1 overflow-y-auto">
          {sidebarContent ? (
            sidebarContent
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 p-4">
              <span className="text-[10px]">Sem conteúdo</span>
            </div>
          )}
        </div>

        {/* Action Groups Section - Fixed at bottom */}
        <div className="border-t border-foreground/10 bg-card/95 backdrop-blur-xl">
          <div className="p-3">
            <div className={`text-xs font-bold ${styles.text} mb-2`}>Ações</div>
            <div className="space-y-1">
              {groups.map((group) => {
                const isExpanded = expandedGroup === group.id;
                
                return (
                  <div key={group.id}>
                    {/* Group Header */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleGroup(group.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleGroup(group.id);
                        }
                      }}
                      className={`
                        w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg
                        transition-all duration-200 cursor-pointer select-none
                        ${isExpanded 
                          ? `${styles.bg} ${styles.border} border` 
                          : 'hover:bg-foreground/5 border border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 pointer-events-none">
                        <div className={`${isExpanded ? styles.text : 'text-muted-foreground'}`}>
                          {group.icon}
                        </div>
                        <span className={`text-xs font-medium ${isExpanded ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {group.label}
                        </span>
                      </div>
                      <ChevronDown 
                        className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 pointer-events-none
                          ${isExpanded ? 'rotate-180' : ''}`} 
                      />
                    </div>
                    
                    {/* Group Items */}
                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-1 mt-1 pl-2">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={item.onClick}
                            onMouseEnter={() => setHoveredItem(item.id)}
                            onMouseLeave={() => setHoveredItem(null)}
                            disabled={item.disabled}
                            className={`
                              relative flex flex-col items-center gap-1 p-2 rounded-lg
                              transition-all duration-200 group
                              ${item.disabled 
                                ? 'opacity-40 cursor-not-allowed' 
                                : `cursor-pointer hover:bg-foreground/10 active:scale-95`
                              }
                            `}
                          >
                            {/* Badge */}
                            {item.badge && (
                              <div className={`
                                absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5
                                rounded-full ${styles.bgSolid}
                                flex items-center justify-center
                                text-[8px] font-bold text-primary-foreground
                              `}>
                                {item.badge}
                              </div>
                            )}
                            
                            {/* Icon */}
                            <div className={`
                              w-7 h-7 rounded-md flex items-center justify-center
                              ${styles.bg} border ${styles.border}
                              group-hover:${styles.borderActive}
                              transition-all duration-200
                              ${hoveredItem === item.id ? styles.text : 'text-foreground/70'}
                            `}>
                              {item.icon}
                            </div>
                            
                            {/* Label */}
                            <span className={`
                              text-[9px] font-medium text-muted-foreground
                              group-hover:text-foreground
                              transition-colors duration-200
                              whitespace-nowrap
                            `}>
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Filter Select Component
interface FilterSelectProps {
  icon: ReactNode;
  label: string;
  options: string[];
  accentStyles: typeof accentStyles.magenta;
}

function FilterSelect({ icon, label, options, accentStyles: styles }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && <span className="text-[9px] text-muted-foreground/70 px-1">{label}</span>}
      <div className={`
        flex items-center gap-1.5 px-2 py-1.5 rounded-md
        bg-background/80 border border-foreground/10
        hover:border-foreground/20 transition-all duration-200
        text-xs text-foreground/80
      `}>
        <span className={styles.text}>{icon}</span>
        <select className="bg-transparent outline-none cursor-pointer text-[11px] min-w-[70px]">
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-background text-foreground">{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Filter Input Component
interface FilterInputProps {
  icon: ReactNode;
  label: string;
  type: string;
  placeholder: string;
  accentStyles: typeof accentStyles.magenta;
}

function FilterInput({ icon, label, type, placeholder, accentStyles: styles }: FilterInputProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && <span className="text-[9px] text-muted-foreground/70 px-1">{label}</span>}
      <div className={`
        flex items-center gap-1.5 px-2 py-1.5 rounded-md
        bg-background/80 border border-foreground/10
        hover:border-foreground/20 transition-all duration-200
        text-xs text-foreground/80
      `}>
        <span className={styles.text}>{icon}</span>
        <input 
          type={type}
          placeholder={placeholder}
          className="bg-transparent outline-none w-[90px] text-[11px] placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  );
}
