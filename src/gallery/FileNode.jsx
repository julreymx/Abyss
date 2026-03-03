import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, useVideoTexture, Html } from '@react-three/drei';
import * as THREE from 'three';

export default function FileNode({ file }) {
    const { tipo, url, nombre, posicion_x, posicion_y, posicion_z } = file;
    const position = [posicion_x, posicion_y, posicion_z];
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.2;
            meshRef.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.005;
        }
    });

    const isImage = tipo.startsWith('image/');
    const isVideo = tipo.startsWith('video/');
    const isAudio = tipo.startsWith('audio/');

    if (isImage) {
        return <ImageNode url={url} position={position} meshRef={meshRef} hovered={hovered} setHovered={setHovered} nombre={nombre} />;
    } else if (isVideo) {
        return <VideoNode url={url} position={position} meshRef={meshRef} hovered={hovered} setHovered={setHovered} nombre={nombre} />;
    } else if (isAudio) {
        return <AudioNode position={position} meshRef={meshRef} hovered={hovered} setHovered={setHovered} nombre={nombre} />;
    } else {
        return <GenericNode position={position} meshRef={meshRef} hovered={hovered} setHovered={setHovered} nombre={nombre} tipo={tipo} />;
    }
}

function ImageNode({ url, position, meshRef, hovered, setHovered, nombre }) {
    const texture = useTexture(url);
    return (
        <mesh ref={meshRef} position={position} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <planeGeometry args={[3, 3]} />
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} color={hovered ? '#ffffff' : '#aaaaaa'} />
            {hovered && <NodeLabel nombre={nombre} />}
        </mesh>
    );
}

function VideoNode({ url, position, meshRef, hovered, setHovered, nombre }) {
    const texture = useVideoTexture(url, { muted: true, loop: true, start: true, crossOrigin: "Anonymous" });
    return (
        <mesh ref={meshRef} position={position} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <planeGeometry args={[4, 2.25]} />
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} color={hovered ? '#ffffff' : '#aaaaaa'} />
            {hovered && <NodeLabel nombre={nombre} />}
        </mesh>
    );
}

function AudioNode({ position, meshRef, hovered, setHovered, nombre }) {
    useFrame((state) => {
        if (meshRef.current) {
            const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
            meshRef.current.scale.set(scale, scale, scale);
        }
    });
    return (
        <mesh ref={meshRef} position={position} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color={hovered ? '#39FF14' : '#0a2912'} wireframe />
            {hovered && <NodeLabel nombre={nombre} />}
        </mesh>
    );
}

function GenericNode({ position, meshRef, hovered, setHovered, nombre, tipo }) {
    return (
        <mesh ref={meshRef} position={position} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            <boxGeometry args={[1.5, 2, 0.1]} />
            <meshBasicMaterial color={hovered ? '#39FF14' : '#555555'} wireframe />
            {hovered && <NodeLabel nombre={nombre} extra={tipo} />}
        </mesh>
    );
}

function NodeLabel({ nombre, extra }) {
    return (
        <Html center position={[0, -2, 0]}>
            <div style={{ color: '#39FF14', background: 'rgba(0,0,0,0.8)', padding: '4px 8px', border: '1px solid #39FF14', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                {nombre} {extra ? `(${extra})` : ''}
            </div>
        </Html>
    );
}
