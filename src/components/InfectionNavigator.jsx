import React, { useState, useEffect } from 'react';

// Google Fonts are already injected by InfectionTerminal when the terminal opens.
// InfectionNavigator also needs them for the history list — inject defensively.
let navFontsInjected = false;
function ensureFonts() {
    if (navFontsInjected || typeof document === 'undefined') return;
    navFontsInjected = true;
    if (!document.querySelector('link[data-abyss-fonts]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.dataset.abyssFonts = '1';
        link.href = 'https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&family=Orbitron:wght@700&family=Creepster&display=swap';
        document.head.appendChild(link);
    }
}

// Font key → CSS family (must match InfectionTerminal)
const FONT_MAP = {
    'mono':       "'Courier New', monospace",
    'vt323':      "'VT323', monospace",
    'share-tech': "'Share Tech Mono', monospace",
    'orbitron':   "'Orbitron', sans-serif",
    'creepster':  "'Creepster', cursive",
};

// Same formula as InfectionText in OSMentalAbyss — maps infection index to 3D position
function infectionPosition(i) {
    return [
        Math.sin(i * 2.4) * 22,
        Math.cos(i * 1.7) * 22,
        Math.sin(i * 0.9) * 22 - 5,
    ];
}

function dispatchFlyTo(position) {
    window.dispatchEvent(new CustomEvent('abyss:flyto', { detail: { position } }));
}

// ─── Infection row ────────────────────────────────────────────────────────────
function InfRow({ inf, index, compact, onClick }) {
    const color  = inf.color  || '#39FF14';
    const font   = FONT_MAP[inf.font] || FONT_MAP.mono;
    const ts     = inf.created_at
        ? new Date(inf.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <div
            onClick={() => onClick(index)}
            title="→ Volar a esta infección"
            style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: compact ? '5px 8px' : '7px 10px',
                cursor: 'pointer',
                borderLeft: `2px solid ${color}`,
                marginBottom: '4px',
                background: 'rgba(0,0,0,0.3)',
                transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(57,255,20,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
        >
            {/* color dot */}
            <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: color,
                boxShadow: `0 0 6px ${color}`,
                flexShrink: 0,
            }} />
            {/* message */}
            <span style={{
                color, fontFamily: font,
                fontSize: compact ? '11px' : '12px',
                letterSpacing: '1px',
                textShadow: `0 0 6px ${color}88`,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
            }}>
                {inf.mensaje}
            </span>
            {!compact && ts && (
                <span style={{ color: 'rgba(57,255,20,0.3)', fontFamily: 'monospace', fontSize: '9px', flexShrink: 0 }}>
                    {ts}
                </span>
            )}
        </div>
    );
}

// ─── InfectionNavigator ───────────────────────────────────────────────────────
export default function InfectionNavigator({ infecciones = [] }) {
    const [expanded, setExpanded] = useState(false);
    const [flyingTo, setFlyingTo] = useState(null);

    useEffect(() => { ensureFonts(); }, []);

    // Resolve array from newest-first (already ordered by OSMentalAbyss)
    const recent3 = infecciones.slice(0, 3);

    const handleRowClick = (globalIndex) => {
        const pos = infectionPosition(globalIndex);
        setFlyingTo(globalIndex);
        dispatchFlyTo(pos);
        // Close drawer, reset indicator after 2s
        setExpanded(false);
        setTimeout(() => setFlyingTo(null), 2000);
    };

    if (infecciones.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '20px',
            zIndex: 9000,
            width: '280px',
            fontFamily: 'monospace',
            userSelect: 'none',
        }}>
            {/* ── History drawer (slides from bottom) ─────────────────────── */}
            {expanded && (
                <div style={{
                    background: 'rgba(0,4,0,0.92)',
                    border: '1px solid rgba(57,255,20,0.3)',
                    borderBottom: 'none',
                    backdropFilter: 'blur(8px)',
                    maxHeight: '42vh',
                    overflowY: 'auto',
                    padding: '10px 8px 6px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(57,255,20,0.3) transparent',
                }}>
                    <div style={{
                        color: 'rgba(57,255,20,0.4)',
                        fontSize: '9px', letterSpacing: '3px',
                        marginBottom: '8px', paddingLeft: '2px',
                    }}>
                        — HISTORIAL COMPLETO ({infecciones.length}) —
                    </div>
                    {infecciones.map((inf, i) => (
                        <InfRow key={inf.id || i} inf={inf} index={i}
                            compact={false} onClick={handleRowClick} />
                    ))}
                </div>
            )}

            {/* ── Collapsed panel — always visible ────────────────────────── */}
            <div style={{
                background: 'rgba(0,4,0,0.88)',
                border: '1px solid rgba(57,255,20,0.3)',
                backdropFilter: 'blur(8px)',
                padding: '8px 8px 4px',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '6px',
                }}>
                    <span style={{
                        color: 'rgba(57,255,20,0.5)',
                        fontSize: '9px', letterSpacing: '3px',
                    }}>
                        ◈ SEÑALES RECIENTES
                    </span>
                    {flyingTo !== null && (
                        <span style={{
                            color: '#39FF14', fontSize: '9px', letterSpacing: '2px',
                            animation: 'none',
                        }}>
                            VIAJANDO ›
                        </span>
                    )}
                </div>

                {/* Last 3 rows */}
                {recent3.map((inf, i) => (
                    <InfRow key={inf.id || i} inf={inf} index={i}
                        compact={true} onClick={handleRowClick} />
                ))}

                {/* Toggle button */}
                <button
                    onClick={() => setExpanded(v => !v)}
                    style={{
                        width: '100%', marginTop: '4px',
                        background: 'transparent',
                        border: '1px solid rgba(57,255,20,0.2)',
                        color: 'rgba(57,255,20,0.5)',
                        fontFamily: 'monospace', fontSize: '9px',
                        letterSpacing: '2px', padding: '4px',
                        cursor: 'pointer',
                        transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = '#39FF14';
                        e.currentTarget.style.borderColor = 'rgba(57,255,20,0.6)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = 'rgba(57,255,20,0.5)';
                        e.currentTarget.style.borderColor = 'rgba(57,255,20,0.2)';
                    }}
                >
                    {expanded ? '▴ CERRAR HISTORIAL' : `▾ VER TODO (${infecciones.length})`}
                </button>
            </div>
        </div>
    );
}
