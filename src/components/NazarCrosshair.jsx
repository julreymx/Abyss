import React, { useState, useEffect, useRef } from 'react';

export default function NazarCrosshair() {
    const [hovered, setHovered] = useState(false);
    const [eyeOpen, setEyeOpen] = useState(true);
    const blinkTimer = useRef(null);

    // Escucha eventos de hover desde objetos 3D
    useEffect(() => {
        const onHover = (e) => setHovered(e.detail.active);
        window.addEventListener('abyss:hover', onHover);
        return () => window.removeEventListener('abyss:hover', onHover);
    }, []);

    // Parpadeo aleatorio mientras está activo
    useEffect(() => {
        if (!hovered) { setEyeOpen(true); return; }
        const scheduleBlink = () => {
            blinkTimer.current = setTimeout(() => {
                setEyeOpen(false);
                setTimeout(() => {
                    setEyeOpen(true);
                    scheduleBlink();
                }, 120);
            }, Math.random() * 2500 + 800);
        };
        scheduleBlink();
        return () => clearTimeout(blinkTimer.current);
    }, [hovered]);

    return (
        <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 998,
            pointerEvents: 'none',
            width: '80px', height: '80px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {/* ─── CROSSHAIR BASE ─────────────────────────────── */}
            <svg
                width="80" height="80"
                viewBox="-40 -40 80 80"
                style={{
                    position: 'absolute',
                    transition: 'opacity 0.35s ease, transform 0.35s ease',
                    opacity: hovered ? 0 : 1,
                    transform: hovered ? 'scale(0.3) rotate(45deg)' : 'scale(1) rotate(0deg)',
                }}
            >
                {/* Líneas del crosshair */}
                <line x1="-30" y1="0" x2="-6" y2="0" stroke="#39FF14" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="6" y1="0" x2="30" y2="0" stroke="#39FF14" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="0" y1="-30" x2="0" y2="-6" stroke="#39FF14" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="0" y1="6" x2="0" y2="30" stroke="#39FF14" strokeWidth="1.5" strokeLinecap="round" />
                {/* Punto central */}
                <circle cx="0" cy="0" r="2" fill="#39FF14" />
                {/* Círculo exterior tenue */}
                <circle cx="0" cy="0" r="33" fill="none" stroke="#39FF14" strokeWidth="0.6" opacity="0.25" strokeDasharray="4 3" />

                {/* Esquinas diagonales */}
                <line x1="-27" y1="-27" x2="-20" y2="-27" stroke="#39FF14" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                <line x1="-27" y1="-27" x2="-27" y2="-20" stroke="#39FF14" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                <line x1="27" y1="-27" x2="20" y2="-27" stroke="#39FF14" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                <line x1="27" y1="-27" x2="27" y2="-20" stroke="#39FF14" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                <line x1="-27" y1="27" x2="-20" y2="27" stroke="#39FF14" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                <line x1="-27" y1="27" x2="-27" y2="20" stroke="#39FF14" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                <line x1="27" y1="27" x2="20" y2="27" stroke="#39FF14" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                <line x1="27" y1="27" x2="27" y2="20" stroke="#39FF14" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
            </svg>

            {/* ─── OJO TURCO / NAZAR ──────────────────────────── */}
            <svg
                width="110" height="80"
                viewBox="-55 -35 110 70"
                style={{
                    position: 'absolute',
                    transition: 'opacity 0.4s cubic-bezier(0.34,1.56,0.64,1), transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                    opacity: hovered ? 1 : 0,
                    transform: hovered
                        ? `scale(1) scaleY(${eyeOpen ? 1 : 0.07})`
                        : 'scale(0.2)',
                    filter: hovered
                        ? 'drop-shadow(0 0 6px gold) drop-shadow(0 0 18px rgba(180,130,0,0.7))'
                        : 'none',
                    transformOrigin: 'center center',
                }}
            >
                {/* Párpado superior / pestañas arriba */}
                <g stroke="#c9930a" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="-18" y1="-16" x2="-22" y2="-26" />
                    <line x1="-8" y1="-20" x2="-9" y2="-31" />
                    <line x1="0" y1="-22" x2="0" y2="-33" />
                    <line x1="8" y1="-20" x2="9" y2="-31" />
                    <line x1="18" y1="-16" x2="22" y2="-26" />
                    <line x1="-25" y1="-10" x2="-31" y2="-18" />
                    <line x1="25" y1="-10" x2="31" y2="-18" />
                </g>
                {/* Párpado inferior / pestañas abajo */}
                <g stroke="#c9930a" strokeWidth="1.2" strokeLinecap="round">
                    <line x1="-15" y1="15" x2="-18" y2="23" />
                    <line x1="-5" y1="19" x2="-5" y2="27" />
                    <line x1="5" y1="19" x2="5" y2="27" />
                    <line x1="15" y1="15" x2="18" y2="23" />
                </g>

                {/* Contorno del ojo — almendra azul marino */}
                <path
                    d="M-45,0 C-30,-28 30,-28 45,0 C30,28 -30,28 -45,0 Z"
                    fill="#1a0d6e"
                    stroke="#c9930a"
                    strokeWidth="2.5"
                />

                {/* Iris navy */}
                <circle cx="0" cy="0" r="19" fill="#1a0d6e" />
                {/* Anillo blanco */}
                <circle cx="0" cy="0" r="15" fill="white" />
                {/* Iris celeste */}
                <circle cx="0" cy="0" r="11.5" fill="#42a5f5" />
                {/* Anillo cyan interior */}
                <circle cx="0" cy="0" r="10.5" fill="none" stroke="#80d8ff" strokeWidth="0.8" opacity="0.6" />
                {/* Pupila navy */}
                <circle cx="0" cy="0" r="7.5" fill="#0d1454" />
                {/* Pupila interior más oscura */}
                <circle cx="0" cy="0" r="5.5" fill="#050a2e" />
                {/* Destellos */}
                <circle cx="-3" cy="-3.5" r="2.8" fill="white" opacity="0.9" />
                <circle cx="3" cy="3" r="1.1" fill="white" opacity="0.55" />
                {/* Bordes dorados de los círculos */}
                <circle cx="0" cy="0" r="19" fill="none" stroke="#c9930a" strokeWidth="0.7" opacity="0.8" />
                <circle cx="0" cy="0" r="15" fill="none" stroke="#c9930a" strokeWidth="0.5" opacity="0.5" />
                <circle cx="0" cy="0" r="11.5" fill="none" stroke="#c9930a" strokeWidth="0.4" opacity="0.4" />

                {/* Puntos decorativos en las esquinas del ojo */}
                <circle cx="-42" cy="0" r="1.5" fill="#c9930a" opacity="0.8" />
                <circle cx="42" cy="0" r="1.5" fill="#c9930a" opacity="0.8" />
            </svg>
        </div>
    );
}
