import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial, useVideoTexture, Html } from '@react-three/drei';
import { EffectComposer, Noise, Vignette, ChromaticAberration, Glitch } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { useMultiplayer } from './multiplayer/useSockets';
import AbyssHUD from './components/AbyssHUD';
import GPUFluidParticles from './components/experimental/GPUFluidParticles';
import ProceduralCrystal, { BlobPair } from './components/experimental/ProceduralCrystal';
import AbyssGallery from './gallery/AbyssGallery';
import UploadPortal from './gallery/UploadPortal';
import InfectionTerminal from './components/InfectionTerminal';
import InfectionNavigator from './components/InfectionNavigator';
import AbyssNavigator from './controls/AbyssNavigator';
import CenterRaycaster from './controls/CenterRaycaster';
import { getRecentInfections, subscribeToInfections } from './services/supabase';
import NazarCrosshair from './components/NazarCrosshair';

// Font key → CSS (same map as InfectionTerminal/InfectionNavigator)
const FONT_MAP = {
    'mono':       "'Courier New', monospace",
    'vt323':      "'VT323', monospace",
    'share-tech': "'Share Tech Mono', monospace",
    'orbitron':   "'Orbitron', sans-serif",
    'creepster':  "'Creepster', cursive",
};

// ----------------------------------------------------------------------
// 1. SHADERS ENFERMOS (GLSL)
// ----------------------------------------------------------------------
const MeltingShaderMaterial = shaderMaterial(
    { time: 0, uHover: 0, uColorEffect: new THREE.Color('#39FF14'), uAudioLow: 0, tDiffuse: null, uHasTexture: 0.0 },
    `
    uniform float time; uniform float uHover; uniform float uAudioLow;
    varying vec2 vUv; varying vec3 vPosition;
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
    float noise(vec3 p){
      vec3 a=floor(p),d=p-a; d=d*d*(3.0-2.0*d);
      vec4 b=a.xxyy+vec4(0,1,0,1),k1=permute(b.xyxy),k2=permute(k1.xyxy+b.zzww);
      vec4 c=k2+a.zzzz,k3=permute(c),k4=permute(c+1.0);
      vec4 o1=fract(k3*(1.0/41.0)),o2=fract(k4*(1.0/41.0));
      vec4 o3=o2*d.z+o1*(1.0-d.z); vec2 o4=o3.yw*d.x+o3.xz*(1.0-d.x);
      return o4.y*d.y+o4.x*(1.0-d.y);
    }
    void main(){
      vUv=uv; vec3 pos=position;
      pos.z+=noise(vec3(pos.x*2.0+time,pos.y*2.0+time,pos.z))*((0.5*uHover)+(uAudioLow*0.3));
      vPosition=pos; gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
    }`,
    `
    uniform float time; uniform float uHover; uniform vec3 uColorEffect;
    uniform sampler2D tDiffuse; uniform float uHasTexture;
    varying vec2 vUv;
    float random(vec2 st){return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);}
    void main(){
      float n=random(vUv*time)*0.2;
      vec3 color=vec3(0.05)+vec3(n);
      if(uHasTexture>0.5){vec4 t=texture2D(tDiffuse,vUv); color=mix(color,t.rgb,clamp(0.9-(uHover*0.5),0.0,1.0))+vec3(n*0.1);}
      vec3 m=mix(color,uColorEffect,uHover*0.85);
      m-=vec3(sin(vUv.y*150.0+time*15.0)*0.1*uHover);
      gl_FragColor=vec4(m,1.0);
    }`
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
                audioCtx.createMediaStreamSource(stream).connect(analyser);
                analyser.fftSize = 256;
                const data = new Uint8Array(analyser.frequencyBinCount);
                const tick = () => {
                    analyser.getByteFrequencyData(data);
                    const low = (data.slice(0, 5).reduce((a, b) => a + b, 0) / 5) / 255;
                    setAudioLow(p => p + (low - p) * 0.15);
                    requestAnimationFrame(tick);
                };
                tick();
            } catch (e) { console.warn('Sin micrófono:', e); }
        };
        startAudio();
    }, [setAudioLow]);
    return null;
};

