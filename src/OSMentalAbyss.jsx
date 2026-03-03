import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial, useVideoTexture, Html } from '@react-three/drei';
import { EffectComposer, Noise, Vignette, ChromaticAberration, Glitch } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { useMultiplayer } from './multiplayer/useSockets';
// Jules components
import AbyssHUD from './components/AbyssHUD';
import GPUFluidParticles from './components/experimental/GPUFluidParticles';
import AbyssGallery from './gallery/AbyssGallery';
import UploadPortal from './gallery/UploadPortal';
// Our components
import ProceduralCrystal from './components/experimental/ProceduralCrystal';
import InfectionTerminal from './components/InfectionTerminal';
import AbyssNavigator from './controls/AbyssNavigator';
// Services
import { subscribeToInfections, getRecentInfections, limpiarAbismo } from './services/supabase';

// ----------------------------------------------------------------------
// 1. SHADERS ENFERMOS (GLSL): Ruido estático y derretimiento radioactivo
// ----------------------------------------------------------------------
const MeltingShaderMaterial = shaderMaterial(
    {
        time: 0,
        uHover: 0,
        uColorEffect: new THREE.Color('#39FF14'),
        uAudioLow: 0,
        tDiffuse: null,
        uHasTexture: 0.0,
    },
    `
    uniform float time;
    uniform float uHover;
    uniform float uAudioLow;
    varying vec2 vUv;
    varying vec3 vPosition;

    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
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
      float noiseFreq = 2.0;
      float noiseAmp = (0.5 * uHover) + (uAudioLow * 0.3);
      vec3 noisePos = vec3(pos.x * noiseFreq + time, pos.y * noiseFreq + time, pos.z);
      pos.z += noise(noisePos) * noiseAmp;
      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
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
      float staticNoise = random(vUv * time) * 0.2;
      vec3 color = vec3(0.05) + vec3(staticNoise);

      if (uHasTexture > 0.5) {
         vec4 tex = texture2D(tDiffuse, vUv);
         color = mix(color, tex.rgb, clamp(0.9 - (uHover * 0.5), 0.0, 1.0)) + vec3(staticNoise * 0.1);
      }

      vec3 meltColor = mix(color, uColorEffect, uHover * 0.85);
      float scanline = sin(vUv.y * 150.0 + time * 15.0) * 0.1 * uHover;
      meltColor -= vec3(scanline);
      gl_FragColor = vec4(meltColor, 1.0);
    }
  `
);

extend({ MeltingShaderMaterial });

// ----------------------------------------------------------------------
// 2. AUDIO ANALYZER
// ----------------------------------------------------------------------
const AudioAnalyzer = ({ setAudioLow }) => {
    useEffect(() => {
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
                    let sumLow = 0;
                    for (let i = 0; i < 5; i++) sumLow += dataArray[i];
                    const newAudioLow = (sumLow / 5) / 255.0;
                    setAudioLow(prev => prev + (newAudioLow - prev) * 0.15);
                    requestAnimationFrame(updateAudio);
                };
                updateAudio();
            } catch (err) {
                console.warn('Permiso de micrófono denegado.', err);
            }
        };
        startAudio();
    }, [setAudioLow]);
    return null;
};

// ----------------------------------------------------------------------
// 3. ENTIDAD FÍSICA
// ----------------------------------------------------------------------
const DisturbedEntity = React.memo(({ position, rotation, audioLow, videoUrl }) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const [hovered, setHover] = useState(false);
    const videoTexture = videoUrl ? useVideoTexture(videoUrl, { muted: true, loop: true, start: true, crossOrigin: 'Anonymous' }) : null;
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
            targetHover.current = THREE.MathUtils.lerp(targetHover.current, hovered ? 1 : 0, 0.08);
            materialRef.current.uHover = targetHover.current;
        }
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * 0.05;
            meshRef.current.rotation.y += delta * 0.08;
            if (hovered) {
                meshRef.current.position.z -= delta * 2.0;
                meshRef.current.rotation.z += delta * 0.5;
            } else {
                meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.01;
                meshRef.current.position.x += Math.cos(state.clock.elapsedTime * 0.3 + position[1]) * 0.01;
            }
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            rotation={rotation}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            <planeGeometry args={[4, 5, 64, 64]} />
            <meltingShaderMaterial
                ref={materialRef}
                transparent
                uColorEffect={new THREE.Color(toxicColor)}
            />
        </mesh>
    );
});
DisturbedEntity.displayName = 'DisturbedEntity';

// ----------------------------------------------------------------------
// 4. INFECTION TEXT (floating 3D HTML labels)
// ----------------------------------------------------------------------
const InfectionText = React.memo(({ mensaje, color, position }) => {
    const ref = useRef();
    const offset = useRef(Math.random() * Math.PI * 2);
    useFrame((state) => {
        if (ref.current) {
            ref.current.position.y += Math.sin(state.clock.elapsedTime * 0.4 + offset.current) * 0.003;
            ref.current.rotation.y += 0.004;
        }
    });
    return (
        <mesh ref={ref} position={position}>
            <Html
                center
                distanceFactor={8}
                style={{
                    color: color || '#39FF14',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '13px',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    textShadow: `0 0 8px ${color || '#39FF14'}, 0 0 20px ${color || '#39FF14'}`,
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    opacity: 0.9,
                }}
            >
                {mensaje}
            </Html>
        </mesh>
    );
});
InfectionText.displayName = 'InfectionText';

