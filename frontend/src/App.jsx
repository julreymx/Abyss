import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import GPUFluidParticles from './components/experimental/GPUFluidParticles'
import ProceduralCrystal from './components/experimental/ProceduralCrystal'
import './App.css'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <color attach="background" args={['#050505']} />

        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ff00cc" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#00ffff" />

        {/* Experimental Components */}
        <GPUFluidParticles count={20000} color="#00ffcc" />
        <ProceduralCrystal position={[0, 0, 0]} />

        <OrbitControls makeDefault />
        <Environment preset="city" />

        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
          <Noise opacity={0.02} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>

      {/* Overlay UI */}
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'monospace', zIndex: 10, pointerEvents: 'none' }}>
        <h1 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>OS_mental</h1>
        <p style={{ margin: 0, color: '#00ffcc' }}>Experimental Build v0.0.1</p>
      </div>
    </div>
  )
}

export default App
