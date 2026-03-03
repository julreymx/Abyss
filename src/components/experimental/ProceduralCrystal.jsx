import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ProceduralCrystal({ position = [0, 0, 0] }) {
  const meshRef = useRef()
  const materialRef = useRef()

  useFrame((state) => {
    // Safe guard: only update after onBeforeCompile populates the shader
    if (materialRef.current?.userData?.shader) {
      materialRef.current.userData.shader.uniforms.uTime.value = state.clock.elapsedTime
    }
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  const onBeforeCompile = (shader) => {
    // Add the uTime uniform
    shader.uniforms.uTime = { value: 0 }

    // Inject uTime declaration (use unique varying names to avoid Three.js conflicts)
    shader.vertexShader = `
      uniform float uTime;
      varying vec3 vCustomPos;
    ` + shader.vertexShader

    // Displace vertex position using sine wave
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float displacement = sin(position.x * 2.0 + uTime) * cos(position.y * 2.0 + uTime) * sin(position.z * 2.0 + uTime);
      transformed += normal * displacement * 0.3;
      vCustomPos = transformed;
      `
    )

    // Inject into fragment shader for color mixing
    shader.fragmentShader = `
      uniform float uTime;
      varying vec3 vCustomPos;
    ` + shader.fragmentShader

    // Replace final color with psychedelic gradient
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      float mixFactor = (sin(vCustomPos.y * 2.0 + uTime) + 1.0) * 0.5;
      vec3 colorA = vec3(1.0, 0.0, 0.8);
      vec3 colorB = vec3(0.2, 0.0, 1.0);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(colorA, colorB, mixFactor), 0.6);
      `
    )

    // Store shader ref for useFrame access
    materialRef.current.userData.shader = shader
  }

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[1, 4]} />
      <meshPhysicalMaterial
        ref={materialRef}
        roughness={0.1}
        metalness={0.9}
        transmission={0.4}
        thickness={0.5}
        transparent={true}
        onBeforeCompile={onBeforeCompile}
        customProgramCacheKey={() => 'procedural-crystal'}
      />
    </mesh>
  )
}
