import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { LampState } from '../types';
import { getLampColor } from '../utils/colorUtils';

export type LampRenderQuality = 'low' | 'high';

interface LampModelProps {
  state: LampState;
  quality?: LampRenderQuality;
  enableHtmlLabels?: boolean;
  enableSpotlightShadow?: boolean;
}

export const LampModel: React.FC<LampModelProps> = ({
  state,
  quality = 'high',
  enableHtmlLabels = true,
  enableSpotlightShadow = true,
}) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const coreMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const targetColor = useMemo(() => {
    if (!state.power) return new THREE.Color(0x050505);
    return getLampColor(state.colorTemp, state.color, state.mode);
  }, [state.power, state.colorTemp, state.color, state.mode]);

  const spotLightTarget = useMemo(() => new THREE.Object3D(), []);

  const geometry = useMemo(
    () =>
      quality === 'low'
        ? {
            tubeSegments: 24,
            tubeRadialSegments: 8,
            baseSegments: 18,
            armSegments: 14,
            jointSegments: 14,
            rimTubularSegments: 24,
            rimRadialSegments: 8,
            bulbWidthSegments: 16,
            bulbHeightSegments: 16,
          }
        : {
            tubeSegments: 64,
            tubeRadialSegments: 16,
            baseSegments: 64,
            armSegments: 32,
            jointSegments: 32,
            rimTubularSegments: 64,
            rimRadialSegments: 16,
            bulbWidthSegments: 32,
            bulbHeightSegments: 32,
          },
    [quality],
  );

  const spotConfig = useMemo(
    () => ({
      angle: Math.PI / 3,
      penumbra: quality === 'low' ? 0.35 : 0.5,
      distance: quality === 'low' ? 16 : 25,
      shadowMapSize: quality === 'low' ? 512 : 1024,
    }),
    [quality],
  );

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
    const currentTargetColor = targetColor.clone();
    let currentBrightness = state.brightness;

    if (state.power && state.mode === 'Relax') {
      const hue = (time * 0.5) % 1;
      currentTargetColor.setHSL(hue, 1, 0.5);
      currentBrightness = 100;
    }

    if (state.power && state.mode === 'Sleep') {
      const breath = (Math.sin(time * 2) + 1) / 2;
      currentBrightness = state.brightness * (0.2 + 0.8 * breath);
    }

    const lerpFactor = Math.min(state.transitioning ? 3 * delta : 15 * delta, 1);
    const pointLightMax = quality === 'low' ? 2.4 : 4;
    const spotLightMax = quality === 'low' ? 8 : 20;

    if (lightRef.current) {
      lightRef.current.color.lerp(currentTargetColor, lerpFactor);
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        state.power ? (currentBrightness / 100) * pointLightMax : 0,
        lerpFactor,
      );
    }

    if (spotLightRef.current) {
      spotLightRef.current.color.lerp(currentTargetColor, lerpFactor);
      spotLightRef.current.intensity = THREE.MathUtils.lerp(
        spotLightRef.current.intensity,
        state.power ? (currentBrightness / 100) * spotLightMax : 0,
        lerpFactor,
      );
    }

    if (coreMaterialRef.current) {
      coreMaterialRef.current.emissive.lerp(currentTargetColor, lerpFactor);

      let emissiveMult = quality === 'low' ? 6 : 10;
      if (state.mode === 'Relax') emissiveMult = quality === 'low' ? 10 : 20;

      coreMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        coreMaterialRef.current.emissiveIntensity,
        state.power ? (currentBrightness / 100) * emissiveMult : 0,
        lerpFactor,
      );
    }

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 2) * 0.02;
    }
  });

  const bodyColor = '#7b82b8';
  const shadeColor = '#ff8c5a';
  const darkColor = '#222222';
  const jointColor = '#e09f7d';
  const meshShadow = quality === 'high';

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh castShadow={meshShadow} receiveShadow={meshShadow}>
        <tubeGeometry args={[wireCurve, geometry.tubeSegments, 0.06, geometry.tubeRadialSegments, false]} />
        <meshStandardMaterial color={darkColor} roughness={0.8} />
      </mesh>

      <mesh position={[0, 0.05, 0]} receiveShadow={meshShadow} castShadow={meshShadow}>
        <cylinderGeometry args={[1.6, 1.6, 0.1, geometry.baseSegments]} />
        <meshStandardMaterial color={darkColor} roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.25, 0]} receiveShadow={meshShadow} castShadow={meshShadow}>
        <cylinderGeometry args={[1.5, 1.6, 0.3, geometry.baseSegments]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.1} />
      </mesh>

      <mesh position={[0, 0.5, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, geometry.armSegments]} />
        <meshStandardMaterial color={darkColor} roughness={0.8} />
      </mesh>

      <group position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 6]}>
        <mesh position={[0, 1.2, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
          <cylinderGeometry args={[0.15, 0.15, 2.4, geometry.armSegments]} />
          <meshStandardMaterial color={bodyColor} roughness={0.6} />
        </mesh>

        <group position={[0, 2.4, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
            <cylinderGeometry args={[0.35, 0.35, 0.4, geometry.jointSegments]} />
            <meshStandardMaterial color={bodyColor} roughness={0.6} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
            <cylinderGeometry args={[0.15, 0.15, 0.45, geometry.jointSegments]} />
            <meshStandardMaterial color={jointColor} roughness={0.4} />
          </mesh>

          <group rotation={[0, 0, -Math.PI / 2]}>
            <mesh position={[0, 1.2, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
              <cylinderGeometry args={[0.15, 0.15, 2.4, geometry.armSegments]} />
              <meshStandardMaterial color={bodyColor} roughness={0.6} />
            </mesh>

            <group position={[0, 2.4, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
                <cylinderGeometry args={[0.35, 0.35, 0.4, geometry.jointSegments]} />
                <meshStandardMaterial color={bodyColor} roughness={0.6} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
                <cylinderGeometry args={[0.15, 0.15, 0.45, geometry.jointSegments]} />
                <meshStandardMaterial color={jointColor} roughness={0.4} />
              </mesh>

              <group rotation={[0, 0, Math.PI / 1.8]}>
                <mesh position={[0, 0.2, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
                  <cylinderGeometry args={[0.5, 0.6, 1, geometry.armSegments]} />
                  <meshStandardMaterial color={bodyColor} roughness={0.6} />
                </mesh>

                <mesh position={[0, 0.75, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
                  <cylinderGeometry args={[0.2, 0.2, 0.1, geometry.armSegments]} />
                  <meshStandardMaterial color={darkColor} roughness={0.8} />
                </mesh>

                <mesh position={[0, 0.85, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
                  <cylinderGeometry args={[0.15, 0.15, 0.1, geometry.armSegments]} />
                  <meshStandardMaterial color={shadeColor} roughness={0.6} />
                </mesh>

                <mesh position={[0, -0.9, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
                  <cylinderGeometry args={[0.6, 1.6, 1.2, geometry.armSegments, 1, true]} />
                  <meshStandardMaterial color={shadeColor} roughness={0.6} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={meshShadow} receiveShadow={meshShadow}>
                  <torusGeometry args={[1.6, 0.04, geometry.rimRadialSegments, geometry.rimTubularSegments]} />
                  <meshStandardMaterial color={shadeColor} roughness={0.6} />
                </mesh>

                <mesh position={[0, -1.0, 0]}>
                  <sphereGeometry args={[0.35, geometry.bulbWidthSegments, geometry.bulbHeightSegments]} />
                  <meshStandardMaterial
                    ref={coreMaterialRef}
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={0}
                    toneMapped={false}
                  />
                </mesh>

                <pointLight
                  ref={lightRef}
                  position={[0, -1.0, 0]}
                  distance={quality === 'low' ? 10 : 15}
                  decay={2}
                />

                <primitive object={spotLightTarget} position={[0, -5, 0]} />
                <spotLight
                  ref={spotLightRef}
                  position={[0, -1.0, 0]}
                  target={spotLightTarget}
                  angle={spotConfig.angle}
                  penumbra={spotConfig.penumbra}
                  distance={spotConfig.distance}
                  decay={2}
                  castShadow={enableSpotlightShadow && meshShadow}
                  shadow-mapSize={[spotConfig.shadowMapSize, spotConfig.shadowMapSize]}
                  shadow-bias={-0.00015}
                />

                {enableHtmlLabels && (
                  <Html position={[2, -1, 0]} className="pointer-events-none transition-opacity duration-500" style={{ opacity: state.power ? 1 : 0.3 }}>
                    <div className="flex translate-x-2 items-center gap-4">
                      <div className="relative h-[1px] w-12 bg-white/30">
                        <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-white/50" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Lightbulb Core</div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: state.power ? state.color : '#333', color: state.power ? state.color : '#333' }} />
                          <span className="text-[11px] font-medium tracking-wide text-white/90">{state.power ? 'ACTIVE' : 'STANDBY'}</span>
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-white/50">
                          {state.brightness}% / {state.mode === 'Ambient' || state.mode === 'Relax' ? 'RGB' : `${state.colorTemp}K`}
                        </div>
                      </div>
                    </div>
                  </Html>
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
