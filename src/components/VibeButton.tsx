import React, { useEffect, useRef } from 'react';
import type { SessionStatus } from '../hooks/useSessionManager';

interface VibeButtonProps {
    status: SessionStatus;
    volume: number; // 0 to 100
    onClick: () => void;
}

const VibeButton: React.FC<VibeButtonProps> = ({ status, volume, onClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let time = 0;

        const render = () => {
            time += 0.05;
            const width = canvas.width;
            const height = canvas.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const baseRadius = width * 0.3;

            ctx.clearRect(0, 0, width, height);

            // Base Circle (Glassmorphism)
            const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.8, centerX, centerY, baseRadius * 1.5);

            let primaryColor = '49, 130, 246'; // Toss Blue (#3182F6) default
            if (status === 'error') primaryColor = '240, 68, 82'; // Toss Red (#F04452)
            if (status === 'connected' || status === 'listening') primaryColor = '49, 130, 246'; // Toss Blue
            if (status === 'speaking') primaryColor = '52, 199, 89'; // Toss Green (#34C759) or similar vibrant

            gradient.addColorStop(0, `rgba(${primaryColor}, 0.2)`);
            gradient.addColorStop(1, `rgba(${primaryColor}, 0.0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();

            // Dynamic pulsing radius
            let pulse = 0;
            if (status === 'connecting') {
                pulse = Math.sin(time * 5) * 10;
            } else if (status === 'speaking' || status === 'listening') {
                // React to volume
                pulse = (volume / 100) * 30; // Max 30px expension
            } else {
                // Idle breathing
                pulse = Math.sin(time) * 5;
            }

            ctx.arc(centerX, centerY, baseRadius + pulse, 0, Math.PI * 2);
            ctx.fill();

            // Inner Core
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Text Label
            ctx.fillStyle = 'white';
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let label = 'START';
            if (status === 'connecting') label = 'CONNECTING...';
            if (status === 'connected') label = 'LISTENING';
            if (status === 'listening') label = 'LISTENING';
            if (status === 'speaking') label = 'SPEAKING';
            if (status === 'error') label = 'ERROR';

            ctx.fillText(label, centerX, centerY);

            animationRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [status, volume]);

    return (
        <div
            className="vibe-button-container"
            onClick={onClick}
            style={{
                cursor: 'pointer',
                width: '300px',
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        >
            <canvas
                ref={canvasRef}
                width={300}
                height={300}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default VibeButton;
