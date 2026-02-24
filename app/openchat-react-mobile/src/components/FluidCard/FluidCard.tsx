
import React, { useRef, useEffect } from 'react';

interface FluidCardProps {
    children: React.ReactNode;
    height?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

export const FluidCard: React.FC<FluidCardProps> = ({ children, height = '200px', style, onClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;
        
        // Configuration
        const color1 = '#2979FF'; // Primary Blue
        const color2 = '#00E5FF'; // Cyan
        
        let phase = 0;

        const draw = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);
            
            // Create Gradient Background
            const grd = ctx.createLinearGradient(0, 0, width, height);
            grd.addColorStop(0, '#1c1c1e'); // Dark bg
            grd.addColorStop(1, '#2c2c2e');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);

            // Draw Waves
            // We draw 3 layered sine waves with different speeds and amplitudes
            
            const drawWave = (amplitude: number, frequency: number, speed: number, color: string, alpha: number, offset: number) => {
                ctx.beginPath();
                ctx.moveTo(0, height);
                for (let x = 0; x <= width; x += 5) {
                    const y = Math.sin(x * frequency + phase * speed + offset) * amplitude + (height / 2);
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                ctx.fill();
            };

            // Wave 1 (Back)
            drawWave(30, 0.01, 0.02, color1, 0.2, 0);
            
            // Wave 2 (Middle)
            drawWave(25, 0.015, 0.03, color2, 0.15, 2);
            
            // Wave 3 (Front - Subtle)
            drawWave(15, 0.005, 0.01, '#ffffff', 0.05, 4);

            phase += 1;
            requestAnimationFrame(draw);
        };

        const animId = requestAnimationFrame(draw);

        const handleResize = () => {
            if (containerRef.current && canvas) {
                width = canvas.width = containerRef.current.offsetWidth;
                height = canvas.height = containerRef.current.offsetHeight;
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            onClick={onClick}
            style={{ 
                position: 'relative', 
                height, 
                borderRadius: '16px', 
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                ...style 
            }}
        >
            <canvas 
                ref={canvasRef} 
                style={{ width: '100%', height: '100%', display: 'block' }} 
            />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                {children}
            </div>
        </div>
    );
};
