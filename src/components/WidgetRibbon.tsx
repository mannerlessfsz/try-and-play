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
          title={isMinimized ? "Mostrar widgets" : "Ocultar widgets"}
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Widgets Container - Fixed at bottom */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`
          fixed bottom-0 left-0 right-0 z-40
          bg-card/95 backdrop-blur-xl border-t ${styles.border}
          transition-all duration-400 ease-out
          ${isMinimized ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}
          ${dragging ? 'cursor-grabbing' : ''}
        `}
      >
        <div className="flex items-start gap-2 p-2 overflow-x-auto">
          {groups.map((group, groupIndex) => {
            const isExpanded = expandedWidgets.includes(group.id);
            const pos = positions[group.id];
            const isDragging = dragging === group.id;
            
            return (
              <div 
                key={group.id}
                className={`
                  relative flex-shrink-0 rounded-lg
                  bg-background/95 backdrop-blur-sm
                  border ${styles.border} 
                  transition-all duration-300 ease-out
                  ${isDragging ? `${styles.glow} scale-105 z-50` : 'z-10'}
                  hover:border-foreground/30
                `}
                style={{
                  transform: pos ? `translate(${pos.x}px, ${pos.y}px)` : undefined,
                  transition: isDragging ? 'box-shadow 0.2s, scale 0.2s' : 'all 0.3s ease-out',
                }}
              >
                {/* Widget Header - Compact */}
                <div 
                  className={`
                    flex items-center gap-2 px-2 py-1.5
                    ${isExpanded ? `border-b ${styles.border}` : ''}
                  `}
                >
                  {/* Drag Handle */}
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, group.id)}
                    onDoubleClick={() => resetPosition(group.id)}
                    className={`
                      p-0.5 rounded cursor-grab active:cursor-grabbing
                      text-muted-foreground/50 hover:text-foreground
                      transition-colors duration-200
                    `}
                    title="Arraste • Duplo clique = reset"
                  >
                    <GripVertical className="w-3 h-3" />
                  </div>
                  
                  <div 
                    className="flex items-center gap-2 flex-1 cursor-pointer select-none"
                    onClick={() => toggleWidget(group.id)}
                  >
                    <div className={`${styles.text}`}>
                      {group.icon}
                    </div>
                    <span className="font-semibold text-foreground text-xs whitespace-nowrap">
                      {group.label}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => toggleWidget(group.id)}
                    className={`p-0.5 rounded ${styles.text} opacity-60 hover:opacity-100 transition-opacity`}
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </button>
                </div>
                
                {/* Widget Content - Compact */}
                <div 
                  className={`
                    flex gap-1 overflow-hidden
                    transition-all duration-300 ease-out
                    ${isExpanded ? 'max-h-[120px] p-1.5 opacity-100' : 'max-h-0 p-0 opacity-0'}
                  `}
                >
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      disabled={item.disabled}
                      className={`
                        relative flex flex-col items-center gap-1 p-1.5 rounded-md
                        transition-all duration-200 group min-w-[48px]
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
                        bg-foreground/5 border border-foreground/10
                        group-hover:border-foreground/20 group-hover:bg-foreground/10
                        transition-all duration-200
                        ${hoveredItem === item.id ? styles.text : 'text-foreground/70'}
                      `}>
                        <div className="scale-75">
                          {item.icon}
                        </div>
                      </div>
                      
                      {/* Label */}
                      <span className={`
                        text-[9px] font-medium text-foreground/60
                        group-hover:text-foreground
                        transition-colors duration-200
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
      </div>
    </>
  );
}