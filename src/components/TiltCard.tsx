import { ReactNode, useRef, useState, useCallback, forwardRef } from 'react';
import { motion } from 'framer-motion';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  glareColor?: string;
  maxTilt?: number;
  scale?: number;
}

export const TiltCard = forwardRef<HTMLDivElement, TiltCardProps>(({ 
  children, 
  className = '', 
  glareColor = 'rgba(255,255,255,0.1)',
  maxTilt = 12,
  scale = 1.02
}, ref) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
  });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const currentRef = cardRef.current;
    if (!currentRef) return;

    const rect = currentRef.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    const rotateX = (mouseY / (rect.height / 2)) * -maxTilt;
    const rotateY = (mouseX / (rect.width / 2)) * maxTilt;
    
    const glareX = ((e.clientX - rect.left) / rect.width) * 100;
    const glareY = ((e.clientY - rect.top) / rect.height) * 100;

    setTransform({ rotateX, rotateY, scale });
    setGlare({ x: glareX, y: glareY, opacity: 1 });
  }, [maxTilt, scale]);

  const handleMouseLeave = useCallback(() => {
    setTransform({ rotateX: 0, rotateY: 0, scale: 1 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  }, []);

  // Merge refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);

  return (
    <motion.div
      ref={setRefs}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: transform.rotateX,
        rotateY: transform.rotateY,
        scale: transform.scale,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      {children}
      
      {/* Glare effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
        animate={{ opacity: glare.opacity }}
        transition={{ duration: 0.2 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, ${glareColor} 0%, transparent 50%)`,
          }}
        />
      </motion.div>

      {/* Shine line effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
        animate={{ opacity: glare.opacity * 0.5 }}
      >
        <div
          className="absolute w-[200%] h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
          style={{
            top: `${glare.y}%`,
            left: '-50%',
            transform: `rotate(${transform.rotateY * 2}deg)`,
          }}
        />
      </motion.div>
    </motion.div>
  );
});

TiltCard.displayName = 'TiltCard';
