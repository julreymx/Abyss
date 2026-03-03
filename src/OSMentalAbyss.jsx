import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial, useVideoTexture } from '@react-three/drei';
import { EffectComposer, Noise, Vignette, ChromaticAberration, Glitch } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { useMultiplayer } from './multiplayer/useSockets';
import AbyssHUD from './components/AbyssHUD';
import GPUFluidParticles from './components/experimental/GPUFluidParticles';
import AbyssGallery from './gallery/AbyssGallery';
import UploadPortal from './gallery/UploadPortal';
import InfectionTerminal from './components/InfectionTerminal';
import { getRecentInfections, limpiarAbismo, subscribeToInfections } from './services/supabase';

// ----------------------------------------------------------------------
// 1. SHADERS ENFERMOS (GLSL): Ruido estático y derretimiento radioactivo
// ----------------------------------------------------------------------
const MeltingShaderMaterial = shaderMaterial(
    {
        time: 0,
        uHover: 0, // Transición de 0 a 1
        uColorEffect: new THREE.Color('#39FF14'), // Verde tóxico o Magenta
        uAudioLow: 0, // Reactividad al bajo
        tDiffuse: null,
        uHasTexture: 0.0,
    },
    // Vertex Shader: Deformación física del plano
    `
    uniform float time;
    uniform float uHover;
    uniform float uAudioLow;
    varying vec2 vUv;
    varying vec3 vPosition;

    // Ruido Perlin simple 3D (Implementación compacta de snoise)
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

    // Pseudo-ruido para ahorrar espacio en este ejemplo
    float noise(vec3 p) {
      vec3 a = floor(p);
      vec3 d = p - a;
      d = d * d * (3.0 - 2.0 * d);
      vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
      vec4 k1 = permute(b.xyxy);
      vec4 k2 = permute(k1.xyxy + b.zzww);
      vec4 c = k2 + a.zzzz;
      vec4 k3 = permute(c);
      vec4 k4 = permute(c + 1.0);
      vec4 o1 = fract(k3 * (1.0 / 41.0));
      vec4 o2 = fract(k4 * (1.0 / 41.0));
      vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
      vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);
      return o4.y * d.y + o4.x * (1.0 - d.y);
    }

    void main() {
      vUv = uv;
      vec3 pos = position;

      // La malla se derrite por el hover y muta con los bajos del audio
      float noiseFreq = 2.0;
      float noiseAmp = (0.5 * uHover) + (uAudioLow * 0.3); // Amplitud extrema
      vec3 noisePos = vec3(pos.x * noiseFreq + time, pos.y * noiseFreq + time, pos.z);

      pos.z += noise(noisePos) * noiseAmp; // Alteración destructiva en Z

      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
    // Fragment Shader: Interferencia y sobreescritura de color
    `
    uniform float time;
    uniform float uHover;
    uniform vec3 uColorEffect;
    uniform sampler2D tDiffuse;
    uniform float uHasTexture;
    varying vec2 vUv;
    varying vec3 vPosition;

    float random (vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      // Estado de reposo: ruido estático constante
      float staticNoise = random(vUv * time) * 0.2;
      vec3 color = vec3(0.05) + vec3(staticNoise); // Oscuro pero ruidoso

      if (uHasTexture > 0.5) {
         vec4 tex = texture2D(tDiffuse, vUv);
         color = mix(color, tex.rgb, clamp(0.9 - (uHover * 0.5), 0.0, 1.0)) + vec3(staticNoise * 0.1);
      }

      // Hover: inyección radioactiva/magenta y scanlines
      vec3 meltColor = mix(color, uColorEffect, uHover * 0.85);

      // Scanlines que asfixian la imagen cuando se corrompe
      float scanline = sin(vUv.y * 150.0 + time * 15.0) * 0.1 * uHover;
      meltColor -= vec3(scanline);

      gl_FragColor = vec4(meltColor, 1.0);
    }
  `
);

// Registrar shader para R3F
extend({ MeltingShaderMaterial });

// ----------------------------------------------------------------------
// 2. AUDIO ANALYZER ESQUELETO (Web Audio API atado a R3F)
// ----------------------------------------------------------------------
const AudioAnalyzer = ({ setAudioLow }) => {
    useEffect(() => {
        // Nota: Los navegadores exigen una interacción previa del usuario.
        // Como presionar "Seguir" es el punto de entrada, el contexto de audio se puede activar.
        const startAudio = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const analyser = audioCtx.createAnalyser();
                const source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.fftSize = 256;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const updateAudio = () => {
                    analyser.getByteFrequencyData(dataArray);
                    // Promediar frecuencias bajas (el bajo/golpe)
                    let sumLow = 0;
                    const newAudioLow = (sumLow / 5) / 255.0; // Normalizado 0 a 1
                    // Interpolación (LERP) para suavizar la sacudida del micrófono
                    setAudioLow(prev => prev + (newAudioLow - prev) * 0.15);

                    requestAnimationFrame(updateAudio);
                };
                updateAudio();
            } catch (err) {
                console.warn("Permiso de micrófono denegado, silenciando reactividad auditiva.", err);
            }
        };
        startAudio();
    }, [setAudioLow]);

    return null;
};

// ----------------------------------------------------------------------
// 3. ARCHIVOS COMO ENTIDADES FÍSICAS MÁS QUE VENTANAS
// ----------------------------------------------------------------------
const DisturbedEntity = React.memo(({ position, rotation, audioLow, videoUrl }) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const [hovered, setHover] = useState(false);

    // Carga robusta de la textura del video, solo si existe videoUrl
    const videoTexture = videoUrl ? useVideoTexture(videoUrl, { muted: true, loop: true, start: true, crossOrigin: "Anonymous" }) : null;

    // Decisión cromática adaptada a Jules OS
    const toxicColor = useMemo(() => {
        const colors = ['#39FF14', '#0a2912', '#ccff00', '#00ff66'];
        return colors[Math.floor(Math.random() * colors.length)];
    }, []);
    const targetHover = useRef(0);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.time += delta;
            materialRef.current.uAudioLow = audioLow;
            materialRef.current.tDiffuse = videoTexture;
            materialRef.current.uHasTexture = videoTexture ? 1.0 : 0.0;

            // Interpolación ansiosa del hover
            targetHover.current = THREE.MathUtils.lerp(targetHover.current, hovered ? 1 : 0, 0.08);
            materialRef.current.uHover = targetHover.current;
        }

        if (meshRef.current) {
            // Rotación suave lenta (Zero Gravity)
            meshRef.current.rotation.x += delta * 0.05;
            meshRef.current.rotation.y += delta * 0.08;

            if (hovered) {
                // REPELENCIA SUAVE: El mesh se aleja y rota, no convulsiona
                meshRef.current.position.z -= delta * 2.0;
                meshRef.current.rotation.z += delta * 0.5;
            } else {
                // Flotación espacial fluida en múltiples ejes
                meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.01;
                meshRef.current.position.x += Math.cos(state.clock.elapsedTime * 0.3 + position[1]) * 0.01;
            }
        }
    });

    });
        <mesh
            ref={meshRef}
            position={position}
            rotation={rotation}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            {/* Geometría de alta densidad (64x64) para que el Vertex Shader deforme bien */}
            <planeGeometry args={[4, 5, 64, 64]} />
            <meltingShaderMaterial
                ref={materialRef}
                transparent
                uColorEffect={new THREE.Color(toxicColor)}
            />
        </mesh>
    );
});
DisturbedEntity.displayName = "DisturbedEntity";


// ----------------------------------------------------------------------
// 4. CÁMARA LIBRE, NAUSEABUNDA Y MUTADA POR AUDIO
// ----------------------------------------------------------------------
const NauseatingCamera = ({ audioLow, socket }) => {
    const { camera } = useThree();
    const lastEmit = useRef(0);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Paneos muy suaves y flotantes tipo espacio exterior
        camera.rotation.z = Math.sin(t * 0.1) * 0.05 + (audioLow * 0.01);
        camera.position.x = Math.sin(t * 0.05) * 1.5;
        camera.position.y = Math.cos(t * 0.07) * 1.5;

        // Emitir posición al servidor cada ~100ms
        if (socket && socket.connected && t - lastEmit.current > 0.1) {
            lastEmit.current = t;
            socket.emit('user_moved', {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            });
        }

        // FOV muta suavemente con el bajo para inmersión sin mareo brusco
        camera.fov = 75 + (audioLow * 10.0);
        camera.updateProjectionMatrix();
    });
    return null;
};

// ----------------------------------------------------------------------
// 5. POST-PROCESAMIENTO AGRESIVO
// ----------------------------------------------------------------------
const AggressivePostProcessing = () => {
    const [glitchActive, setGlitchActive] = useState(false);

    useEffect(() => {
        // El Glitch se dispara de manera aleatoria cada 2 a 5 segundos
        const triggerGlitch = () => {
            setGlitchActive(true);
            setTimeout(() => setGlitchActive(false), Math.random() * 400 + 100); // Glitch dura entre 100ms y 500ms
            setTimeout(triggerGlitch, Math.random() * 3000 + 2000); // Vuelve a ocurrir en 2-5s
        };
        const timer = setTimeout(triggerGlitch, 2000);
        });) => clearTimeout(timer);
    }, []);

    });
        <EffectComposer disableNormalPass multisampling={0}>
            <Noise opacity={0.65} blendFunction={BlendFunction.MULTIPLY} />
            <Vignette eskil={false} offset={0.6} darkness={1.1} />
            {/* Aberración al máximo para destrozar los bordes */}
            <ChromaticAberration offset={[0.015, 0.015]} blendFunction={BlendFunction.NORMAL} />

            {glitchActive && (
                <Glitch
                    delay={[0, 0]} // Se fuerza manualmente
                    duration={[0.1, 0.3]}
                    strength={[0.6, 1.5]}
                    mode={GlitchMode.SPORADIC}
                    active={true}
                    ratio={0.8}
                />
            )}
        </EffectComposer>
    );
};

// ----------------------------------------------------------------------
// 6. OS_MENTAL_ABYSS - ENTRY POINT DE LA GALERÍA
// ----------------------------------------------------------------------
export default function OSMentalAbyss() {
    const [audioLow, setAudioLow] = useState(0);
    const { socket, otherPlayers } = useMultiplayer();
    const [infecciones, setInfecciones] = useState([]);
    const [particleCount, setParticleCount] = useState(5000);
    const [terminalOpen, setTerminalOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);

    useEffect(() => {
        const init = async () => {
            await limpiarAbismo();
            const recents = await getRecentInfections(5000);
            setInfecciones(recents || []);

            subscribeToInfections((newInfection) => {
                setInfecciones(prev => [newInfection, ...prev]);
            });
        };
        init();
    }, []);

    useEffect(() => {
        setParticleCount(Math.max(0, 5000 - infecciones.length));
    }, [infecciones]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'KeyI' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                setTerminalOpen(v => !v);
            }
            if (e.code === 'KeyU' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                setUploadOpen(v => !v);
            }
            if (e.key === 'Escape') {
                setTerminalOpen(false);
                setUploadOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);


    // Esparcir archivos caóticamente en un rango espacial amplio
    const entities = useMemo(() => {
        return Array.from({ length: 25 }).map((_, i) => ({
            position: [
                (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 20 - 15 // Empujados hacia la profundidad Z
            ],
            rotation: [
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI // Sin concepto de "arriba" o "abajo"
            ],
            videoUrl: i % 5 === 0 ? '/CriticoMarssub.mp4' : null, // Muestra el video en unas de cada 5 entidades
            // videoUrl: '/CriticoMarssub.mp4'
        }));
    }, []);

    });
        <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', margin: 0, padding: 0 }}>
            <AudioAnalyzer setAudioLow={setAudioLow} />
            <AbyssHUD particleCount={particleCount} playerCount={Object.keys(otherPlayers).length + 1} />
            <InfectionTerminal isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />
            <UploadPortal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />

            {/* Botones permanentes en el HUD para invocar las interfaces si el teclado falla */}
            <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', gap: '20px', zIndex: 50 }}>
                <button
                    onClick={() => setUploadOpen(true)}
                    style={{ background: 'transparent', color: '#39FF14', border: '1px solid #39FF14', padding: '10px 20px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}
                >
                    ◈ SUBIR ARCHIVO
                </button>
                <button
                    onClick={() => setTerminalOpen(true)}
                    style={{ background: '#39FF14', color: '#000', border: 'none', padding: '10px 20px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}
                >
                    INFECTAR EL ABISMO
                </button>
            </div>

            <Canvas
                camera={{ position: [0, 0, 5], fov: 75 }}
                gl={{ antialias: false, powerPreference: "high-performance" }} // El antialias está apagado a propósito para texturas rasposas
            >
                <color attach="background" args={['#000000']} />

                <NauseatingCamera audioLow={audioLow} socket={socket} />
                <GPUFluidParticles count={particleCount} color="#39FF14" />

                {/* --- RENDER DE OTROS JUGADORES (FANTASMAS) --- */}
                {Object.entries(otherPlayers).map(([id, pos]) => (
                    <mesh key={id} position={[pos.x, pos.y, pos.z - 5]}>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshBasicMaterial color="red" wireframe />
                    </mesh>
                ))}

                <React.Suspense fallback={null}>
                    {entities.map((props, i) => (
                        <DisturbedEntity key={i} {...props} audioLow={audioLow} />
                    ))}
                </React.Suspense>

                <AbyssGallery />
                <AggressivePostProcessing />
            </Canvas>
        </div>
    );
}