// ----------------------------------------------------------------------
// 3. ENTIDAD FÍSICA
// ----------------------------------------------------------------------
const DisturbedEntity = React.memo(({ position, audioLow, videoUrl }) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const [hovered, setHover] = useState(false);
    const videoTexture = videoUrl ? useVideoTexture(videoUrl, { muted: true, loop: true, start: true }) : null;
    const toxicColor = useMemo(() => ['#39FF14', '#0a2912', '#ccff00', '#00ff66'][Math.floor(Math.random() * 4)], []);
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
            // Billboard: siempre mirar a la cámara
            meshRef.current.lookAt(state.camera.position);
            if (hovered) {
                meshRef.current.position.z -= delta * 2.0;
            } else {
                meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.01;
                meshRef.current.position.x += Math.cos(state.clock.elapsedTime * 0.3 + position[1]) * 0.01;
            }
        }
    });

    return (
        <mesh ref={meshRef} position={position}
            userData={{ hoverable: true }}
            onPointerOver={() => { setHover(true); window.dispatchEvent(new CustomEvent('abyss:hover', { detail: { active: true } })); }}
            onPointerOut={() => { setHover(false); window.dispatchEvent(new CustomEvent('abyss:hover', { detail: { active: false } })); }}>
            <planeGeometry args={[4, 5, 64, 64]} />
            <meltingShaderMaterial ref={materialRef} transparent uColorEffect={new THREE.Color(toxicColor)} />
        </mesh>
    );
});
DisturbedEntity.displayName = 'DisturbedEntity';

// ----------------------------------------------------------------------
// 4. TEXTO DE INFECCIÓN FLOTANTE
// ----------------------------------------------------------------------
const InfectionText = React.memo(({ mensaje, color, position, index, font }) => {
    const ref    = useRef();
    const offset = useRef((index ?? 0) * 1.37 + 0.5);

    useFrame((state) => {
        if (ref.current) {
            ref.current.position.y += Math.sin(state.clock.elapsedTime * 0.35 + offset.current) * 0.004;
            ref.current.rotation.y += 0.003;
        }
    });

    const depth   = Math.abs(Math.sin((index ?? 0) * 1.618)) * 32 + 14;
    const glow    = color || '#39FF14';
    const fontCss = FONT_MAP[font] || FONT_MAP.mono;

    return (
        <mesh ref={ref} position={position} frustumCulled={false}>
            <Html center distanceFactor={14} style={{
                color: glow,
                fontFamily: fontCss,
                fontSize: `${depth}px`,
                fontWeight: 'bold',
                letterSpacing: '3px',
                textShadow: `0 0 10px ${glow}, 0 0 30px ${glow}, 0 0 50px ${glow}`,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                pointerEvents: 'none',
                textTransform: 'uppercase',
            }}>
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
        const trigger = () => {
            setGlitchActive(true);
            setTimeout(() => setGlitchActive(false), Math.random() * 400 + 100);
            setTimeout(trigger, Math.random() * 3000 + 2000);
        };
        const t = setTimeout(trigger, 2000);
        return () => clearTimeout(t);
    }, []);
    return (
        <EffectComposer disableNormalPass multisampling={0}>
            <Noise opacity={0.65} blendFunction={BlendFunction.MULTIPLY} />
            <Vignette eskil={false} offset={0.6} darkness={1.1} />
            <ChromaticAberration offset={[0.015, 0.015]} blendFunction={BlendFunction.NORMAL} />
            {glitchActive && <Glitch delay={[0, 0]} duration={[0.1, 0.3]} strength={[0.6, 1.5]} mode={GlitchMode.SPORADIC} active ratio={0.8} />}
        </EffectComposer>
    );
};

