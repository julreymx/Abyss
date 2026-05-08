import React from 'react';

export default function AbyssHUD() {
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
            {/* Bottom Center */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '12px',
                letterSpacing: '2px',
                textAlign: 'center'
            }}>
                {"WASD: NAVEGAR · ESPACIO: SUBIR · SHIFT: BAJAR"} <br/>
                {"[I] INFECTAR · [CLICK IZQ] ABRIR TERCER OJO · [CLICK DER] SOLTAR ABISMO"}
            </div>
        </div>
    );
}
