import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LampState } from '../types';
import { getLampColor } from '../utils/colorUtils';

export type LampRenderQuality = 'low' | 'high';
type BeamProfile = {
  color: THREE.Color;
  brightnessScale: number;
  pointMax: number;
  spotMax: number;
  emissiveMult: number;
  spotAngle: number;
  spotPenumbra: number;
  spotDistance: number;
  pointDistance: number;
  pulseDepth: number;
  pulseSpeed: number;
};

interface LampModelProps {
  state: LampState;
  quality?: LampRenderQuality;
  enableHtmlLabels?: boolean;
  enableSpotlightShadow?: boolean;
}

const MODEL_URL = '/models/base.glb';
const MODEL_SCALE = 2.25;
const LIGHT_POSITION: [number, number, number] = [0, 3.22, 0.08];
const SPOT_TARGET_POSITION: [number, number, number] = [0, 0.15, 0.25];

function enhanceLampMaterial(material: THREE.Material) {
  if (!(material instanceof THREE.MeshStandardMaterial)) {
    return material;
  }

  const enhanced = material.clone();
  enhanced.envMapIntensity = enhanced.map ? 1.15 : 0.85;

  if (!enhanced.map) {
    enhanced.color.set('#9fb0b5');
    enhanced.roughness = 0.62;
    enhanced.metalness = 0.08;
  }

  enhanced.needsUpdate = true;

  return enhanced;
}

function cloneModelScene(scene: THREE.Group, meshShadow: boolean) {
  const clone = scene.clone(true);

  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.castShadow = meshShadow;
    object.receiveShadow = meshShadow;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => enhanceLampMaterial(material))
      : enhanceLampMaterial(object.material);
  });

  return clone;
}

function getModeBeamProfile(state: LampState, quality: LampRenderQuality): BeamProfile {
  const qualityScale = quality === 'low' ? 0.7 : 1;
  const baseColor = getLampColor(state.colorTemp, state.color, state.mode);

  switch (state.mode) {
    case 'Reading':
      return {
        color: new THREE.Color('#ffd08a'),
        brightnessScale: 1.05,
        pointMax: 3.2 * qualityScale,
        spotMax: 24 * qualityScale,
        emissiveMult: 12 * qualityScale,
        spotAngle: Math.PI / 5.2,
        spotPenumbra: 0.18,
        spotDistance: 18,
        pointDistance: 9,
        pulseDepth: 0,
        pulseSpeed: 1,
      };
    case 'Work':
      return {
        color: new THREE.Color('#cfe8ff'),
        brightnessScale: 1.25,
        pointMax: 4.2 * qualityScale,
        spotMax: 30 * qualityScale,
        emissiveMult: 15 * qualityScale,
        spotAngle: Math.PI / 4.1,
        spotPenumbra: 0.08,
        spotDistance: 21,
        pointDistance: 11,
        pulseDepth: 0,
        pulseSpeed: 1,
      };
    case 'Relax':
      return {
        color: baseColor,
        brightnessScale: 1.15,
        pointMax: 5.4 * qualityScale,
        spotMax: 22 * qualityScale,
        emissiveMult: 24 * qualityScale,
        spotAngle: Math.PI / 3.1,
        spotPenumbra: 0.65,
        spotDistance: 22,
        pointDistance: 15,
        pulseDepth: 0.12,
        pulseSpeed: 1.2,
      };
    case 'Sleep':
      return {
        color: new THREE.Color('#ff8f62'),
        brightnessScale: 0.52,
        pointMax: 2.3 * qualityScale,
        spotMax: 9 * qualityScale,
        emissiveMult: 7 * qualityScale,
        spotAngle: Math.PI / 2.6,
        spotPenumbra: 0.85,
        spotDistance: 14,
        pointDistance: 8,
        pulseDepth: 0.52,
        pulseSpeed: 0.7,
      };
    case 'Ambient':
      return {
        color: baseColor,
        brightnessScale: 0.95,
        pointMax: 5.8 * qualityScale,
        spotMax: 16 * qualityScale,
        emissiveMult: 18 * qualityScale,
        spotAngle: Math.PI / 2.2,
        spotPenumbra: 0.92,
        spotDistance: 24,
        pointDistance: 18,
        pulseDepth: 0.18,
        pulseSpeed: 0.9,
      };
    default:
      return {
        color: baseColor,
        brightnessScale: 1,
        pointMax: 4 * qualityScale,
        spotMax: 20 * qualityScale,
        emissiveMult: 10 * qualityScale,
        spotAngle: Math.PI / 3,
        spotPenumbra: 0.5,
        spotDistance: 25,
        pointDistance: 15,
        pulseDepth: 0,
        pulseSpeed: 1,
      };
  }
}

