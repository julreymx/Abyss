import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, useVideoTexture, Html } from '@react-three/drei';
import * as THREE from 'three';

const IDLE_QUAT = new THREE.Quaternion(); // identidad, reutilizable
const _savedQuat = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();

/**
 * useBillboard — opera en el GROUP (hijo directo de escena)
 * para que lookAt tenga world space limpio.
 * Traversa hijos para detectar si algún mesh tiene centerHovered.
 */
function useBillboard(groupRef) {
    const { camera } = useThree();

    useFrame((_, delta) => {
        const g = groupRef.current;
        if (!g) return;

        // Detectar hover en cualquier mesh hijo
        let isHovered = false;
        g.traverse(obj => { if (obj.isMesh && obj.userData.centerHovered) isHovered = true; });

        if (isHovered) {
            // Capturar target con lookAt nativo (maneja world space)
            _savedQuat.copy(g.quaternion);
            g.lookAt(camera.position);
            _targetQuat.copy(g.quaternion);
            g.quaternion.copy(_savedQuat);
            // Slerp suave hacia cámara
            g.quaternion.slerp(_targetQuat, Math.min(1, delta * 7));
        } else {
            // Volver a identidad (orientación original)
            g.quaternion.slerp(IDLE_QUAT, Math.min(1, delta * 3));
        }
    });
}

/**
 * useFloat — oscila el GROUP en world space (posición base + offset senoidal)
 */
function useFloat(groupRef, basePos, speed = 1) {
    useFrame((state) => {
        const g = groupRef.current;
        if (!g) return;
        const t = state.clock.elapsedTime * speed;
        g.position.set(
            basePos[0] + Math.cos(t * 0.3 + basePos[2]) * 0.25,
            basePos[1] + Math.sin(t * 0.5 + basePos[0]) * 0.35,
            basePos[2]
        );
    });
}

/**
 * useCenterHover — lee userData.centerHovered del mesh cada frame
 * y sincroniza el state sin causar renders innecesarios.
 */
function useCenterHover(meshRef, setHovered) {
    useFrame(() => {
        if (!meshRef.current) return;
        const ch = !!meshRef.current.userData.centerHovered;
        setHovered(prev => (prev !== ch ? ch : prev));
    });
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FileNode({ file }) {
    const { tipo, url, nombre, posicion_x, posicion_y, posicion_z } = file;
    const position = [posicion_x, posicion_y, posicion_z];
    const isImage = tipo?.startsWith('image/');
    const isVideo = tipo?.startsWith('video/');
    const isAudio = tipo?.startsWith('audio/');
    if (isImage) return <ImageNode url={url} position={position} nombre={nombre} />;
    if (isVideo) return <VideoNode url={url} position={position} nombre={nombre} />;
    if (isAudio) return <AudioNode position={position} nombre={nombre} />;
    return <GenericNode position={position} nombre={nombre} tipo={tipo} />;
}

// ─── IMAGE NODE ───────────────────────────────────────────────────────────────
function ImageNode({ url, position, nombre }) {
    const groupRef = useRef();
    const meshRef = useRef();
    const glowRef = useRef();
    const [hovered, setHovered] = useState(false);
    const texture = useTexture(url);

    // Tag para CenterRaycaster
    useEffect(() => { if (meshRef.current) meshRef.current.userData.hoverable = true; }, []);

    useBillboard(groupRef);
    useFloat(groupRef, position, 0.7);
    useCenterHover(meshRef, setHovered);

    useFrame((_, delta) => {
        // Glow opacity
        if (glowRef.current) {
            glowRef.current.material.opacity = THREE.MathUtils.lerp(
                glowRef.current.material.opacity, hovered ? 0.55 : 0, delta * 8
            );
        }
        // Scale pulse
        if (meshRef.current) {
            const s = hovered ? 1.08 : 1;
            meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), delta * 10);
        }
    });

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef}>
                <planeGeometry args={[3.2, 3.2]} />
                <meshBasicMaterial map={texture} side={THREE.DoubleSide} />

                {/* Glow neon border detrás */}
                <mesh ref={glowRef} position={[0, 0, -0.06]} scale={[1.12, 1.12, 1]}>
                    <planeGeometry args={[3.2, 3.2]} />
                    <meshBasicMaterial color="#39FF14" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>

                {hovered && <NodeLabel nombre={nombre} />}
            </mesh>
        </group>
    );
}

// ─── VIDEO NODE ───────────────────────────────────────────────────────────────
function VideoNode({ url, position, nombre }) {
    const groupRef = useRef();
    const meshRef = useRef();
    const glowRef = useRef();
    const [hovered, setHovered] = useState(false);
    const texture = useVideoTexture(url, { muted: true, loop: true, start: true, crossOrigin: 'Anonymous' });

    useEffect(() => { if (meshRef.current) meshRef.current.userData.hoverable = true; }, []);

    useBillboard(groupRef);
    useFloat(groupRef, position, 0.5);
    useCenterHover(meshRef, setHovered);

    useFrame((_, delta) => {
        if (glowRef.current) {
            glowRef.current.material.opacity = THREE.MathUtils.lerp(
                glowRef.current.material.opacity, hovered ? 0.6 : 0, delta * 8
            );
        }
        if (meshRef.current) {
            const s = hovered ? 1.06 : 1;
            meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), delta * 10);
        }
    });

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef}>
                <planeGeometry args={[4, 2.25]} />
                <meshBasicMaterial map={texture} side={THREE.DoubleSide} />

                <mesh ref={glowRef} position={[0, 0, -0.06]} scale={[1.09, 1.09, 1]}>
                    <planeGeometry args={[4, 2.25]} />
                    <meshBasicMaterial color="#ff003c" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>

                {hovered && <NodeLabel nombre={nombre} />}
            </mesh>
        </group>
    );
}

// ─── AUDIO NODE ───────────────────────────────────────────────────────────────
function AudioNode({ position, nombre }) {
    const groupRef = useRef();
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    useEffect(() => { if (meshRef.current) meshRef.current.userData.hoverable = true; }, []);

    useBillboard(groupRef);

    useFrame((state) => {
        const g = groupRef.current;
        if (!g) return;
        const t = state.clock.elapsedTime;
        g.position.set(
            position[0] + Math.cos(t * 0.4 + position[2]) * 0.2,
            position[1] + Math.sin(t * 0.7 + position[0]) * 0.4,
            position[2]
        );
        if (meshRef.current) {
            const pulse = 1 + Math.sin(t * 5) * (hovered ? 0.3 : 0.08);
            meshRef.current.scale.setScalar(pulse);
        }
    });

    useCenterHover(meshRef, setHovered);

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1.2, 1]} />
                <meshBasicMaterial color={hovered ? '#39FF14' : '#0a4a20'} wireframe />
                {hovered && <NodeLabel nombre={nombre} />}
            </mesh>
        </group>
    );
}

// ─── GENERIC NODE ─────────────────────────────────────────────────────────────
function GenericNode({ position, nombre, tipo }) {
    const groupRef = useRef();
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    useEffect(() => { if (meshRef.current) meshRef.current.userData.hoverable = true; }, []);

    useBillboard(groupRef);
    useFloat(groupRef, position, 1.1);
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
        <Html center position={[0, -2.4, 0.1]}>
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
