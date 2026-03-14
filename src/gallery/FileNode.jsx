import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import { useTexture, useVideoTexture, Html, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ─── CONSTANTE DWELL ─────────────────────────────────────────────────────────
const DWELL_MAX = 11; // segundos para teletransporte

// ─── Helper: posición aleatoria dentro de la nube ─────────────────────────
function randomInCloud() {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(Math.random() * 2 - 1);
    const r     = 10 + Math.random() * 22;
    return [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi) - 5,
    ];
}

// ─── MELTING SHADER con sistema de Dwell ─────────────────────────────────────
// Uniformes: time, uHasTexture, tDiffuse, uColorEffect
// uDwell  [0→1]: progreso de la mirada continua (11s = 1)
// uDissolve [0→1]: cuando el asset se desintegra/regenera
const MeltingAssetMaterial = shaderMaterial(
    {
        time: 0, uHasTexture: 0.0,
        tDiffuse: null,
        uColorEffect: new THREE.Color('#39FF14'),
        uDwell: 0.0,       // 0=normal, 1=11 segundos mirado
        uDissolve: 0.0,    // 0=visible, 1=disuelto completamente
    },
    /* vertex */`
    uniform float time;
    uniform float uDwell;
    uniform float uDissolve;
    varying vec2 vUv;
    varying float vNoise;

    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
    float noise(vec3 p){
      vec3 a=floor(p),d=p-a; d=d*d*(3.0-2.0*d);
      vec4 b=a.xxyy+vec4(0,1,0,1),k1=permute(b.xyxy),k2=permute(k1.xyxy+b.zzww);
      vec4 c=k2+a.zzzz,k3=permute(c),k4=permute(c+1.0);
      vec4 o1=fract(k3*(1.0/41.0)),o2=fract(k4*(1.0/41.0));
      vec4 o3=o2*d.z+o1*(1.0-d.z); vec2 o4=o3.yw*d.x+o3.xz*(1.0-d.x);
      return o4.y*d.y+o4.x*(1.0-d.y);
    }

    void main() {
        vUv = uv;
        vec3 pos = position;

        // Distorsión que AUMENTA con el dwell (la mirada acumula entropía)
        float distortBase = 0.08 + uDwell * 0.9;
        float wave = noise(vec3(pos.x*1.5+time*0.6, pos.y*1.5+time*0.4, pos.z)) * distortBase;
        pos.z += wave;

        // Scatter al disolverse: los vértices se dispersan hacia afuera
        float scatter = noise(vec3(pos.x*3.0+time*2.0, pos.y*3.0, pos.z*3.0)) * uDissolve * 5.0;
        pos += normalize(position + 0.001) * scatter;

        vNoise = noise(vec3(uv * 12.0, time * 0.3));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }`,
    /* fragment */`
    uniform float time;
    uniform float uDwell;
    uniform float uDissolve;
    uniform vec3 uColorEffect;
    uniform sampler2D tDiffuse;
    uniform float uHasTexture;
    varying vec2 vUv;
    varying float vNoise;

    float random(vec2 st){ return fract(sin(dot(st.xy, vec2(12.9898,78.233)))*43758.5453123); }

    void main() {
        vec2 uv = vUv;
        float n = random(uv + time * 0.05) * 0.06;
        vec3 color = vec3(0.04) + vec3(n);

        if (uHasTexture > 0.5) {
            // Aberración cromática que CONVERGE con el dwell (imagen más fiel)
            // shift empieza en 0.028, llega a 0 cuando dwell = 1
            float shift = 0.028 * max(0.0, 1.0 - uDwell * 1.3);
            vec4 r = texture2D(tDiffuse, uv + vec2( shift, 0.0));
            vec4 g = texture2D(tDiffuse, uv);
            vec4 b = texture2D(tDiffuse, uv - vec2( shift, 0.0));
            color = mix(color, vec3(r.r, g.g, b.b), 0.92);
        }

        // Tinte de color efecto (más pronunciado al inicio, se desvanece al enfocar)
        vec3 m = mix(color, uColorEffect, (1.0 - uDwell) * 0.25);
        // Scanline que se acelera con el dwell
        float scanSpeed = 8.0 + uDwell * 60.0;
        m -= vec3(sin(vUv.y * 120.0 + time * scanSpeed) * 0.035 * (1.0 - uDwell * 0.5));

        // Máscara de disolución: descarta píxeles con ruido < umbral (efecto granular)
        float dissolveMask = random(uv * (14.0 + uDissolve * 8.0) + time * 0.2);
        if (dissolveMask < uDissolve * 0.92) discard;

        // Alpha normal, un poco transparente en la regeneración
        float alpha = 1.0 - uDissolve * 0.4;
        gl_FragColor = vec4(m, alpha);
    }`
);
extend({ MeltingAssetMaterial });