export const LampModel: React.FC<LampModelProps> = ({
  state,
  quality = 'high',
  enableHtmlLabels = true,
  enableSpotlightShadow = true,
}) => {
  const gltf = useGLTF(MODEL_URL);
  const lightRef = useRef<THREE.PointLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const coreMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const meshShadow = quality === 'high';

  const beamProfile = useMemo(
    () => getModeBeamProfile(state, quality),
    [state.colorTemp, state.color, state.mode, quality],
  );

  const lampScene = useMemo(() => cloneModelScene(gltf.scene, meshShadow), [gltf.scene, meshShadow]);
  const spotLightTarget = useMemo(() => new THREE.Object3D(), []);

  const spotConfig = useMemo(
    () => ({
      angle: Math.PI / 3,
      penumbra: quality === 'low' ? 0.35 : 0.5,
      distance: quality === 'low' ? 16 : 25,
      shadowMapSize: quality === 'low' ? 512 : 1024,
    }),
    [quality],
  );

  useFrame((rootState, delta) => {
    const time = rootState.clock.elapsedTime;
    const currentTargetColor = beamProfile.color.clone();
    let currentBrightness = state.brightness;

    if (state.power && state.mode === 'Relax') {
      const hue = (time * 0.16) % 1;
      currentTargetColor.setHSL(hue, 0.9, 0.58);
      currentBrightness = 100;
    }

    if (state.power && state.mode === 'Ambient') {
      currentTargetColor.offsetHSL(Math.sin(time * 0.45) * 0.04, 0, 0.04);
    }

    const pulse = beamProfile.pulseDepth > 0
      ? 1 - beamProfile.pulseDepth + beamProfile.pulseDepth * ((Math.sin(time * beamProfile.pulseSpeed * Math.PI * 2) + 1) / 2)
      : 1;
    currentBrightness *= beamProfile.brightnessScale * pulse;

    const lerpFactor = Math.min(state.transitioning ? 3 * delta : 15 * delta, 1);
    const brightnessRatio = THREE.MathUtils.clamp(currentBrightness / 100, 0, 1.35);

    if (lightRef.current) {
      lightRef.current.color.lerp(currentTargetColor, lerpFactor);
      lightRef.current.distance = THREE.MathUtils.lerp(lightRef.current.distance, beamProfile.pointDistance, lerpFactor);
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        state.power ? brightnessRatio * beamProfile.pointMax : 0,
        lerpFactor,
      );
    }

    if (spotLightRef.current) {
      spotLightRef.current.color.lerp(currentTargetColor, lerpFactor);
      spotLightRef.current.angle = THREE.MathUtils.lerp(spotLightRef.current.angle, beamProfile.spotAngle, lerpFactor);
      spotLightRef.current.penumbra = THREE.MathUtils.lerp(spotLightRef.current.penumbra, beamProfile.spotPenumbra, lerpFactor);
      spotLightRef.current.distance = THREE.MathUtils.lerp(spotLightRef.current.distance, beamProfile.spotDistance, lerpFactor);
      spotLightRef.current.intensity = THREE.MathUtils.lerp(
        spotLightRef.current.intensity,
        state.power ? brightnessRatio * beamProfile.spotMax : 0,
        lerpFactor,
      );
    }

    if (coreMaterialRef.current) {
      coreMaterialRef.current.emissive.lerp(currentTargetColor, lerpFactor);

      coreMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        coreMaterialRef.current.emissiveIntensity,
        state.power ? brightnessRatio * beamProfile.emissiveMult : 0,
        lerpFactor,
      );
    }

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 2) * 0.015;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={lampScene} scale={MODEL_SCALE} />

      <mesh position={LIGHT_POSITION}>
        <sphereGeometry args={[0.14, quality === 'low' ? 16 : 32, quality === 'low' ? 16 : 32]} />
        <meshStandardMaterial
          ref={coreMaterialRef}
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0}
          transparent
          opacity={0.72}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        position={LIGHT_POSITION}
        distance={quality === 'low' ? 10 : 15}
        decay={2}
      />

      <primitive object={spotLightTarget} position={SPOT_TARGET_POSITION} />
      <spotLight
        ref={spotLightRef}
        position={LIGHT_POSITION}
        target={spotLightTarget}
        angle={beamProfile.spotAngle || spotConfig.angle}
        penumbra={beamProfile.spotPenumbra || spotConfig.penumbra}
        distance={spotConfig.distance}
        decay={2}
        castShadow={enableSpotlightShadow && meshShadow}
        shadow-mapSize={[spotConfig.shadowMapSize, spotConfig.shadowMapSize]}
        shadow-bias={-0.00015}
      />

      {enableHtmlLabels && (
        <Html position={[1.55, 2.55, 0.1]} className="pointer-events-none transition-opacity duration-500" style={{ opacity: state.power ? 1 : 0.3 }}>
          <div className="flex translate-x-2 items-center gap-4">
            <div className="relative h-[1px] w-12 bg-white/30">
              <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-white/50" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Imported GLB Lamp</div>
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
  );
};

useGLTF.preload(MODEL_URL);
