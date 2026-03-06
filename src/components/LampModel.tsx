import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { LampState } from '../types';
import { getLampColor } from '../utils/colorUtils';

interface LampModelProps {
  state: LampState;
}

export const LampModel: React.FC<LampModelProps> = ({ state }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const coreMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const shellMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  
  const groupRef = useRef<THREE.Group>(null);
  const shellGroupRef = useRef<THREE.Group>(null);

  // Shell transition state
  const [displayShell, setDisplayShell] = useState(state.shellVersion);
  const targetScale = useRef(1);

  useEffect(() => {
    if (displayShell !== state.shellVersion) {
      targetScale.current = 0.001; // Scale down
      const timer = setTimeout(() => {
        setDisplayShell(state.shellVersion);
        targetScale.current = 1; // Scale back up
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.shellVersion, displayShell]);

  const targetColor = useMemo(() => {
    if (!state.power) return new THREE.Color(0x050505);
    return getLampColor(state.colorTemp, state.color, state.mode);
  }, [state.power, state.colorTemp, state.color, state.mode]);

  const spotLightTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 0);
    return obj;
  }, []);

  useFrame((_, delta) => {
    const time = Date.now() * 0.001;
    let currentTargetColor = targetColor.clone();
    let currentBrightness = state.brightness;

    // RELAX mode: Neon effect (intense, fast changing colors)
    if (state.power && state.mode === 'Relax') {
      const hue = (time * 0.5) % 1; // Cycle through hues
      currentTargetColor.setHSL(hue, 1, 0.5);
      currentBrightness = 100; // Intense
    }

    // SLEEP mode: Breathing effect
    if (state.power && state.mode === 'Sleep') {
      // Breathing sine wave between 20% and 100% of set brightness
      const breath = (Math.sin(time * 2) + 1) / 2; // 0 to 1
      currentBrightness = state.brightness * (0.2 + 0.8 * breath);
    }

    const lerpFactor = state.transitioning ? 3 * delta : 15 * delta;

    // 1. Update Lights
    if (lightRef.current) {
      lightRef.current.color.lerp(currentTargetColor, lerpFactor);
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        state.power ? (currentBrightness / 100) * 4 : 0,
        lerpFactor
      );
    }

    if (spotLightRef.current) {
      spotLightRef.current.color.lerp(currentTargetColor, lerpFactor);
      spotLightRef.current.intensity = THREE.MathUtils.lerp(
        spotLightRef.current.intensity,
        state.power ? (currentBrightness / 100) * 20 : 0,
        lerpFactor
      );
    }

    // 2. Update Emissive Core (The actual lightbulb/LED matrix)
    if (coreMaterialRef.current) {
      coreMaterialRef.current.emissive.lerp(currentTargetColor, lerpFactor);
      
      let emissiveMult = 8;
      if (state.mode === 'Relax') emissiveMult = 15; // More intense bloom for neon

      coreMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        coreMaterialRef.current.emissiveIntensity,
        state.power ? (currentBrightness / 100) * emissiveMult : 0,
        lerpFactor
      );
    }

    // 3. Update Shell Material (receives light and glows slightly)
    if (shellMaterialRef.current) {
      shellMaterialRef.current.emissive.lerp(currentTargetColor, lerpFactor);
      shellMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        shellMaterialRef.current.emissiveIntensity,
        state.power ? (currentBrightness / 100) * 0.5 : 0,
        lerpFactor
      );
    }

    // 4. Shell Scale Animation
    if (shellGroupRef.current) {
      shellGroupRef.current.scale.lerp(
        new THREE.Vector3(targetScale.current, targetScale.current, targetScale.current),
        15 * delta
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* --- LAMP STRUCTURE --- */}
      
      {/* 1. Base */}
      {/* Wide beveled base */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.8, 0.2, 64]} />
        <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* Top part of the base */}
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 64]} />
        <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* 2. Light Core (Pillar) */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 1.2, 32]} />
        <meshStandardMaterial
          ref={coreMaterialRef}
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0}
          toneMapped={false} // Crucial for bloom
        />
      </mesh>

      {/* 3. Replaceable Shell (Organic Soft Dome) */}
      <group ref={shellGroupRef} position={[0, 0.3, 0]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[1.2, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            ref={shellMaterialRef as any}
            color="#ffffff"
            roughness={0.1}
            metalness={0.1}
            transparent
            opacity={0.85}
            clearcoat={1}
            clearcoatRoughness={0.1}
            transmission={0.5} // Glass-like
            thickness={0.5}
          />
        </mesh>
        {/* Top Cap */}
        <mesh position={[0, 1.2 + 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.3, 32]} />
          <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.8} />
        </mesh>
      </group>

      {/* Internal Point Light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.9, 0]}
        distance={8}
        decay={2}
      />
      
      {/* Downward Spotlight */}
      <primitive object={spotLightTarget} position={[0, -5, 0]} />
      <spotLight
        ref={spotLightRef}
        position={[0, 0.9, 0]}
        target={spotLightTarget}
        angle={Math.PI / 2.5}
        penumbra={0.8}
        distance={15}
        decay={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />

      {/* --- DIGITAL TWIN UI LABELS --- */}
      <Html position={[1.5, 1.5, 0]} className="pointer-events-none transition-opacity duration-500" style={{ opacity: state.power ? 1 : 0.3 }}>
        <div className="flex items-center gap-4 transform translate-x-2">
          <div className="w-12 h-[1px] bg-white/30 relative">
            <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-white/50" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-white/40 uppercase text-[9px] tracking-[0.2em] font-mono">Light Core</div>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: state.power ? state.color : '#333', color: state.power ? state.color : '#333' }} />
               <span className="text-[11px] font-medium text-white/90 tracking-wide">{state.power ? 'ACTIVE' : 'STANDBY'}</span>
            </div>
            <div className="text-[10px] text-white/50 font-mono mt-0.5">
              {state.brightness}% / {state.mode === 'Ambient' || state.mode === 'Relax' ? 'RGB' : `${state.colorTemp}K`}
            </div>
          </div>
        </div>
      </Html>

      <Html position={[-1.5, 1.5, 0]} className="pointer-events-none">
        <div className="flex items-center gap-4 transform -translate-x-full">
          <div className="flex flex-col gap-1 items-end text-right">
            <div className="text-white/40 uppercase text-[9px] tracking-[0.2em] font-mono">Shell Module</div>
            <div className="text-[11px] font-medium text-white/90 tracking-wide">{state.shellVersion}</div>
            <div className="text-[9px] text-emerald-400/80 font-mono mt-0.5 flex items-center gap-1.5">
              Mounted
              <span className="w-1 h-1 rounded-full bg-emerald-400/80 animate-pulse" />
            </div>
          </div>
          <div className="w-12 h-[1px] bg-white/30 relative">
            <div className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-white/50" />
          </div>
        </div>
      </Html>

    </group>
  );
};
