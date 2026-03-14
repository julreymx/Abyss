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

// -----------------------------------------------------------------------
// TerminalForm — se muestra cuando hay sesión activa
// -----------------------------------------------------------------------
function TerminalForm({ session, onInfection, onClose }) {
    const [mensaje, setMensaje] = useState('');
    const [status, setStatus] = useState('');
    const [infeccionesUsadas, setInfeccionesUsadas] = useState(null);
    const inputRef = useRef(null);
    const MAX_INFECCIONES = 2;

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mensaje.trim() || capacidadAgotada) return;
        setStatus('TRANSMITIENDO...');
        const randomColor = ['#39FF14', '#ff003c', '#00ffcc', '#ffffff'][Math.floor(Math.random() * 4)];
        const result = await insertInfection(
            mensaje.trim(),
            randomColor,
            session.user.id,
            session.user.email,
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

    return (
        <>
            {capacidadAgotada ? (
                <p style={{
                    textAlign: 'center',
                    color: '#ff003c',
                    border: '1px solid #ff003c',
                    padding: '16px',
                    fontSize: '13px',
                    letterSpacing: '2px',
                }}>
                    ⬛ CAPACIDAD DE INFECCIÓN<br />AGOTADA PARA ESTA CONEXIÓN
                </p>
            ) : (
                <form onSubmit={handleSubmit}>
                    <p style={{ marginBottom: '12px', fontSize: '13px', color: '#8aff9e' }}>
                        Ingresa tu mensaje para corromper el abismo:
                    </p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={mensaje}
                        onChange={e => setMensaje(e.target.value)}
                        placeholder="_"
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: '#000',
                            border: '1px solid #39FF14',
                            color: '#39FF14',
                            fontFamily: 'monospace',
                            fontSize: '18px',
                            marginBottom: '12px',
                            boxSizing: 'border-box',
                        }}
                    />
                    {disponibles !== null && (
                        <p style={{ fontSize: '11px', color: '#8aff9e', marginBottom: '16px', letterSpacing: '1px' }}>
                            INFECCIONES DISPONIBLES: {disponibles} / {MAX_INFECCIONES}
                        </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                            type="submit"
                            disabled={!mensaje || status === 'TRANSMITIENDO...'}
                            style={{
                                background: status === 'TRANSMITIENDO...' ? '#555' : '#39FF14',
                                color: '#000',
                                border: 'none',
                                padding: '10px 20px',
                                cursor: mensaje && status !== 'TRANSMITIENDO...' ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                fontFamily: 'monospace',
                            }}
                        >
                            {status === 'TRANSMITIENDO...' ? '...' : 'INFECTAR'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                color: '#39FF14',
                                border: '1px solid #39FF14',
                                padding: '10px 20px',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                            }}
                        >
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
