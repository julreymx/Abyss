import React, { useRef, useState, useEffect } from 'react';
import { insertInfection } from '../services/supabase';

export default function InfectionTerminal({ isOpen, onClose }) {
    const [mensaje, setMensaje] = useState('');
    const inputRef = useRef(null);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (isOpen && inputRef.current) {
            // El delay de 50ms evita que la "i" del keydown inicial se precargue
            setTimeout(() => {
                inputRef.current.focus();
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mensaje.trim()) return;

        setStatus('TRANSMITIENDO...');
        const randomColor = ['#39FF14', '#ff003c', '#00ffcc', '#ffffff'][Math.floor(Math.random() * 4)];

        await insertInfection(mensaje, randomColor);

        setStatus('INFECCIÓN ACEPTADA');
        setMensaje('');

        setTimeout(() => {
            onClose();
            setStatus('');
        }, 1500);
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000,
            fontFamily: 'monospace',
            color: '#39FF14'
        }}>
            <div style={{
                border: '2px solid #39FF14',
                padding: '30px',
                width: '600px',
                background: '#0a2912',
                boxShadow: '0 0 15px #39FF14'
            }}>
                <h2 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #39FF14', paddingBottom: '10px' }}>[ INFECTION_TERMINAL ]</h2>
                <p style={{ marginBottom: '20px' }}>Ingresa tu mensaje para corromper el abismo:</p>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        placeholder="_"
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: '#000',
                            border: '1px solid #39FF14',
                            color: '#39FF14',
                            fontFamily: 'monospace',
                            fontSize: '18px',
                            marginBottom: '20px',
                            boxSizing: 'border-box'
                        }}
                    />

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
                                fontFamily: 'monospace'
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
                                fontFamily: 'monospace'
                            }}
                        >
                            CANCELAR
                        </button>
                    </div>
                </form>
                {status && <p style={{ marginTop: '20px', textAlign: 'center', textTransform: 'uppercase' }}>{status}</p>}
            </div>
        </div>
    );
}
