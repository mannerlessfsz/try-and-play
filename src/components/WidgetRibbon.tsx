import { ReactNode, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Home, ChevronRight, GripVertical, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";

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

interface WidgetPosition {
  x: number;
  y: number;
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
  const [positions, setPositions] = useState<Record<string, WidgetPosition>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleWidget = (id: string) => {
    setExpandedWidgets(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, widgetId: string) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Get current position or default to 0
    const currentPos = positions[widgetId] || { x: 0, y: 0 };
    
    setDragOffset({
      x: e.clientX - rect.left + currentPos.x,
      y: e.clientY - rect.top + currentPos.y
    });
    setDragging(widgetId);
    e.preventDefault();
  }, [positions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    
    setPositions(prev => ({
      ...prev,
      [dragging]: { x: newX, y: newY }
    }));
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const resetPosition = (widgetId: string) => {
    setPositions(prev => {
      const newPos = { ...prev };
      delete newPos[widgetId];
      return newPos;
    });
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
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`
          relative bg-card/20 backdrop-blur-xl border-b ${styles.border}
          transition-all duration-500 ease-out
          ${isMinimized ? 'h-0 opacity-0 overflow-hidden' : 'min-h-[200px] opacity-100'}
          ${dragging ? 'cursor-grabbing' : ''}
        `}
      >
        <div className="flex flex-wrap items-start gap-4 p-4">
          {groups.map((group, groupIndex) => {
            const isExpanded = expandedWidgets.includes(group.id);
            const pos = positions[group.id];
            const isDragging = dragging === group.id;
            
            return (
              <div 
                key={group.id}
                className={`
                  relative flex-shrink-0 rounded-2xl 
                  bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl
                  border ${styles.border} 
                  transition-all duration-300 ease-out
                  ${isExpanded ? styles.glowSubtle : ''}
                  ${isDragging ? `${styles.glow} scale-105 z-50` : 'z-10'}
                  hover:${styles.borderActive}
                `}
                style={{
                  transform: pos ? `translate(${pos.x}px, ${pos.y}px)` : undefined,
                  transition: isDragging ? 'box-shadow 0.2s, scale 0.2s' : 'all 0.3s ease-out',
                  animationDelay: `${groupIndex * 100}ms`
                }}
              >
                {/* Widget Header */}
                <div 
                  className={`
                    flex items-center justify-between gap-3 px-4 py-3
                    border-b ${isExpanded ? styles.border : 'border-transparent'}
                  `}
                >
                  {/* Drag Handle */}
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, group.id)}
                    onDoubleClick={() => resetPosition(group.id)}
                    className={`
                      p-1 rounded-md cursor-grab active:cursor-grabbing
                      ${styles.hoverBg} transition-all duration-200
                      text-muted-foreground hover:text-foreground
                    `}
                    title="Arraste para mover • Duplo clique para resetar"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => toggleWidget(group.id)}
                  >
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
                  
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleWidget(group.id)}
                    className={`
                      p-1.5 rounded-lg ${styles.hoverBg} ${styles.bg}
                      transition-all duration-300 ${styles.text}
                    `}
                  >
                    {isExpanded 
                      ? <ChevronUp className="w-4 h-4" /> 
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                </div>
                
                {/* Widget Content - Expandable */}
                <div 
                  className={`
                    grid grid-cols-2 gap-2 overflow-hidden
                    transition-all duration-500 ease-out
                    ${isExpanded ? 'max-h-[300px] p-3 opacity-100' : 'max-h-0 p-0 opacity-0'}
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
              </div>
            );
          })}
        </div>
        
        {/* Bottom accent */}
        <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${accentColor}/30 to-transparent`} />
      </div>
    </div>
  );
}