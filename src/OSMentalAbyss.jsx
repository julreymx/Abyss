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
import ProceduralCrystal from './components/experimental/ProceduralCrystal';
import AbyssGallery from './gallery/AbyssGallery';
import UploadPortal from './gallery/UploadPortal';
import InfectionTerminal from './components/InfectionTerminal';
import AbyssNavigator from './controls/AbyssNavigator';
import { getRecentInfections, limpiarAbismo, subscribeToInfections } from './services/supabase';

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
const DisturbedEntity = React.memo(({ position, rotation, audioLow, videoUrl }) => {
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
            meshRef.current.rotation.x += delta * 0.05;
            meshRef.current.rotation.y += delta * 0.08;
            if (hovered) {
                meshRef.current.position.z -= delta * 2.0;
            } else {
                meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.01;
                meshRef.current.position.x += Math.cos(state.clock.elapsedTime * 0.3 + position[1]) * 0.01;
            }
        }
    });

    return (
        <mesh ref={meshRef} position={position} rotation={rotation}
            onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
            <planeGeometry args={[4, 5, 64, 64]} />
            <meltingShaderMaterial ref={materialRef} transparent uColorEffect={new THREE.Color(toxicColor)} />
        </mesh>
    );
});
DisturbedEntity.displayName = 'DisturbedEntity';

// ----------------------------------------------------------------------
// 4. TEXTO DE INFECCIÓN FLOTANTE
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
            <Html center distanceFactor={8} style={{
                color: color || '#39FF14',
                fontFamily: "'Courier New', monospace",
                fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px',
                textShadow: `0 0 8px ${color || '#39FF14'}, 0 0 20px ${color || '#39FF14'}`,
                whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none',
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
    const [audioLow, setAudioLow] = useState(0);
    const [infecciones, setInfecciones] = useState([]);
    const [terminalOpen, setTerminalOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const { socket, otherPlayers } = useMultiplayer();

    // Sesión efímera + suscripción en tiempo real
    useEffect(() => {
        // Suscribirse PRIMERO para no perder eventos
        const channel = subscribeToInfections((newInfection) => {
            setInfecciones(prev => [newInfection, ...prev].slice(0, 5000));
        });
        // Limpiar el abismo y estado local
        limpiarAbismo().then(() => setInfecciones([]));

        return () => {
            channel?.unsubscribe?.();
        };
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

    // Cada infección consume 1 partícula
    const particleCount = Math.max(0, 5000 - infecciones.length);

    // Entidades físicas
    const entities = useMemo(() => Array.from({ length: 25 }).map((_, i) => ({
        position: [(Math.random() - 0.5) * 35, (Math.random() - 0.5) * 35, (Math.random() - 0.5) * 20 - 15],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        videoUrl: null,
    })), []);

    return (
        <>
            <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', margin: 0, padding: 0 }}>
                <AudioAnalyzer setAudioLow={setAudioLow} />

                <AbyssHUD particleCount={particleCount} playerCount={Object.keys(otherPlayers).length + 1} />
                <InfectionTerminal isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />
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

                <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
                    <color attach="background" args={['#000000']} />

                    <AbyssNavigator terminalOpen={terminalOpen || uploadOpen} />
                    <GPUFluidParticles count={particleCount} color="#39FF14" />
                    <ProceduralCrystal position={[0, 0, -8]} />
                    <ProceduralCrystal position={[6, -3, -12]} />
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
                                position={[Math.sin(i * 2.4) * 12, Math.cos(i * 1.7) * 8, Math.sin(i * 0.9) * 15 - 10]}
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
        </>
    );
}