// ─── Parámetros de caos por posición (determinista) ─────────────────────────
function useChaosParams(position) {
    return useMemo(() => {
        const h = (n) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;
        const [x, y, z] = position;
        const seed = h(x) + h(y * 2.3) + h(z * 5.7);
        const r  = (offset) => (h(seed + offset) * 2 - 1);
        const rp = (offset) => h(seed + offset);
        return {
            floatSpeedX: 0.15 + rp(1.1) * 0.9,
            floatSpeedY: 0.2  + rp(2.2) * 1.1,
            floatAmpX:   0.1  + rp(3.3) * 0.6,
            floatAmpY:   0.15 + rp(4.4) * 0.8,
            phaseX:      rp(5.5) * Math.PI * 2,
            phaseY:      rp(6.6) * Math.PI * 2,
            tiltX:       r(7.7) * 0.55,
            tiltY:       r(8.8) * 0.55,
            tiltZ:       r(9.9) * 0.4,
            scale:       0.8 + rp(11.2) * 0.65,
            tumbleSpeed: r(12.3) * 0.18,
            tumbleAxis:  new THREE.Vector3(r(13.4), r(14.5), r(15.6)).normalize(),
        };
    }, [position]);
}

// ─── Caos: float + billboard con personalidad única, acepta basePosRef ───────
const IDLE_QUAT = new THREE.Quaternion();
const _savedQuat  = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();

function useChaos(groupRef, originalPosition, basePosRef) {
    const { camera } = useThree();
    const c = useChaosParams(originalPosition);
    const tiltQuat = useMemo(() => {
        const q = new THREE.Quaternion();
        q.setFromEuler(new THREE.Euler(c.tiltX, c.tiltY, c.tiltZ));
        return q;
    }, [c]);
    const _tQ = useMemo(() => new THREE.Quaternion(), []);
    const _sQ = useMemo(() => new THREE.Quaternion(), []);

    useFrame((state, delta) => {
        const g = groupRef.current;
        if (!g) return;
        const t = state.clock.elapsedTime;

        // Flotar alrededor del basePosRef actual (puede cambiar en teleport)
        const bp = basePosRef.current;
        g.position.set(
            bp[0] + Math.cos(t * c.floatSpeedX + c.phaseX) * c.floatAmpX,
            bp[1] + Math.sin(t * c.floatSpeedY + c.phaseY) * c.floatAmpY,
            bp[2] + Math.sin(t * c.floatSpeedX * 0.7 + c.phaseX) * c.floatAmpX * 0.5
        );

        // Billboard
        let isHovered = false;
        g.traverse(obj => { if (obj.isMesh && obj.userData.centerHovered) isHovered = true; });

        if (isHovered) {
            _sQ.copy(g.quaternion);
            g.lookAt(camera.position);
            _tQ.copy(g.quaternion);
            g.quaternion.copy(_sQ);
            g.quaternion.slerp(_tQ, Math.min(1, delta * 10));
        } else {
            g.quaternion.multiplyQuaternions(
                tiltQuat,
                new THREE.Quaternion().setFromAxisAngle(c.tumbleAxis, t * c.tumbleSpeed)
            );
        }
    });

    return c;
}

