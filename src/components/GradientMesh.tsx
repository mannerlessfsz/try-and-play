import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface GradientMeshProps {
  className?: string;
}

export function GradientMesh({ className = '' }: GradientMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = resolvedTheme === 'dark';
    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const blobs = [
      { x: 0.3, y: 0.3, radius: 0.4, color: { r: 220, g: 40, b: 100 }, speed: 0.0003, phase: 0 },
      { x: 0.7, y: 0.6, radius: 0.35, color: { r: 60, g: 130, b: 246 }, speed: 0.0004, phase: 2 },
      { x: 0.5, y: 0.8, radius: 0.3, color: { r: 20, g: 184, b: 166 }, speed: 0.0005, phase: 4 },
      { x: 0.2, y: 0.7, radius: 0.25, color: { r: 249, g: 115, b: 22 }, speed: 0.0003, phase: 1 },
    ];

    const animate = () => {
      time++;

      ctx.fillStyle = isDark ? 'hsl(240, 10%, 4%)' : 'hsl(220, 20%, 97%)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const blobAlpha = isDark ? [0.4, 0.15] : [0.12, 0.04];

      blobs.forEach((blob) => {
        const offsetX = Math.sin(time * blob.speed + blob.phase) * 0.1;
        const offsetY = Math.cos(time * blob.speed * 1.3 + blob.phase) * 0.1;
        const pulseRadius = blob.radius + Math.sin(time * blob.speed * 2) * 0.05;

        const x = (blob.x + offsetX) * canvas.width;
        const y = (blob.y + offsetY) * canvas.height;
        const radius = pulseRadius * Math.min(canvas.width, canvas.height);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${blobAlpha[0]})`);
        gradient.addColorStop(0.5, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${blobAlpha[1]})`);
        gradient.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = isDark ? 'screen' : 'multiply';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = isDark ? 0.02 : 0.01;
      for (let i = 0; i < 1000; i++) {
        const nx = Math.random() * canvas.width;
        const ny = Math.random() * canvas.height;
        const brightness = Math.random() * 255;
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        ctx.fillRect(nx, ny, 1, 1);
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
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ opacity: 0.7 }}
    />
  );
}
