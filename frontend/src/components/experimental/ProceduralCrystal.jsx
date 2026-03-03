import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ProceduralCrystal({ position = [0, 0, 0] }) {
  const meshRef = useRef()
  const materialRef = useRef()

  const uniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#ff00cc') },
    uColorB: { value: new THREE.Color('#3300ff') }
  }

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.userData.shader.uniforms.uTime.value = state.clock.elapsedTime
    }
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  const onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uColorA = uniforms.uColorA
    shader.uniforms.uColorB = uniforms.uColorB

    shader.vertexShader = `
      uniform float uTime;
      varying vec3 vPosition;
      varying vec3 vNormal;
      ${shader.vertexShader}
    `
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>

      // Simple displacement
      float noise = sin(position.x * 2.0 + uTime) * cos(position.y * 2.0 + uTime) * sin(position.z * 2.0 + uTime);
      transformed += normal * noise * 0.3;

      vPosition = transformed;
      vNormal = normal;
      `
    )

    shader.fragmentShader = `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec3 vPosition;
      varying vec3 vNormal;
      ${shader.fragmentShader}
    `

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>

      float mixFactor = (sin(vPosition.y * 2.0 + uTime) + 1.0) * 0.5;
      vec3 finalColor = mix(uColorA, uColorB, mixFactor);

      // Add fresnel effect
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float fresnel = dot(viewDirection, vNormal);
      fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
      fresnel = pow(fresnel, 3.0);

      gl_FragColor = vec4(finalColor + vec3(fresnel * 0.5), 0.9);
      `
    )

    if (materialRef.current) {
      materialRef.current.userData.shader = shader
    }
  }

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[1, 4]} />
      <meshPhysicalMaterial
        ref={materialRef}
        roughness={0.2}
        metalness={0.8}
        transmission={0.5}
        thickness={0.5}
        transparent={true}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}