// ─── useCenterHover ──────────────────────────────────────────────────────────
function useCenterHover(meshRef, setHovered) {
    useFrame(() => {
        if (!meshRef.current) return;
        const ch = !!meshRef.current.userData.centerHovered;
        setHovered(prev => (prev !== ch ? ch : prev));
    });
}

// ─── Estado de dwell / countdown / teleport ────────────────────────────────
// Devuelve dwellFraction (0→1) como ref para que otros hooks lo lean
function useDwell(matRef, groupRef, basePosRef, onDwellChange, assetInfo) {
    const dwellRef   = useRef(0);
    const phaseRef   = useRef(0); // 0=normal,1=dissolving,2=regen

    // Click handler: abrir asset si el ojo está puesto sobre él
    useEffect(() => {
        const handleClick = () => {
            if (!groupRef.current) return;
            let isHov = false;
            groupRef.current.traverse(obj => {
                if (obj.isMesh && obj.userData.centerHovered) isHov = true;
            });
            if (isHov && phaseRef.current === 0) {
                window.dispatchEvent(new CustomEvent('abyss:assetopen', { detail: assetInfo }));
            }
        };
        window.addEventListener('pointerdown', handleClick);
        return () => window.removeEventListener('pointerdown', handleClick);
    }, [groupRef, assetInfo]);

    useFrame((_, delta) => {
        if (!matRef.current) return;

        let isHovered = false;
        if (groupRef.current) {
            groupRef.current.traverse(obj => {
                if (obj.isMesh && obj.userData.centerHovered) isHovered = true;
            });
        }

        if (phaseRef.current === 0) {
            if (isHovered) {
                dwellRef.current += delta;
                if (dwellRef.current >= DWELL_MAX) phaseRef.current = 1;
            } else {
                dwellRef.current = Math.max(0, dwellRef.current - delta * 1.8);
            }
            matRef.current.uDwell    = Math.min(dwellRef.current / DWELL_MAX, 1.0);
            matRef.current.uDissolve = 0;
            onDwellChange(dwellRef.current);

        } else if (phaseRef.current === 1) {
            matRef.current.uDissolve = Math.min(matRef.current.uDissolve + delta * 1.2, 1);
            onDwellChange(DWELL_MAX);
            if (matRef.current.uDissolve >= 1) {
                basePosRef.current = randomInCloud();
                dwellRef.current   = 0;
                matRef.current.uDwell = 0;
                onDwellChange(0);
                phaseRef.current   = 2;
            }

        } else if (phaseRef.current === 2) {
            matRef.current.uDissolve = Math.max(matRef.current.uDissolve - delta * 1.2, 0);
            onDwellChange(0);
            if (matRef.current.uDissolve <= 0) phaseRef.current = 0;
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
class BaseErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error) { console.warn('⚠️ Media falló:', error); }
    render() {
        if (this.state.hasError) return <GenericNode position={this.props.position} nombre="[CORRUPTO]" tipo="unknown" />;
        return this.props.children;
    }
}

export default function FileNode({ file }) {
    const { tipo, url, nombre, posicion_x, posicion_y, posicion_z } = file;
    const position = [posicion_x, posicion_y, posicion_z];
    const isImage  = tipo?.startsWith('image/');
    const isVideo  = tipo?.startsWith('video/');
    const isAudio  = tipo?.startsWith('audio/');

    return (
        <BaseErrorBoundary position={position}>
            {isImage && <ImageNode url={url} position={position} nombre={nombre} />}
            {isVideo && <VideoNode url={url} position={position} nombre={nombre} />}
            {isAudio && <AudioNode position={position} nombre={nombre} />}
            {!isImage && !isVideo && !isAudio && <GenericNode position={position} nombre={nombre} tipo={tipo} />}
        </BaseErrorBoundary>
    );
}

// ─── IMAGE NODE ───────────────────────────────────────────────────────────────
function ImageNode({ url, position, nombre }) {
    const groupRef   = useRef();
    const meshRef    = useRef();
    const matRef     = useRef();
    const basePosRef = useRef([...position]);
    const [hovered, setHovered]   = useState(false);
    const [dwellSec, setDwellSec] = useState(0);
    const texture    = useTexture(url);
    const toxicColor = useMemo(() =>
        new THREE.Color(['#39FF14', '#ccff00', '#00ff66'][Math.floor(Math.abs(Math.sin(position[0] * 100)) * 3)]),
        [position]);
    const assetInfo  = useMemo(() => ({ url, tipo: 'image', nombre }), [url, nombre]);
    const onDwell    = useCallback((v) => setDwellSec(Math.round(v * 10) / 10), []);

    useEffect(() => { if (meshRef.current) meshRef.current.userData.hoverable = true; }, []);

    const { scale } = useChaos(groupRef, position, basePosRef);
    useCenterHover(meshRef, setHovered);
    useDwell(matRef, groupRef, basePosRef, onDwell, assetInfo);

    useFrame((_, delta) => {
        if (matRef.current) {
            matRef.current.time += delta * 0.8;
            matRef.current.tDiffuse    = texture;
            matRef.current.uHasTexture = 1.0;
        }
    });

    const remaining = Math.max(0, DWELL_MAX - dwellSec);
    const showCount = dwellSec > 0.5;

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef} scale={[scale, scale, 1]} frustumCulled={false}>
                <planeGeometry args={[4.2, 4.2, 32, 32]} />
                <meltingAssetMaterial ref={matRef} transparent uColorEffect={toxicColor} />
                {hovered && <NodeLabel nombre={nombre} />}
                {showCount && (
                    <Html center position={[0, 2.6, 0.1]}>
                        <div style={{
                            color: remaining < 3 ? '#ff003c' : '#39FF14',
                            fontFamily: 'monospace', fontSize: '11px',
                            letterSpacing: '3px', opacity: 0.85,
                            textShadow: `0 0 8px ${remaining < 3 ? '#ff003c' : '#39FF14'}`,
                            pointerEvents: 'none',
                            transition: 'color 0.3s',
                        }}>
                            {remaining.toFixed(1)}s
                        </div>
                    </Html>
                )}
            </mesh>
        </group>
    );
}

