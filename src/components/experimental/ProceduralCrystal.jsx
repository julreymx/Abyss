import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function ProceduralCrystal({ position = [0, 0, 0] }) {
    const meshRef = useRef()
    const materialRef = useRef()

    useFrame((state) => {
        if (materialRef.current?.userData?.shader) {
            materialRef.current.userData.shader.uniforms.uTime.value = state.clock.elapsedTime
        }
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.2
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
        }
    })

    const onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 }
        shader.vertexShader = `
      uniform float uTime;
      varying vec3 vCustomPos;
    ` + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
      float d = sin(position.x*2.0+uTime)*cos(position.y*2.0+uTime)*sin(position.z*2.0+uTime);
      transformed += normal * d * 0.3;
      vCustomPos = transformed;`
        )
        shader.fragmentShader = `
      uniform float uTime;
      varying vec3 vCustomPos;
    ` + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
      float mx = (sin(vCustomPos.y*2.0+uTime)+1.0)*0.5;
      vec3 cA = vec3(1.0,0.0,0.8), cB = vec3(0.2,0.0,1.0);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(cA,cB,mx), 0.6);`
        )
        materialRef.current.userData.shader = shader
    }

    return (
        <mesh ref={meshRef} position={position}>
            <icosahedronGeometry args={[1, 4]} />
            <meshPhysicalMaterial
                ref={materialRef}
                roughness={0.1} metalness={0.9} transmission={0.4} thickness={0.5} transparent
                onBeforeCompile={onBeforeCompile}
                customProgramCacheKey={() => 'procedural-crystal'}
            />
        </mesh>
    )
}
