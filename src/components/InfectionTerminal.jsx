import React, { useRef, useState, useEffect } from 'react';
import { supabase, insertInfection } from '../services/supabase';
import { useSession } from '../auth/AuthContext';

// -----------------------------------------------------------------------
// MagicLinkForm — se muestra cuando el visitante no está autenticado
// -----------------------------------------------------------------------
function MagicLinkForm() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const { error: authError } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true },
        });
        if (authError) {
            setError('✗ ERROR — ' + authError.message);
        } else {
            setSent(true);
        }
        setLoading(false);
    };

    if (sent) return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ fontSize: '22px', marginBottom: '10px' }}>✓ ENLACE ENVIADO</p>
            <p style={{ color: '#8aff9e', fontSize: '13px' }}>
                Revisa tu correo y regresa al abismo.<br />
                El link expira en 1 hora.
            </p>
        </div>
    );

    return (
        <form onSubmit={handleSend}>
            <p style={{ marginBottom: '20px', color: '#8aff9e', fontSize: '13px', letterSpacing: '1px' }}>
                Para infectar el abismo, identifícate.
            </p>
            <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={{
                    width: '100%',
                    padding: '10px',
                    background: '#000',
                    border: '1px solid #39FF14',
                    color: '#39FF14',
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    marginBottom: '16px',
                    boxSizing: 'border-box',
                }}
            />
            {error && <p style={{ color: '#ff003c', marginBottom: '12px', fontSize: '12px' }}>{error}</p>}
            <button
                type="submit"
                disabled={loading}
                style={{
                    background: loading ? '#555' : '#39FF14',
                    color: '#000',
                    border: 'none',
                    padding: '10px 24px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    letterSpacing: '2px',
                    width: '100%',
                }}
            >
                {loading ? 'TRANSMITIENDO...' : 'SOLICITAR ACCESO →'}
            </button>
        </form>
    );
}

// Fuentes disponibles (solo nombres key)
const FONT_OPTIONS = [
    { key: 'mono',        label: 'SISTEMA',    css: "'Courier New', monospace" },
    { key: 'vt323',       label: 'VT323',      css: "'VT323', monospace" },
    { key: 'share-tech',  label: 'SHARE TECH', css: "'Share Tech Mono', monospace" },
    { key: 'orbitron',    label: 'ORBITRON',   css: "'Orbitron', sans-serif" },
    { key: 'creepster',   label: 'CREEPSTER',  css: "'Creepster', cursive" },
];

const COLOR_OPTIONS = [
    '#39FF14', // neon green
    '#ff003c', // rojo
    '#00ffff', // cyan
    '#ff6600', // naranja
    '#cc00ff', // violeta
    '#ffffff', // blanco
];

// Inyectar Google Fonts una sola vez
let fontsInjected = false;
function injectFonts() {
    if (fontsInjected || typeof document === 'undefined') return;
    fontsInjected = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&family=Orbitron:wght@700&family=Creepster&display=swap';
    document.head.appendChild(link);
}