// ----------------------------------------------------------------------
// 6. OS_MENTAL_ABYSS — ENTRY POINT
// ----------------------------------------------------------------------
export default function OSMentalAbyss() {
    const [audioLow, setAudioLow]     = useState(0);
    const [infecciones, setInfecciones] = useState([]);
    const [terminalOpen, setTerminalOpen] = useState(false);
    const [uploadOpen, setUploadOpen]   = useState(false);
    const [isPointerLocked, setIsPointerLocked] = useState(false);
    const [assetPreview, setAssetPreview] = useState(null); // { url, tipo, nombre }
    const { socket, otherPlayers } = useMultiplayer();

    // Set de IDs ya vistos — persiste entre re-renders, sobrevive StrictMode
    const seenIds = useRef(new Set());
    const channelRef = useRef(null);

    const addInfeccion = (inf) => {
        if (!inf?.id || seenIds.current.has(inf.id)) return;
        seenIds.current.add(inf.id);
        setInfecciones(prev => [inf, ...prev].slice(0, 150)); // máx 150 infecciones visibles
    };


    // Hidratar con infecciones existentes + suscribirse a nuevas en tiempo real
    useEffect(() => {
        if (channelRef.current) return; // evita doble suscripción (StrictMode)
        // Cargar las últimas 200 infecciones existentes en DB
        getRecentInfections(200).then(historicas => {
            historicas.forEach(inf => addInfeccion(inf));
        });
        // Suscribirse a nuevas infecciones en tiempo real
        channelRef.current = subscribeToInfections(addInfeccion);
        return () => {
            channelRef.current?.unsubscribe?.();
            channelRef.current = null;
        };
    }, []);

    // Escuchar cambios de pointer lock
    useEffect(() => {
        const onLockChange = (e) => setIsPointerLocked(e.detail.locked);
        window.addEventListener('abyss:lockchange', onLockChange);
        return () => window.removeEventListener('abyss:lockchange', onLockChange);
    }, []);

    // Shortcuts de teclado [I] y [U]
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.matches('input, textarea')) return;
            if (e.code === 'KeyI') { e.preventDefault(); setTerminalOpen(v => !v); }
            if (e.code === 'KeyU') { e.preventDefault(); setUploadOpen(v => !v); }
            if (e.key === 'Escape') { setTerminalOpen(false); setUploadOpen(false); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Escuchar apertura de asset (guard: ignorar si ya hay popup abierto)
    const assetPreviewRef = useRef(null);
    useEffect(() => {
        const handler = (e) => {
            if (assetPreviewRef.current) return; // ya abierto, ignorar
            document.exitPointerLock?.();
            assetPreviewRef.current = e.detail;
            setAssetPreview(e.detail);
        };
        window.addEventListener('abyss:assetopen', handler);
        return () => window.removeEventListener('abyss:assetopen', handler);
    }, []);

    const closePreview = () => {
        assetPreviewRef.current = null;
        setAssetPreview(null);
    };

    // Partículas: fijas siempre 5000 (las infecciones no las consumen)
    const particleCount = 5000;

    // Pods de blobs (pares rojo+azul) con personalidad única cada uno
    const blobPods = useMemo(() => [
        // Pod 0 — lento y majestuoso
        { center: [4, 8, -12],    orbitRadius: 2.0, orbitPhase: 0.4, floatSpeed: 0.3, floatAmp: 1.2,
          redParams:  { size: 0.55, deformFreq: 1.8, deformAmp: 0.35, pulseSpeed: 1.2, pulseAmp: 0.16, rotSpeedX: 0.10, rotSpeedY: 0.22 },
          blueParams: { size: 0.38, deformFreq: 3.1, deformAmp: 0.18, pulseSpeed: 2.8, pulseAmp: 0.06, rotSpeedX: 0.28, rotSpeedY: 0.12 } },
        // Pod 1 — rápido y juguetón
        { center: [-10, -6, -20], orbitRadius: 1.2, orbitPhase: 2.1, floatSpeed: 0.9, floatAmp: 0.5,
          redParams:  { size: 0.32, deformFreq: 3.5, deformAmp: 0.28, pulseSpeed: 3.2, pulseAmp: 0.22, rotSpeedX: 0.38, rotSpeedY: 0.44 },
          blueParams: { size: 0.45, deformFreq: 2.2, deformAmp: 0.40, pulseSpeed: 1.5, pulseAmp: 0.14, rotSpeedX: 0.15, rotSpeedY: 0.31 } },
        // Pod 2 — asimétrico (grande vs diminuto)
        { center: [14, -8, -10],  orbitRadius: 1.6, orbitPhase: 4.8, floatSpeed: 0.55, floatAmp: 1.0,
          redParams:  { size: 0.65, deformFreq: 1.5, deformAmp: 0.45, pulseSpeed: 0.8, pulseAmp: 0.25, rotSpeedX: 0.06, rotSpeedY: 0.14 },
          blueParams: { size: 0.20, deformFreq: 4.2, deformAmp: 0.12, pulseSpeed: 4.5, pulseAmp: 0.08, rotSpeedX: 0.55, rotSpeedY: 0.62 } },
        // Pod 3 — nervioso, deformación extrema
        { center: [-12, 14, -18], orbitRadius: 1.4, orbitPhase: 1.6, floatSpeed: 1.2, floatAmp: 0.7,
          redParams:  { size: 0.35, deformFreq: 4.8, deformAmp: 0.55, pulseSpeed: 4.0, pulseAmp: 0.30, rotSpeedX: 0.50, rotSpeedY: 0.60 },
          blueParams: { size: 0.42, deformFreq: 4.0, deformAmp: 0.50, pulseSpeed: 3.5, pulseAmp: 0.25, rotSpeedX: 0.42, rotSpeedY: 0.50 } },
        // Pod 4 — lejano, enorme relativo, lentísimo
        { center: [2, -18, -28],  orbitRadius: 2.8, orbitPhase: 3.3, floatSpeed: 0.2, floatAmp: 1.8,
          redParams:  { size: 0.72, deformFreq: 1.2, deformAmp: 0.22, pulseSpeed: 0.6, pulseAmp: 0.10, rotSpeedX: 0.04, rotSpeedY: 0.08 },
          blueParams: { size: 0.58, deformFreq: 1.6, deformAmp: 0.28, pulseSpeed: 0.9, pulseAmp: 0.12, rotSpeedX: 0.07, rotSpeedY: 0.05 } },
    ], []);

    return (
        <>
            {/* ── POPUP DE ASSET ──────────────────────────────────────────── */}
            {assetPreview && (
                <div
                    onClick={closePreview}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.92)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(6px)',
                    }}
                >
                    <div style={{
                        border: '1px solid rgba(57,255,20,0.5)',
                        boxShadow: '0 0 40px rgba(57,255,20,0.15)',
                        maxWidth: '90vw', maxHeight: '85vh',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: '12px', padding: '16px',
                    }}>
                        {assetPreview.tipo === 'image'
                            ? <img src={assetPreview.url} alt={assetPreview.nombre}
                                style={{ maxWidth: '85vw', maxHeight: '78vh', objectFit: 'contain', display: 'block' }} />
                            : <video src={assetPreview.url} autoPlay loop muted controls
                                style={{ maxWidth: '85vw', maxHeight: '78vh', display: 'block' }} />
                        }
                        <div style={{
                            color: 'rgba(57,255,20,0.6)', fontFamily: 'monospace',
                            fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase',
                        }}>
                            ◈ {assetPreview.nombre} · click para cerrar
                        </div>
                    </div>
                </div>
            )}

            <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', margin: 0, padding: 0, cursor: isPointerLocked ? 'none' : 'default' }}>

                <AudioAnalyzer setAudioLow={setAudioLow} />

                {/* El ojo/crosshair solo cuando estamos en modo navegación */}
                {isPointerLocked && <NazarCrosshair />}

                {/* ── CUANDO BLOQUEADO: hint sutil arriba (ESC funciona) ── */}
                {isPointerLocked && (
                    <div style={{
                        position: 'fixed', top: '14px', left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        color: 'rgba(57,255,20,0.35)',
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        letterSpacing: '3px',
                    }}>ESC · CLICK DER = PAUSAR</div>
                )}

                {/* ── CUANDO LIBRE: botón prominente para retomar navegación ── */}
                {!isPointerLocked && !terminalOpen && !uploadOpen && (
                    <button
                        onClick={() => document.querySelector('canvas')?.requestPointerLock()}
                        style={{
                            position: 'fixed', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 9999,
                            pointerEvents: 'all',
                            background: 'rgba(0,0,0,0.85)',
                            color: '#39FF14',
                            border: '1px solid #39FF14',
                            padding: '14px 32px',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            letterSpacing: '4px',
                            cursor: 'pointer',
                            animation: 'abyssFlicker 1.8s infinite',
                            boxShadow: '0 0 24px rgba(57,255,20,0.4)',
                        }}
                    >
                        ◈ ABRIR TERCER OJO
                    </button>
                )}

                <AbyssHUD particleCount={particleCount} playerCount={Object.keys(otherPlayers).length + 1} />
                <InfectionTerminal
                    isOpen={terminalOpen}
                    onClose={() => setTerminalOpen(false)}
                    onInfection={addInfeccion}
                />
                <UploadPortal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />

                {/* Botones permanentes */}
                <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', gap: '12px', zIndex: 999 }}>
                    <button onClick={() => setUploadOpen(true)} style={{
                        background: 'transparent', color: '#39FF14', border: '1px solid #39FF14',
                        padding: '10px 16px', cursor: 'pointer', fontFamily: 'monospace',
                        fontSize: '11px', letterSpacing: '2px',
                    }}>◈ SUBIR ARCHIVO</button>
                    <button onClick={() => setTerminalOpen(v => !v)} style={{
                        background: terminalOpen ? '#39FF14' : 'rgba(0,5,0,0.85)',
                        color: terminalOpen ? '#000' : '#39FF14',
                        border: '1px solid #39FF14', padding: '10px 16px', cursor: 'pointer',
                        fontFamily: 'monospace', fontSize: '11px', letterSpacing: '2px',
                        boxShadow: '0 0 20px rgba(57,255,20,0.4)',
                    }}>◈ INFECTAR EL ABISMO</button>
                </div>

                <Canvas camera={{ position: [0, 0, 22], fov: 70 }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
                    <color attach="background" args={['#000000']} />

                    <AbyssNavigator terminalOpen={terminalOpen || uploadOpen} />
                    <CenterRaycaster />
                    <GPUFluidParticles count={particleCount} color="#39FF14" />

                    {/* Pods de blobs pareêdos (rojo+azul) con caos único */}
                    {blobPods.map((pod, i) => (
                        <BlobPair key={i} {...pod} />
                    ))}
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
                                index={i}
                                mensaje={inf.mensaje}
                                color={inf.color}
                                font={inf.font}
                                position={[Math.sin(i * 2.4) * 22, Math.cos(i * 1.7) * 22, Math.sin(i * 0.9) * 22 - 5]}
                            />
                        ))}
                    </React.Suspense>

                    <AggressivePostProcessing />
                </Canvas>
            </div>

            {/* Navigator de infecciones — DOM, no Canvas */}
            <InfectionNavigator infecciones={infecciones} />
        </>
    );
}
