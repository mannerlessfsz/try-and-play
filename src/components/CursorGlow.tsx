import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Trail {
  id: number;
  x: number;
  y: number;
}

export function CursorGlow() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [trails, setTrails] = useState<Trail[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [trailId, setTrailId] = useState(0);

  useEffect(() => {
    let lastTrailTime = 0;
    const trailInterval = 50; // ms between trail particles

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      
      setPosition({ x, y });
      setIsVisible(true);

      const now = Date.now();
      if (now - lastTrailTime > trailInterval) {
        lastTrailTime = now;
        setTrailId(prev => prev + 1);
        setTrails(prev => {
          const newTrail = { id: trailId, x, y };
          const updated = [...prev, newTrail].slice(-8); // Keep last 8 trails
          return updated;
        });
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      setTrails([]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [trailId]);

  // Clean up old trails
  useEffect(() => {
    const cleanup = setInterval(() => {
      setTrails(prev => prev.slice(-8));
    }, 100);

    return () => clearInterval(cleanup);
  }, []);

  return (
    <>
      {/* Main cursor glow */}
      <motion.div
        className="fixed pointer-events-none z-[9999] mix-blend-screen"
        animate={{
          x: position.x - 150,
          y: position.y - 150,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 200,
          mass: 0.5,
        }}
      >
        <div className="w-[300px] h-[300px] rounded-full bg-gradient-radial from-magenta/20 via-blue/10 to-transparent blur-2xl" />
      </motion.div>

      {/* Trail particles */}
      <AnimatePresence>
        {trails.map((trail, index) => (
          <motion.div
            key={trail.id}
            className="fixed pointer-events-none z-[9998]"
            initial={{ 
              x: trail.x - 4, 
              y: trail.y - 4, 
              opacity: 0.6,
              scale: 1 
            }}
            animate={{ 
              opacity: 0, 
              scale: 0.3 
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.8, 
              ease: 'easeOut' 
            }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{
                background: `radial-gradient(circle, hsl(${320 - index * 10}, 100%, 60%) 0%, transparent 70%)`,
                boxShadow: `0 0 10px hsl(${320 - index * 10}, 100%, 50%)`,
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Inner cursor dot */}
      <motion.div
        className="fixed pointer-events-none z-[10000] mix-blend-difference"
        animate={{
          x: position.x - 6,
          y: position.y - 6,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          type: 'spring',
          damping: 50,
          stiffness: 500,
        }}
      >
        <div className="w-3 h-3 rounded-full bg-white" />
      </motion.div>
    </>
  );
}