// ─── VIDEO NODE ───────────────────────────────────────────────────────────────
function VideoNode({ url, position, nombre }) {
    const groupRef   = useRef();
    const meshRef    = useRef();
    const matRef     = useRef();
    const basePosRef = useRef([...position]);
    const [hovered, setHovered]   = useState(false);
    const [dwellSec, setDwellSec] = useState(0);
    const texture    = useVideoTexture(url, { muted: true, loop: true, start: true, crossOrigin: 'Anonymous' });
    const toxicColor = useMemo(() =>
        new THREE.Color(['#ff003c', '#ff6600', '#cc00ff'][Math.floor(Math.abs(Math.sin(position[1] * 100)) * 3)]),
        [position]);
    const assetInfo  = useMemo(() => ({ url, tipo: 'video', nombre }), [url, nombre]);
    const onDwell    = useCallback((v) => setDwellSec(Math.round(v * 10) / 10), []);

    useEffect(() => { if (meshRef.current) meshRef.current.userData.hoverable = true; }, []);

    const { scale } = useChaos(groupRef, position, basePosRef);
    useCenterHover(meshRef, setHovered);
    useDwell(matRef, groupRef, basePosRef, onDwell, assetInfo);

    useFrame((_, delta) => {
        if (matRef.current) {
            matRef.current.time += delta * 0.8;
            matRef.current.tDiffuse    = texture;
            matRef.current.uHasTexture = 1.0;
        }
    });

    const remaining = Math.max(0, DWELL_MAX - dwellSec);
    const showCount = dwellSec > 0.5;

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef} scale={[scale, scale, 1]} frustumCulled={false}>
                <planeGeometry args={[5.2, 2.9, 32, 32]} />
                <meltingAssetMaterial ref={matRef} transparent uColorEffect={toxicColor} />
                {hovered && <NodeLabel nombre={nombre} />}
                {showCount && (
                    <Html center position={[0, 1.7, 0.1]}>
                        <div style={{
                            color: remaining < 3 ? '#ff003c' : '#39FF14',
                            fontFamily: 'monospace', fontSize: '11px',
                            letterSpacing: '3px', opacity: 0.85,
                            textShadow: `0 0 8px ${remaining < 3 ? '#ff003c' : '#39FF14'}`,
                            pointerEvents: 'none',
                            transition: 'color 0.3s',
                        }}>
                            {remaining.toFixed(1)}s
                        </div>
                    </Html>
                )}
            </mesh>
        </group>
    );
}

