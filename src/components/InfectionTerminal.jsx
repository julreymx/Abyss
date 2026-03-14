import React, { useRef, useState, useEffect } from 'react';
import { insertInfection } from '../services/supabase';

// Trazabilidad del build — visible en consola de producción
const BUILD_TS = import.meta.env.VITE_BUILD_TS || 'local';
console.log('[InfectionTerminal] build:', BUILD_TS, '| env:', import.meta.env.PROD ? 'production' : 'dev');

// ── Helpers ───────────────────────────────────────────────────────────────────
const MAX_INFECCIONES = 5;
const LS_KEY = 'abyss_visitor';

function getVisitor() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        /* noop */
    }
    const visitor = { id: crypto.randomUUID(), count: 0 };
    localStorage.setItem(LS_KEY, JSON.stringify(visitor));
    return visitor;
}

function incrementVisitor(visitor) {
    const updated = { ...visitor, count: visitor.count + 1 };
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    return updated;
}

// ── Fuentes y colores ─────────────────────────────────────────────────────────
const FONT_OPTIONS = [
    { key: 'mono',        label: 'SISTEMA',    css: "'Courier New', monospace" },
    { key: 'vt323',       label: 'VT323',      css: "'VT323', monospace" },
    { key: 'share-tech',  label: 'SHARE TECH', css: "'Share Tech Mono', monospace" },
    { key: 'orbitron',    label: 'ORBITRON',   css: "'Orbitron', sans-serif" },
    { key: 'creepster',   label: 'CREEPSTER',  css: "'Creepster', cursive" },
];

const COLOR_OPTIONS = [
    '#39FF14', '#ff003c', '#00ffff', '#ff6600', '#cc00ff', '#ffffff',
];

let fontsInjected = false;
function injectFonts() {
    if (fontsInjected || typeof document === 'undefined') return;
    fontsInjected = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&family=Orbitron:wght@700&family=Creepster&display=swap';
    document.head.appendChild(link);
}

