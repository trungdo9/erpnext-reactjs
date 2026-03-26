import { useEffect, useRef, memo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * ParticleCanvas - Shared animated particle background effect.
 *
 * Renders a canvas with floating particles and connection lines.
 * Supports optional mouse-repel interaction and customizable sizing mode.
 *
 * @param {number}  [particleCount]      - Number of particles (default: 50 desktop, 20 mobile)
 * @param {string}  [className]          - CSS class for the canvas element
 * @param {number}  [zIndex]             - Optional z-index (applied via inline style)
 * @param {boolean} [useMouseInteraction=false] - Enable mouse-repel effect
 * @param {boolean} [useParentSize=false]       - Size canvas to parent element instead of viewport
 * @param {number}  [connectionDistance=120]     - Max distance for drawing connection lines
 * @param {number}  [particleAlpha]             - Fixed alpha for all particles (if undefined, randomized 0.15-0.45)
 * @param {string[]} [colors]                   - Array of particle color hex strings
 */
const ParticleCanvas = memo(function ParticleCanvas({
    particleCount,
    className = 'fixed inset-0 z-[2] pointer-events-none',
    zIndex,
    useMouseInteraction = false,
    useParentSize = false,
    connectionDistance = 120,
    particleAlpha,
    colors = ['#3b82f6', '#1e3a5f', '#60a5fa', '#2c5282', '#93c5fd'],
}) {
    const prefersReducedMotion = useReducedMotion();
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -9999, y: -9999 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        let animId;
        let isTabVisible = !document.hidden;

        // Frame rate limiting: ~30fps (33.3ms per frame) instead of 60fps
        const FRAME_INTERVAL = 1000 / 30;
        let lastFrameTime = 0;

        const resize = () => {
            if (useParentSize && canvas.parentElement) {
                canvas.width = canvas.parentElement.offsetWidth;
                canvas.height = canvas.parentElement.offsetHeight;
            } else {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        };
        resize();
        window.addEventListener('resize', resize);

        // Pause animation when tab is not visible
        const onVisibilityChange = () => {
            isTabVisible = !document.hidden;
            if (isTabVisible) {
                lastFrameTime = 0; // Reset frame timing to avoid large delta
                animId = requestAnimationFrame(loop);
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        let onMouse;
        if (useMouseInteraction) {
            onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
            window.addEventListener('mousemove', onMouse);
        }

        const isMobile = window.innerWidth < 768;
        const COUNT = particleCount != null ? particleCount : (isMobile ? 15 : 50);
        const CONN = connectionDistance;
        const REPEL = 100;
        const hasRandomAlpha = particleAlpha === undefined;

        const pts = Array.from({ length: COUNT }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            r: Math.random() * 1.6 + 0.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: hasRandomAlpha ? (Math.random() * 0.3 + 0.15) : particleAlpha,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const { x: mx, y: my } = mouseRef.current;

            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];

                // Mouse repel
                if (useMouseInteraction) {
                    const mdx = p.x - mx, mdy = p.y - my;
                    const md = Math.sqrt(mdx * mdx + mdy * mdy);
                    if (md < REPEL) {
                        const f = (REPEL - md) / REPEL;
                        p.vx += (mdx / md) * f * 0.05;
                        p.vy += (mdy / md) * f * 0.05;
                    }
                    p.vx *= 0.998;
                    p.vy *= 0.998;
                }

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < -2) p.x = canvas.width + 2;
                if (p.x > canvas.width + 2) p.x = -2;
                if (p.y < -2) p.y = canvas.height + 2;
                if (p.y > canvas.height + 2) p.y = -2;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();

                for (let j = i + 1; j < pts.length; j++) {
                    const q = pts[j];
                    const dx = p.x - q.x, dy = p.y - q.y;
                    if (Math.abs(dx) > CONN || Math.abs(dy) > CONN) continue;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONN) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = p.color;
                        ctx.globalAlpha = 0.06 * (1 - dist / CONN);
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1;
        };

        // Throttled animation loop: skip frames to maintain ~30fps
        const loop = (timestamp) => {
            if (!isTabVisible) return; // Stop loop when tab hidden

            if (timestamp - lastFrameTime >= FRAME_INTERVAL) {
                lastFrameTime = timestamp;
                draw();
            }
            animId = requestAnimationFrame(loop);
        };
        animId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            if (onMouse) window.removeEventListener('mousemove', onMouse);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Skip rendering entirely when the user prefers reduced motion
    if (prefersReducedMotion) return null;

    const style = zIndex != null ? { zIndex } : undefined;

    return <canvas ref={canvasRef} className={className} style={style} />;
});

export default ParticleCanvas;
