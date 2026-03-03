import React from 'react';

export default function AbyssHUD({ particleCount, playerCount }) {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 100,
            fontFamily: 'monospace',
            color: '#39FF14',
            opacity: 0.5,
            fontSize: '14px',
            textShadow: '0 0 5px #39FF14'
        }}>
            {/* Top Left */}
            <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
                PARTÍCULAS: [{particleCount}] / 5000
            </div>

            {/* Top Right */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', textAlign: 'right' }}>
                JUGADORES EN EL ABISMO: [{playerCount}]
            </div>

            {/* Bottom Center */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '12px',
                letterSpacing: '2px'
            }}>
                [I] INFECTAR · [U] SUBIR · WASD NAVEGAR · CLICK APUNTAR
            </div>
        </div>
    );
}