// ── InfectionTerminal ─────────────────────────────────────────────────────────
export default function InfectionTerminal({ isOpen, onClose, onInfection, isOwner = false }) {
    // Inicializar visitor de forma perezosa (evita race condition con useEffect)
    const [visitor, setVisitor] = useState(() => getVisitor());
    const [mensaje, setMensaje] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('');
    const [selectedColor, setSelectedColor] = useState('#39FF14');
    const [selectedFont, setSelectedFont] = useState('mono');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            injectFonts();
            // Re-leer visitor al abrir por si cambió en otra pestaña
            setVisitor(getVisitor());
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const capacidadAgotada = !isOwner && visitor !== null && visitor.count >= MAX_INFECCIONES;
    const disponibles = !isOwner ? (visitor !== null ? Math.max(0, MAX_INFECCIONES - visitor.count) : null) : null;
    const fontCss = FONT_OPTIONS.find(f => f.key === selectedFont)?.css || "'Courier New', monospace";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mensaje.trim() || capacidadAgotada) return;
        setStatus('TRANSMITIENDO...');

        const result = await insertInfection(
            mensaje.trim(),
            selectedColor,
            visitor?.id || null,
            email.trim() || null,
            selectedFont,
        );

        if (result && result[0]) {
            const updated = incrementVisitor(visitor);
            setVisitor(updated);
            onInfection?.(result[0]);
            setStatus('✓ INFECCIÓN ACEPTADA');
        } else {
            setStatus('✗ ERROR — REINTENTA');
        }
        setMensaje('');
        setTimeout(() => { onClose(); setStatus(''); }, 1200);
    };

    const selectorBtnStyle = (active) => ({
        background: active ? 'rgba(57,255,20,0.15)' : 'transparent',
        border: active ? '1px solid #39FF14' : '1px solid rgba(57,255,20,0.25)',
        color: '#39FF14',
        padding: '4px 9px',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: '10px',
        letterSpacing: '1px',
        borderRadius: '2px',
        whiteSpace: 'nowrap',
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.88)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000,
            fontFamily: 'monospace',
            color: '#39FF14',
        }}>
            <div style={{
                border: '2px solid #39FF14',
                padding: '30px',
                width: '600px',
                maxWidth: '90vw',
                background: '#0a2912',
                boxShadow: '0 0 15px #39FF14',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #39FF14', paddingBottom: '10px' }}>
                    <h2 style={{ margin: 0 }}>[ INFECTION_TERMINAL ]</h2>
                    <button onClick={onClose} style={{ background: 'transparent', color: '#39FF14', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '18px' }}>✕</button>
                </div>

                {capacidadAgotada ? (
                    <p style={{ textAlign: 'center', color: '#ff003c', border: '1px solid #ff003c', padding: '16px', fontSize: '13px', letterSpacing: '2px' }}>
                        ⬛ CAPACIDAD DE INFECCIÓN<br />AGOTADA PARA ESTA CONEXIÓN
                    </p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Color */}
                        <p style={{ marginBottom: '10px', fontSize: '12px', color: 'rgba(57,255,20,0.6)', letterSpacing: '1px' }}>COLOR DE INFECCIÓN</p>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                            {COLOR_OPTIONS.map(c => (
                                <button key={c} type="button" onClick={() => setSelectedColor(c)} style={{
                                    width: '28px', height: '28px', background: c, border: 'none',
                                    cursor: 'pointer', borderRadius: '2px',
                                    outline: selectedColor === c ? `3px solid ${c}` : '3px solid transparent',
                                    outlineOffset: '2px',
                                    boxShadow: selectedColor === c ? `0 0 12px ${c}` : 'none',
                                    transition: 'box-shadow 0.2s',
                                }} />
                            ))}
                            <label title="Color personalizado" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '10px', color: 'rgba(57,255,20,0.5)', fontFamily: 'monospace', marginRight: '4px' }}>HEX</span>
                                <input type="color" value={selectedColor} onChange={e => setSelectedColor(e.target.value)}
                                    style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            </label>
                        </div>

                        {/* Tipografía */}
                        <p style={{ marginBottom: '10px', fontSize: '12px', color: 'rgba(57,255,20,0.6)', letterSpacing: '1px' }}>TIPOGRAFÍA</p>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                            {FONT_OPTIONS.map(f => (
                                <button key={f.key} type="button" onClick={() => setSelectedFont(f.key)}
                                    style={{ ...selectorBtnStyle(selectedFont === f.key), fontFamily: f.css }}>
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Live preview */}
                        {mensaje && (
                            <div style={{
                                color: selectedColor, fontFamily: fontCss,
                                fontSize: '16px', letterSpacing: '2px', marginBottom: '10px',
                                textShadow: `0 0 10px ${selectedColor}`,
                                minHeight: '24px', padding: '6px 0',
                                borderBottom: '1px solid rgba(57,255,20,0.15)',
                            }}>
                                {mensaje}
                            </div>
                        )}

                        {/* Mensaje */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={mensaje}
                            onChange={e => setMensaje(e.target.value)}
                            placeholder="_ tu infección"
                            maxLength={120}
                            style={{
                                width: '100%', padding: '10px',
                                background: '#000', border: `1px solid ${selectedColor}`,
                                color: selectedColor, fontFamily: fontCss,
                                fontSize: '16px', marginBottom: '10px',
                                boxSizing: 'border-box', letterSpacing: '1px',
                                boxShadow: `0 0 8px ${selectedColor}33`,
                                transition: 'border-color 0.2s, color 0.2s',
                            }}
                        />

                        {/* Email opcional */}
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="tu@correo.com (opcional)"
                            style={{
                                width: '100%', padding: '8px 10px',
                                background: 'transparent',
                                border: '1px solid rgba(57,255,20,0.25)',
                                color: 'rgba(57,255,20,0.6)',
                                fontFamily: 'monospace', fontSize: '12px',
                                marginBottom: '12px', boxSizing: 'border-box',
                                letterSpacing: '1px',
                            }}
                        />

                        {disponibles !== null && (
                            <p style={{ fontSize: '11px', color: 'rgba(57,255,20,0.5)', marginBottom: '14px', letterSpacing: '1px' }}>
                                INFECCIONES DISPONIBLES: {disponibles} / {MAX_INFECCIONES}
                            </p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button type="submit" disabled={!mensaje.trim() || status === 'TRANSMITIENDO...'} style={{
                                background: status === 'TRANSMITIENDO...' ? '#555' : selectedColor,
                                color: '#000', border: 'none', padding: '10px 20px',
                                cursor: mensaje.trim() && status !== 'TRANSMITIENDO...' ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px',
                            }}>
                                {status === 'TRANSMITIENDO...' ? '...' : 'INFECTAR'}
                            </button>
                            <button type="button" onClick={onClose} style={{
                                background: 'transparent', color: '#39FF14',
                                border: '1px solid #39FF14', padding: '10px 20px',
                                cursor: 'pointer', fontFamily: 'monospace',
                            }}>
                                CANCELAR
                            </button>
                        </div>
                    </form>
                )}

                {status && (
                    <p style={{ marginTop: '20px', textAlign: 'center', textTransform: 'uppercase', fontSize: '13px' }}>
                        {status}
                    </p>
                )}
            </div>
        </div>
    );
}
