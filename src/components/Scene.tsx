import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { LampModel } from './LampModel';
import { LampState } from '../types';

interface SceneProps {
  state: LampState;
}

export const Scene: React.FC<SceneProps> = ({ state }) => {
  return (
    <div className="w-full h-full relative">
      <Canvas shadows camera={{ position: [0, 3, 10], fov: 35 }}>
        <color attach="background" args={['#020202']} />
        <fog attach="fog" args={['#020202', 8, 20]} />
        
        <ambientLight intensity={0.01} />
        
        {/* Main directional light for subtle shadows */}
        <directionalLight
          position={[5, 10, 5]}
          intensity={0.05}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        
        <LampModel state={state} />
        
        {/* Premium Desk Surface */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#050505" roughness={0.7} metalness={0.3} />
        </mesh>

        {/* Subtle grid on desk for digital twin feel */}
        <gridHelper 
          args={[20, 40, '#ffffff', '#ffffff']} 
          position={[0, 0.01, 0]} 
          material-opacity={0.02} 
          material-transparent 
        />
        
        {/* Floor shadow */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.8}
          scale={12}
          blur={3}
          far={4}
          color="#000000"
        />
        
        {/* Environment map for reflections */}
        <Environment preset="city" />
        
        {/* Sparkles for ambient effect when in certain modes */}
        {state.power && (state.mode === 'Relax' || state.mode === 'Ambient') && (
          <Sparkles
            count={80}
            scale={6}
            size={1.5}
            speed={0.2}
            opacity={0.15}
            color={state.color}
            position={[0, 2, 0]}
          />
        )}
        
        <EffectComposer>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.2} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
        
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={4}
          maxDistance={12}
          autoRotate={state.mode === 'Ambient'}
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
};