// -----------------------------------------------------------------------
// TerminalForm — se muestra cuando hay sesión activa
// -----------------------------------------------------------------------
function TerminalForm({ session, onInfection, onClose }) {
    const [mensaje, setMensaje] = useState('');
    const [status, setStatus] = useState('');
    const [infeccionesUsadas, setInfeccionesUsadas] = useState(null);
    const [selectedColor, setSelectedColor] = useState('#39FF14');
    const [selectedFont, setSelectedFont] = useState('mono');
    const inputRef = useRef(null);
    const MAX_INFECCIONES = 2;

    useEffect(() => { injectFonts(); }, []);

    // Consultar cuántas infecciones ya envió el usuario
    useEffect(() => {
        if (!session?.user?.id) return;
        supabase
            .from('infecciones')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .then(({ count }) => setInfeccionesUsadas(count ?? 0));
    }, [session]);

    useEffect(() => {
        setTimeout(() => { inputRef.current?.focus(); }, 50);
    }, []);

    const capacidadAgotada = infeccionesUsadas !== null && infeccionesUsadas >= MAX_INFECCIONES;
    const disponibles = infeccionesUsadas !== null ? Math.max(0, MAX_INFECCIONES - infeccionesUsadas) : null;
    const fontCss = FONT_OPTIONS.find(f => f.key === selectedFont)?.css || "'Courier New', monospace";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mensaje.trim() || capacidadAgotada) return;
        setStatus('TRANSMITIENDO...');
        const result = await insertInfection(
            mensaje.trim(),
            selectedColor,
            session.user.id,
            session.user.email,
            selectedFont,
        );
        if (result && result[0]) {
            onInfection?.(result[0]);
            setStatus('✓ INFECCIÓN ACEPTADA');
            setInfeccionesUsadas(prev => (prev ?? 0) + 1);
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
        <>
            {capacidadAgotada ? (
                <p style={{
                    textAlign: 'center', color: '#ff003c',
                    border: '1px solid #ff003c', padding: '16px',
                    fontSize: '13px', letterSpacing: '2px',
                }}>
                    ⬛ CAPACIDAD DE INFECCIÓN<br />AGOTADA PARA ESTA CONEXIÓN
                </p>
            ) : (
                <form onSubmit={handleSubmit}>
                    <p style={{ marginBottom: '10px', fontSize: '12px', color: 'rgba(57,255,20,0.6)', letterSpacing: '1px' }}>
                        COLOR DE INFECCIÓN
                    </p>
                    {/* Color swatches */}
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
                        {/* Custom color input */}
                        <label title="Color personalizado" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'rgba(57,255,20,0.5)', fontFamily: 'monospace', marginRight: '4px' }}>HEX</span>
                            <input type="color" value={selectedColor} onChange={e => setSelectedColor(e.target.value)}
                                style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        </label>
                    </div>

                    <p style={{ marginBottom: '10px', fontSize: '12px', color: 'rgba(57,255,20,0.6)', letterSpacing: '1px' }}>
                        TIPOGRAFÍA
                    </p>
                    {/* Font selector */}
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

                    <input
                        ref={inputRef}
                        type="text"
                        value={mensaje}
                        onChange={e => setMensaje(e.target.value)}
                        placeholder="_"
                        maxLength={120}
                        style={{
                            width: '100%', padding: '10px',
                            background: '#000', border: `1px solid ${selectedColor}`,
                            color: selectedColor, fontFamily: fontCss,
                            fontSize: '16px', marginBottom: '8px',
                            boxSizing: 'border-box', letterSpacing: '1px',
                            boxShadow: `0 0 8px ${selectedColor}33`,
                            transition: 'border-color 0.2s, color 0.2s',
                        }}
                    />
                    {disponibles !== null && (
                        <p style={{ fontSize: '11px', color: 'rgba(57,255,20,0.5)', marginBottom: '14px', letterSpacing: '1px' }}>
                            INFECCIONES DISPONIBLES: {disponibles} / {MAX_INFECCIONES}
                        </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                            type="submit"
                            disabled={!mensaje || status === 'TRANSMITIENDO...'}
                            style={{
                                background: status === 'TRANSMITIENDO...' ? '#555' : selectedColor,
                                color: '#000', border: 'none',
                                padding: '10px 20px',
                                cursor: mensaje && status !== 'TRANSMITIENDO...' ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px',
                            }}
                        >
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
        </>
    );
}

// -----------------------------------------------------------------------
// InfectionTerminal — orquestador del modal (auth gate + terminal)
// -----------------------------------------------------------------------
export default function InfectionTerminal({ isOpen, onClose, onInfection }) {
    const session = useSession();

    if (!isOpen) return null;

    // Determinar qué mostrar dentro del modal
    let content;
    if (session === undefined) {
        content = (
            <p style={{ textAlign: 'center', color: '#8aff9e', fontSize: '13px', letterSpacing: '2px' }}>
                INICIALIZANDO...
            </p>
        );
    } else if (!session) {
        content = <MagicLinkForm />;
    } else {
        content = <TerminalForm session={session} onInfection={onInfection} onClose={onClose} />;
    }

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #39FF14', paddingBottom: '10px' }}>
                    <h2 style={{ margin: 0 }}>[ INFECTION_TERMINAL ]</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', color: '#39FF14', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '18px' }}
                    >
                        ✕
                    </button>
                </div>
                {content}
            </div>
        </div>
    );
}