// ----------------------------------------------------------------------
// 5. POST-PROCESAMIENTO AGRESIVO
// ----------------------------------------------------------------------
const AggressivePostProcessing = () => {
    const [glitchActive, setGlitchActive] = useState(false);

    useEffect(() => {
        const triggerGlitch = () => {
            setGlitchActive(true);
            setTimeout(() => setGlitchActive(false), Math.random() * 400 + 100);
            setTimeout(triggerGlitch, Math.random() * 3000 + 2000);
        };
        const timer = setTimeout(triggerGlitch, 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <EffectComposer disableNormalPass multisampling={0}>
            <Noise opacity={0.65} blendFunction={BlendFunction.MULTIPLY} />
            <Vignette eskil={false} offset={0.6} darkness={1.1} />
            <ChromaticAberration offset={[0.015, 0.015]} blendFunction={BlendFunction.NORMAL} />
            {glitchActive && (
                <Glitch
                    delay={[0, 0]}
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
// 6. OS_MENTAL_ABYSS — ENTRY POINT
// ----------------------------------------------------------------------
export default function OSMentalAbyss() {
    const [audioLow, setAudioLow] = useState(0);
    const [infecciones, setInfecciones] = useState([]);
    const [terminalOpen, setTerminalOpen] = useState(false);
    const { socket, otherPlayers } = useMultiplayer();

    // Sesión efímera: limpia el abismo al entrar, suscribe a nuevas infecciones
    useEffect(() => {
        limpiarAbismo().then(() => setInfecciones([]));
        const channel = subscribeToInfections((newInfection) => {
            setInfecciones(prev => [newInfection, ...prev].slice(0, 5000));
        });
        return () => channel.unsubscribe();
    }, []);

    // Shortcut [I] para la terminal de infecciones
    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'KeyI' && !e.target.matches('input, textarea')) {
                setTerminalOpen(v => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Cada infección consume 1 partícula
    const particleCount = Math.max(0, 5000 - infecciones.length);

    // Entidades físicas esparcidas en el espacio
    const entities = useMemo(() => {
        return Array.from({ length: 25 }).map((_, i) => ({
            position: [
                (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 20 - 15,
            ],
            rotation: [
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI,
            ],
            videoUrl: null,
        }));
    }, []);

    return (
        <>
            <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', margin: 0, padding: 0 }}>
                <AudioAnalyzer setAudioLow={setAudioLow} />

                {/* HUD brutalista de Jules */}
                <AbyssHUD
                    particleCount={particleCount}
                    playerCount={Object.keys(otherPlayers).length + 1}
                />

                {/* Portal de subida de archivos (Jules) */}
                <UploadPortal />

                <Canvas
                    camera={{ position: [0, 0, 5], fov: 75 }}
                    gl={{ antialias: false, powerPreference: 'high-performance' }}
                >
                    <color attach="background" args={['#000000']} />

                    {/* Navegación WASD con pointer lock */}
                    <AbyssNavigator terminalOpen={terminalOpen} />

                    {/* Partículas GPU — cada infección consume 1 */}
                    <GPUFluidParticles count={particleCount} color="#39FF14" />

                    {/* Cristales psicodélicos */}
                    <ProceduralCrystal position={[0, 0, -8]} />
                    <ProceduralCrystal position={[6, -3, -12]} />

                    {/* Galería de archivos 3D (Jules) */}
                    <AbyssGallery />

                    {/* Otros jugadores */}
                    {Object.entries(otherPlayers).map(([id, pos]) => (
                        <mesh key={id} position={[pos.x, pos.y, pos.z - 5]}>
                            <sphereGeometry args={[0.2, 16, 16]} />
                            <meshBasicMaterial color="#ff00ea" wireframe />
                        </mesh>
                    ))}

                    {/* Infecciones flotando en 3D */}
                    <React.Suspense fallback={null}>
                        {infecciones.map((inf, i) => (
                            <InfectionText
                                key={inf.id || i}
                                mensaje={inf.mensaje}
                                color={inf.color}
                                position={[
                                    (Math.sin(i * 2.4) * 12),
                                    (Math.cos(i * 1.7) * 8),
                                    (Math.sin(i * 0.9) * 15) - 10,
                                ]}
                            />
                        ))}
                    </React.Suspense>

                    {/* Entidades físicas */}
                    <React.Suspense fallback={null}>
                        {entities.map((props, i) => (
                            <DisturbedEntity key={i} {...props} audioLow={audioLow} />
                        ))}
                    </React.Suspense>

                    <AggressivePostProcessing />
                </Canvas>
            </div>

            {/* Terminal de infecciones (overlay) */}
            <button
                onClick={() => setTerminalOpen(v => !v)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    background: 'rgba(0,5,0,0.85)',
                    border: '1px solid #39FF14',
                    color: '#39FF14',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '11px',
                    letterSpacing: '2px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    zIndex: 999,
                    boxShadow: '0 0 20px rgba(57,255,20,0.4)',
                }}
            >
                {terminalOpen ? '◈ CERRAR TERMINAL' : '◈ INFECTAR EL ABISMO'}
            </button>

            <InfectionTerminal
                visible={terminalOpen}
                onClose={() => setTerminalOpen(false)}
            />
        </>
    );
}
