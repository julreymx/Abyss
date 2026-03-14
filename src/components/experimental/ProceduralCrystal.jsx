import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Blob individual con personalidad única ────────────────────────────────
function BlobCrystal({ position, color, size, deformFreq, deformAmp, pulseSpeed, pulseAmp, rotSpeedX, rotSpeedY }) {
    const meshRef = useRef()
    const matRef = useRef()
    const cKey = useMemo(() => `blob-${color}-${deformFreq}`, [color, deformFreq])

    const onBeforeCompile = useMemo(() => (shader) => {
        shader.uniforms.uTime     = { value: 0 }
        shader.uniforms.uDeformF  = { value: deformFreq }
        shader.uniforms.uDeformA  = { value: deformAmp }
        shader.uniforms.uBlobColor = { value: new THREE.Color(color) }

        shader.vertexShader = `
            uniform float uTime; uniform float uDeformF; uniform float uDeformA;
            varying vec3 vPos;
        ` + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            float d = sin(position.x*uDeformF+uTime*1.1)*cos(position.y*uDeformF+uTime*0.8)*sin(position.z*uDeformF+uTime*1.5);
            transformed += normal * d * uDeformA;
            vPos = transformed;`
        )

        shader.fragmentShader = `
            uniform float uTime; uniform vec3 uBlobColor;
            varying vec3 vPos;
        ` + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
            float mx = (sin(vPos.y * 2.0 + uTime * 0.6) + 1.0) * 0.5;
            // Sobrescribir completamente con el color sólido del blob
            gl_FragColor.rgb = mix(uBlobColor, uBlobColor * 1.8, mx * 0.5);`
        )
        matRef.current.userData.shader = shader
    }, [color, deformFreq, deformAmp])

    useFrame((state) => {
        if (matRef.current?.userData?.shader) {
            matRef.current.userData.shader.uniforms.uTime.value = state.clock.elapsedTime
        }
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * rotSpeedX
            meshRef.current.rotation.y = state.clock.elapsedTime * rotSpeedY
            const pulse = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * pulseAmp
            meshRef.current.scale.setScalar(pulse)
        }
    })

    return (
        <mesh ref={meshRef} position={position}>
            <icosahedronGeometry args={[size, 3]} />
            <meshStandardMaterial
                ref={matRef}
                roughness={0.3}
                metalness={0.1}
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                onBeforeCompile={onBeforeCompile}
                customProgramCacheKey={() => cKey}
            />
        </mesh>
    )
}

// ─── Par de blobs que orbitan un centro comm ████───────────────────────────
export function BlobPair({ center, orbitRadius, orbitPhase, floatSpeed, floatAmp, redParams, blueParams }) {
    const groupRef = useRef()

    useFrame((state) => {
        if (!groupRef.current) return
        const t = state.clock.elapsedTime
        groupRef.current.position.set(
            center[0] + Math.cos(t * floatSpeed * 0.4 + orbitPhase) * floatAmp * 1.1,
            center[1] + Math.sin(t * floatSpeed * 0.6 + orbitPhase * 1.3) * floatAmp,
            center[2] + Math.sin(t * floatSpeed * 0.3 + orbitPhase * 0.7) * floatAmp * 0.5
        )
    })

    const redOff  = [ Math.cos(orbitPhase) * orbitRadius, Math.sin(orbitPhase * 0.7) * orbitRadius * 0.4, Math.sin(orbitPhase) * orbitRadius * 0.3 ]
    const blueOff = [-redOff[0], -redOff[1] * 0.9, -redOff[2] * 0.8]

    return (
        <group ref={groupRef}>
            <BlobCrystal position={redOff}  color="#cc1a1a" {...redParams}  />
            <BlobCrystal position={blueOff} color="#1a44cc" {...blueParams} />
        </group>
    )
}

export default function ProceduralCrystal({ position = [0, 0, 0] }) {
    return (
        <BlobPair
            center={position} orbitRadius={1.8} orbitPhase={position[0] * 0.7 + position[1] * 0.3}
            floatSpeed={0.4}  floatAmp={0.8}
            redParams ={{ size: 0.50, deformFreq: 2.1, deformAmp: 0.28, pulseSpeed: 1.8, pulseAmp: 0.12, rotSpeedX: 0.18, rotSpeedY: 0.27 }}
            blueParams={{ size: 0.38, deformFreq: 2.8, deformAmp: 0.20, pulseSpeed: 2.4, pulseAmp: 0.09, rotSpeedX: 0.25, rotSpeedY: 0.15 }}
        />
    )
}
