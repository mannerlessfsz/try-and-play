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

    // Dark: gold/amber tones on pure black
    // Light: soft module colors
    const blobs = isDark
      ? [
          { x: 0.3, y: 0.3, radius: 0.35, color: { r: 212, g: 175, b: 55 }, speed: 0.0003, phase: 0 },  // gold
          { x: 0.7, y: 0.5, radius: 0.3, color: { r: 180, g: 140, b: 30 }, speed: 0.0004, phase: 2 },   // dark gold
          { x: 0.5, y: 0.8, radius: 0.25, color: { r: 140, g: 100, b: 20 }, speed: 0.0005, phase: 4 },  // deep amber
        ]
      : [
          { x: 0.2, y: 0.3, radius: 0.35, color: { r: 220, g: 60, b: 60 }, speed: 0.0003, phase: 0 },   // red
          { x: 0.8, y: 0.3, radius: 0.3, color: { r: 40, g: 120, b: 220 }, speed: 0.0004, phase: 2 },    // blue
          { x: 0.5, y: 0.8, radius: 0.3, color: { r: 245, g: 140, b: 30 }, speed: 0.0005, phase: 4 },   // orange
          { x: 0.3, y: 0.7, radius: 0.25, color: { r: 40, g: 160, b: 100 }, speed: 0.0003, phase: 1 },  // green
        ];

    const animate = () => {
      time++;

      // Dark: pure black, Light: warm cream
      ctx.fillStyle = isDark ? 'hsl(0, 0%, 2%)' : 'hsl(40, 20%, 96%)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const blobAlpha = isDark ? [0.18, 0.06] : [0.12, 0.04];

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

      // Noise
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = isDark ? 0.015 : 0.008;
      for (let i = 0; i < 800; i++) {
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
