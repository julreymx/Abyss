import React, { useState, useEffect, useRef } from 'react';
import './JulesStyles.css';

// --- COMPONENTE: Matrix Rain Background ---
const MatrixRain = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const configureCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        configureCanvas();
        window.addEventListener('resize', configureCanvas);

        // Caracteres alienígenas/matrix
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*<>!?アィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロゎワヰヱヲンヴヵヶヷヸヹヺ・ーヽヾヿ';
        const charArray = chars.split('');

        const fontSize = 16;
        const columns = canvas.width / fontSize;
        const drops = [];

        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }

        const draw = () => {
            // Fondo translúcido para el efecto "estela" (fade out)
            ctx.fillStyle = 'rgba(2, 10, 4, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#39FF14'; // Verde Marciano Clásico
            ctx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                // Obtenemos un caracter aleatorio
                const text = charArray[Math.floor(Math.random() * charArray.length)];

                // Dibujamos el caracter
                // Añadimos una probabilidad ocasional de dibujarlo muy brillante/blanco
                if (Math.random() > 0.98) {
                    ctx.fillStyle = '#ccff00'; // Destello amarillo radiactivo
                } else {
                    ctx.fillStyle = '#39FF14';
                }

                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                // Reseteo condicional de la gota al llegar abajo (animación en cascada)
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }

                drops[i]++;
            }
        };

        const interval = setInterval(draw, 50); // Velocidad de la lluvia

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', configureCanvas);
        };
    }, []);

    return <canvas ref={canvasRef} className="matrix-canvas" />;
};


// --- COMPONENTE: Texto Alienígena Psicodélico ---
const AlienText = ({ text }) => {
    const [displayText, setDisplayText] = useState(text);
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*<>!?";

    useEffect(() => {
        let iteration = 0;
        let interval = null;

        const startAnimation = () => {
            clearInterval(interval);
            interval = setInterval(() => {
                setDisplayText((prev) =>
                    prev
                        .split("")
                        .map((letter, index) => {
                            if (index < iteration) return text[index];
                            return letters[Math.floor(Math.random() * 26)];
                        })
                        .join("")
                );

                if (iteration >= text.length) clearInterval(interval);
                iteration += 1 / 3;
            }, 30);
        };

        startAnimation();

        // Lo hacemos mucho más errático
        const loop = setInterval(() => {
            if (Math.random() > 0.3) startAnimation();
        }, 2000 + Math.random() * 3000);

        return () => {
            clearInterval(interval);
            clearInterval(loop);
        };
    }, [text]);

    return (
        <h1 className="alien-glitch-title" data-text={text}>
            {displayText}
        </h1>
    );
};

// --- COMPONENTE PRINCIPAL: Landing Page ---
export default function JulesLanding({ onEnter }) {
    return (
        <div className="landing-container crt-effect">
            {/* Fondo Canvas Matrix */}
            <MatrixRain />

            {/* Ruido extremo simulado sobre todo */}
            <div className="bg-ascii-noise crt-flicker"></div>

            {/* Header */}
            <header className="navbar glitch-element">
                <div className="logo-placeholder"><AlienText text="OS_mental" /></div>
            </header>

            {/* Contenido Principal (Editor de Código Derritiéndose) */}
            <main className="main-content" style={{ position: 'relative', width: '800px', maxWidth: '90vw', minHeight: '350px' }}>
                <div className="code-editor melting-panel" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, minHeight: '350px' }}>
                    <div className="code-header">
                        <span className="dot red flicker-fast"></span>
                        <span className="dot yellow flicker-fast delay-1"></span>
                        <span className="dot green flicker-fast delay-2"></span>
                    </div>
                </div>

                <div className="floating-code-block">
                    <div className="code-header" style={{ opacity: 0 }}>
                        <span className="dot"></span>
                    </div>
                    <pre className="code-body text-glitch-heavy" style={{ textShadow: '0 0 10px #000, 0 0 20px #000' }}>
                        <code>
                            {`// Hola, soy Julian Rey.
// Estás a punto de asomarte a mi cabeza por una ventana.

/*
 * Este espacio que reservé para ti, es para mostrarte
 * cómo toda estructura también puede romperse
 * a la intención y la expresión.
 * Aquí es donde yo intento romperlas.
 */

if (decidesContinuar) {
  ojalaEncuentres("algo que pueda servirte");
}

// 👾 SIGNAL LOST...`}
                        </code>
                    </pre>
                </div>
            </main>

            {/* Widget Flotante Inferior Derecho */}
            <div className="floating-widget wild-floating">
                <div className="widget-icon text-glitch-heavy">
                    <svg viewBox="0 0 14 14" width="70" height="70" shapeRendering="crispEdges" style={{ display: 'inline-block', filter: 'drop-shadow(0 0 15px #39FF14)' }}>
                        {[
                            "....GGGGGG....",
                            "..GGGGGGGGGG..",
                            ".GLLLGGGGGGGG.",
                            ".GLLGGGGGGGGG.",
                            "GGGGGGGGGGGGGG",
                            "GGGGGGGGGGGGGG",
                            "GGBBBGGGGBBBGG",
                            "GBGBBBGGBGBBBG",
                            "GBBBBBGGBBBBBG",
                            ".GBBBGGGGBBBG.",
                            "..GGGGGGGGGG..",
                            "...GGGGGGGG...",
                            "....GGGGGG....",
                            ".....GGGG....."
                        ].map((row, y) =>
                            row.split('').map((cell, x) =>
                                cell !== '.' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={cell === 'G' ? '#39FF14' : cell === 'L' ? '#8aff9e' : '#000000'} /> : null
                            )
                        )}
                    </svg>
                </div>
                <p className="crt-flicker" style={{ color: '#00ffff', textShadow: '0 0 8px #00ffff', fontWeight: 'bold' }}>
                    Este es un sitio de expresion.<br />
                    No todo lo que hay aqui dentro esta hecho para gustar.
                </p>
                <div className="widget-buttons">
                    <button className="btn-bug glitch-element" onClick={onEnter}>Seguir</button>
                    <button className="btn-bump glitch-element delay-1">Volver atras</button>
                </div>
            </div>

            <div className="scanlines"></div>
        </div>
    );
}
