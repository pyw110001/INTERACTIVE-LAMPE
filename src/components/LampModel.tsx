import React, { useRef, useMemo } from 'react';
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
  
  const groupRef = useRef<THREE.Group>(null);

  const targetColor = useMemo(() => {
    if (!state.power) return new THREE.Color(0x050505);
    return getLampColor(state.colorTemp, state.color, state.mode);
  }, [state.power, state.colorTemp, state.color, state.mode]);

  const spotLightTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    return obj;
  }, []);

  const wireCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.5, 0.05, 0),
      new THREE.Vector3(-2.5, 0.05, 0.5),
      new THREE.Vector3(-4, 0.05, -0.2),
      new THREE.Vector3(-6, 0.05, 0),
    ]);
  }, []);

  useFrame((rootState, delta) => {
    const time = rootState.clock.elapsedTime;
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

    // Clamp lerpFactor to prevent NaN explosions when delta is large (e.g., tab switching)
    const lerpFactor = Math.min(state.transitioning ? 3 * delta : 15 * delta, 1);

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

    // 2. Update Emissive Core (The actual lightbulb)
    if (coreMaterialRef.current) {
      coreMaterialRef.current.emissive.lerp(currentTargetColor, lerpFactor);
      
      let emissiveMult = 10;
      if (state.mode === 'Relax') emissiveMult = 20; // More intense bloom for neon

      coreMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        coreMaterialRef.current.emissiveIntensity,
        state.power ? (currentBrightness / 100) * emissiveMult : 0,
        lerpFactor
      );
    }

    // 3. Gentle floating animation for the whole lamp to make it feel alive
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 2) * 0.02; // Offset to center vertically
    }
  });

  // Colors extracted from the provided image
  const bodyColor = "#7b82b8"; // Soft periwinkle/blue
  const shadeColor = "#ff8c5a"; // Soft orange/peach
  const darkColor = "#222222"; // Dark gray for accents
  const jointColor = "#e09f7d"; // Copper/orange for joints

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Wire */}
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[wireCurve, 64, 0.06, 16, false]} />
        <meshStandardMaterial color={darkColor} roughness={0.8} />
      </mesh>

      {/* --- LAMP STRUCTURE --- */}
      
      {/* 1. Base */}
      <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.6, 1.6, 0.1, 64]} />
        <meshStandardMaterial color={darkColor} roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.6, 0.3, 64]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Base Joint */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 32]} />
        <meshStandardMaterial color={darkColor} roughness={0.8} />
      </mesh>

      {/* Lower Arm Group */}
      <group position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 6]}>
        {/* Lower Arm */}
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.15, 2.4, 32]} />
          <meshStandardMaterial color={bodyColor} roughness={0.6} />
        </mesh>

        {/* Middle Joint Group */}
        <group position={[0, 2.4, 0]}>
          {/* Joint Outer */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.4, 32]} />
            <meshStandardMaterial color={bodyColor} roughness={0.6} />
          </mesh>
          {/* Joint Inner */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.45, 32]} />
            <meshStandardMaterial color={jointColor} roughness={0.4} />
          </mesh>

          {/* Upper Arm Group */}
          <group rotation={[0, 0, -Math.PI / 2]}>
            {/* Upper Arm */}
            <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.15, 0.15, 2.4, 32]} />
              <meshStandardMaterial color={bodyColor} roughness={0.6} />
            </mesh>

            {/* Upper Joint Group */}
            <group position={[0, 2.4, 0]}>
              {/* Joint Outer */}
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.35, 0.35, 0.4, 32]} />
                <meshStandardMaterial color={bodyColor} roughness={0.6} />
              </mesh>
              {/* Joint Inner */}
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.15, 0.15, 0.45, 32]} />
                <meshStandardMaterial color={jointColor} roughness={0.4} />
              </mesh>

              {/* Head Group */}
              <group rotation={[0, 0, Math.PI / 1.8]}>
                {/* Head Base */}
                <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.5, 0.6, 1, 32]} />
                  <meshStandardMaterial color={bodyColor} roughness={0.6} />
                </mesh>
                
                {/* Top Button Base */}
                <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.2, 0.2, 0.1, 32]} />
                  <meshStandardMaterial color={darkColor} roughness={0.8} />
                </mesh>
                
                {/* Top Button */}
                <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
                  <meshStandardMaterial color={shadeColor} roughness={0.6} />
                </mesh>

                {/* Lampshade */}
                <mesh position={[0, -0.9, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.6, 1.6, 1.2, 32, 1, true]} />
                  <meshStandardMaterial color={shadeColor} roughness={0.6} side={THREE.DoubleSide} />
                </mesh>
                {/* Lampshade Bottom Rim for thickness */}
                <mesh position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
                  <torusGeometry args={[1.6, 0.04, 16, 64]} />
                  <meshStandardMaterial color={shadeColor} roughness={0.6} />
                </mesh>

                {/* Lightbulb (Emissive Core) */}
                <mesh position={[0, -1.0, 0]}>
                  <sphereGeometry args={[0.35, 32, 32]} />
                  <meshStandardMaterial
                    ref={coreMaterialRef}
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={0}
                    toneMapped={false}
                  />
                </mesh>

                {/* Internal Point Light */}
                <pointLight
                  ref={lightRef}
                  position={[0, -1.0, 0]}
                  distance={15}
                  decay={2}
                />
                
                {/* Downward Spotlight */}
                <primitive object={spotLightTarget} position={[0, -5, 0]} />
                <spotLight
                  ref={spotLightRef}
                  position={[0, -1.0, 0]}
                  target={spotLightTarget}
                  angle={Math.PI / 3}
                  penumbra={0.5}
                  distance={25}
                  decay={2}
                  castShadow
                  shadow-mapSize={[2048, 2048]}
                  shadow-bias={-0.0001}
                />

                {/* --- DIGITAL TWIN UI LABELS --- */}
                <Html position={[2, -1, 0]} className="pointer-events-none transition-opacity duration-500" style={{ opacity: state.power ? 1 : 0.3 }}>
                  <div className="flex items-center gap-4 transform translate-x-2">
                    <div className="w-12 h-[1px] bg-white/30 relative">
                      <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-white/50" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-white/40 uppercase text-[9px] tracking-[0.2em] font-mono">Lightbulb Core</div>
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

              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
