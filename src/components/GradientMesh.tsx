import { useEffect, useRef } from 'react';

interface GradientMeshProps {
  className?: string;
}

export function GradientMesh({ className = '' }: GradientMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Gradient blob configuration
    const blobs = [
      { x: 0.3, y: 0.3, radius: 0.4, color: { r: 220, g: 40, b: 100 }, speed: 0.0003, phase: 0 },      // Magenta
      { x: 0.7, y: 0.6, radius: 0.35, color: { r: 60, g: 130, b: 246 }, speed: 0.0004, phase: 2 },     // Blue
      { x: 0.5, y: 0.8, radius: 0.3, color: { r: 20, g: 184, b: 166 }, speed: 0.0005, phase: 4 },      // Cyan
      { x: 0.2, y: 0.7, radius: 0.25, color: { r: 249, g: 115, b: 22 }, speed: 0.0003, phase: 1 },     // Orange
    ];

    const animate = () => {
      time++;
      
      // Clear with very dark background
      ctx.fillStyle = 'hsl(240, 10%, 4%)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((blob, index) => {
        // Organic movement using sine waves
        const offsetX = Math.sin(time * blob.speed + blob.phase) * 0.1;
        const offsetY = Math.cos(time * blob.speed * 1.3 + blob.phase) * 0.1;
        const pulseRadius = blob.radius + Math.sin(time * blob.speed * 2) * 0.05;

        const x = (blob.x + offsetX) * canvas.width;
        const y = (blob.y + offsetY) * canvas.height;
        const radius = pulseRadius * Math.min(canvas.width, canvas.height);

        // Create gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.4)`);
        gradient.addColorStop(0.5, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.15)`);
        gradient.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // Add subtle noise texture
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.02;
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const brightness = Math.random() * 255;
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ opacity: 0.7 }}
    />
  );
}
