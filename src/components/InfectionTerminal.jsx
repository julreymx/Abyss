import React, { useState, useRef } from 'react';
import { insertInfection } from '../services/supabase';

const GLITCH_CHARS = '!@#$%^&*<>?/\\|{}[]~`';

const glitchText = (text) => {
    return text.split('').map(c =>
        Math.random() > 0.85 ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : c
    ).join('');
};

const INFECTION_COLORS = [
    '#39FF14', '#ff00ea', '#00ffff', '#ccff00', '#ff6600', '#ff0055'
];

export default function InfectionTerminal({ visible, onClose }) {
    const [input, setInput] = useState('');
    const [log, setLog] = useState(['> SISTEMA INFECTADO. ESCRIBE TU MENSAJE.', '> _']);
    const [sending, setSending] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#39FF14');
    const inputRef = useRef();

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        setSending(true);
        setLog(prev => [...prev, `> INFECTANDO: ${glitchText(input)}...`]);

        const result = await insertInfection(input.trim(), selectedColor);

        if (result) {
            setLog(prev => [...prev, '> [OK] MENSAJE INYECTADO EN EL ABISMO.', '> TODOS LO VERÁN FLOTAR.', '> _']);
        } else {
            setLog(prev => [...prev, '> [ERROR] INFECCIÓN RECHAZADA.', '> _']);
        }
        setInput('');
        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') handleSend();
        if (e.key === 'Escape') onClose();
    };

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            width: '480px',
            background: 'rgba(0, 5, 0, 0.92)',
            border: '1px solid #39FF14',
            borderRadius: '2px',
            padding: '16px',
            fontFamily: "'Courier New', monospace",
            zIndex: 1000,
            boxShadow: '0 0 30px rgba(57,255,20,0.3), inset 0 0 30px rgba(0,0,0,0.5)',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(57,255,20,0.3)',
                paddingBottom: '8px',
                marginBottom: '12px'
            }}>
                <span style={{ color: '#39FF14', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase' }}>
                    ◈ TERMINAL DE INFECCIONES
                </span>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', color: '#ff00ea',
                    cursor: 'pointer', fontSize: '16px', padding: '0 4px'
                }}>✕</button>
            </div>

            {/* Log */}
            <div style={{
                height: '140px',
                overflowY: 'auto',
                marginBottom: '12px',
                fontSize: '11px',
                lineHeight: '1.8',
            }}>
                {log.map((line, i) => (
                    <div key={i} style={{
                        color: line.includes('[OK]') ? '#39FF14' :
                            line.includes('[ERROR]') ? '#ff0055' :
                                line.includes('INFECTANDO') ? '#ccff00' : '#8aff9e',
                        animation: i === log.length - 1 ? 'none' : undefined
                    }}>
                        {line}
                    </div>
                ))}
            </div>

            {/* Color selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <span style={{ color: '#8aff9e', fontSize: '10px', letterSpacing: '1px' }}>COLOR:</span>
                {INFECTION_COLORS.map(c => (
                    <button key={c} onClick={() => setSelectedColor(c)} style={{
                        width: '18px', height: '18px', background: c, border: selectedColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer', borderRadius: '1px',
                        boxShadow: selectedColor === c ? `0 0 8px ${c}` : 'none'
                    }} />
                ))}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: selectedColor, fontSize: '13px' }}>{'>'}</span>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="infecta el sistema..."
                    maxLength={60}
                    autoFocus
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${selectedColor}`,
                        color: selectedColor,
                        fontFamily: "'Courier New', monospace",
                        fontSize: '13px',
                        outline: 'none',
                        padding: '4px 0',
                    }}
                />
                <button onClick={handleSend} disabled={sending} style={{
                    background: 'transparent',
                    border: `1px solid ${selectedColor}`,
                    color: selectedColor,
                    fontFamily: "'Courier New', monospace",
                    fontSize: '10px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    letterSpacing: '2px',
                    opacity: sending ? 0.5 : 1,
                }}>
                    {sending ? '...' : 'INYECTAR'}
                </button>
            </div>

            <div style={{ marginTop: '8px', fontSize: '9px', color: 'rgba(57,255,20,0.4)', letterSpacing: '1px' }}>
                ENTER para enviar · ESC para cerrar · max 60 chars · todos los usuarios verán tu mensaje
            </div>
        </div>
    );
}