// ─── AUDIO NODE ───────────────────────────────────────────────────────────────
function AudioNode({ position, nombre }) {
    const groupRef   = useRef();
    const meshRef    = useRef();
    const basePosRef = useRef([...position]);
    const [hovered, setHovered] = useState(false);

    useEffect(() => { if (meshRef.current) meshRef.current.userData.hoverable = true; }, []);
    useChaos(groupRef, position, basePosRef);

    useFrame((state) => {
        const g = groupRef.current;
        if (!g) return;
        const t = state.clock.elapsedTime;
        const bp = basePosRef.current;
        g.position.set(
            bp[0] + Math.cos(t * 0.4 + bp[2]) * 0.2,
            bp[1] + Math.sin(t * 0.7 + bp[0]) * 0.4,
            bp[2]
        );
        if (meshRef.current) {
            const pulse = 1 + Math.sin(t * 5) * (hovered ? 0.3 : 0.08);
            meshRef.current.scale.setScalar(pulse);
        }
    });

    useCenterHover(meshRef, setHovered);

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef} frustumCulled={false}>
                <icosahedronGeometry args={[1.2, 1]} />
                <meshBasicMaterial color={hovered ? '#39FF14' : '#0a4a20'} wireframe />
                {hovered && <NodeLabel nombre={nombre} />}
            </mesh>
        </group>
    );
}

// ─── GENERIC NODE ─────────────────────────────────────────────────────────────
function GenericNode({ position, nombre, tipo }) {
    const groupRef   = useRef();
    const meshRef    = useRef();
    const basePosRef = useRef([...position]);
    const [hovered, setHovered] = useState(false);

    useEffect(() => { if (meshRef.current) meshRef.current.userData.hoverable = true; }, []);
    useChaos(groupRef, position, basePosRef);
    useCenterHover(meshRef, setHovered);

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef}>
                <boxGeometry args={[1.5, 2, 0.1]} />
                <meshBasicMaterial color={hovered ? '#39FF14' : '#1a3a20'} wireframe />
                {hovered && <NodeLabel nombre={nombre} extra={tipo} />}
            </mesh>
        </group>
    );
}

// ─── LABEL ────────────────────────────────────────────────────────────────────
function NodeLabel({ nombre, extra }) {
    return (
        <Html center position={[0, -2.8, 0.1]}>
            <div style={{
                color: '#39FF14', background: 'rgba(0,5,0,0.92)',
                padding: '5px 14px', border: '1px solid #39FF14',
                fontFamily: 'monospace', fontSize: '11px', letterSpacing: '2px',
                whiteSpace: 'nowrap', pointerEvents: 'none',
                boxShadow: '0 0 14px rgba(57,255,20,0.6)',
                textTransform: 'uppercase',
            }}>
                ◈ {nombre}{extra ? ` [${extra.split('/')[1] || extra}]` : ''}
            </div>
        </Html>
    );
}
