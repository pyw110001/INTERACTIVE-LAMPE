import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { LampModel, type LampRenderQuality } from './LampModel';
import { LampState } from '../types';

interface SceneProps {
  state: LampState;
}

interface SceneStatusProps {
  title: string;
  message: string;
}

interface RenderProfile {
  supported: boolean;
  quality: LampRenderQuality;
  dpr: number;
  usePostProcessing: boolean;
  useContactShadows: boolean;
  useEnvironment: boolean;
  enableDirectionalLight: boolean;
  enableShadows: boolean;
  enableHtmlLabels: boolean;
  isTouchDevice: boolean;
}

const DEFAULT_PROFILE: RenderProfile = {
  supported: true,
  quality: 'high',
  dpr: 1,
  usePostProcessing: true,
  useContactShadows: true,
  useEnvironment: true,
  enableDirectionalLight: true,
  enableShadows: true,
  enableHtmlLabels: true,
  isTouchDevice: false,
};

class SceneErrorBoundary extends React.Component<
  React.PropsWithChildren<{ onError: (error: Error) => void }>,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

const SceneStatus: React.FC<SceneStatusProps> = ({ title, message }) => (
  <div className="absolute inset-x-4 bottom-4 z-20 flex justify-center md:inset-0 md:items-center">
    <div className="max-w-sm rounded-3xl border border-white/10 bg-black/55 px-5 py-4 text-center backdrop-blur-md">
      <p className="text-sm font-medium tracking-wide text-white">{title}</p>
      <p className="mt-2 text-xs leading-5 text-white/65">{message}</p>
    </div>
  </div>
);

const LampFallback: React.FC<{ state: LampState }> = ({ state }) => {
  const glowColor = state.power ? state.color : '#5b5b5b';

  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_35%),linear-gradient(180deg,_#111318_0%,_#050505_70%,_#020202_100%)]">
      <div className="absolute inset-0 opacity-40">
        <div
          className="absolute left-1/2 top-[30%] h-44 w-44 -translate-x-1/2 rounded-full blur-3xl"
          style={{ backgroundColor: glowColor }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="relative h-[320px] w-[220px]">
          <div
            className="absolute left-1/2 top-6 h-28 w-28 -translate-x-1/2 rounded-full opacity-85 blur-2xl"
            style={{ backgroundColor: glowColor }}
          />
          <div className="absolute left-1/2 top-10 h-24 w-32 -translate-x-1/2 rounded-[48%_48%_36%_36%] border border-white/15 bg-[#ff8c5a]/90 shadow-[0_22px_40px_rgba(0,0,0,0.35)]" />
          <div className="absolute left-1/2 top-[7.6rem] h-24 w-3 -translate-x-1/2 rounded-full bg-[#9fa7d8]" />
          <div className="absolute left-[43%] top-[10.2rem] h-20 w-3 rotate-[28deg] rounded-full bg-[#9fa7d8]" />
          <div className="absolute left-1/2 top-[13rem] h-16 w-3 -translate-x-1/2 rounded-full bg-[#9fa7d8]" />
          <div className="absolute left-1/2 top-[16.6rem] h-3 w-24 -translate-x-1/2 rounded-full bg-[#d39a77]" />
          <div className="absolute left-1/2 top-[17.6rem] h-8 w-28 -translate-x-1/2 rounded-[999px] bg-[#7b82b8]" />
          <div className="absolute left-1/2 top-[19.2rem] h-4 w-36 -translate-x-1/2 rounded-[999px] bg-[#252525]" />
        </div>
      </div>
    </div>
  );
};

const detectRenderProfile = (): RenderProfile => {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  try {
    const canvas = document.createElement('canvas');
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference: 'default',
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false,
    };

    const gl2 = canvas.getContext('webgl2', contextAttributes);
    const gl =
      (gl2 as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl', contextAttributes) as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl', contextAttributes) as WebGLRenderingContext | null);

    if (!gl) {
      return { ...DEFAULT_PROFILE, supported: false };
    }

    const nav = window.navigator as Navigator & { deviceMemory?: number };
    const coarseQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null;
    const smallViewportQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 900px)') : null;
    const pointerCoarse = coarseQuery?.matches ?? false;
    const smallViewport = smallViewportQuery?.matches ?? false;
    const isTouchDevice =
      pointerCoarse ||
      smallViewport ||
      (nav.maxTouchPoints ?? 0) > 0 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent);

    const deviceMemory = nav.deviceMemory ?? 4;
    const cpuCores = nav.hardwareConcurrency ?? 4;
    const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE) ?? 0);
    const maxRenderbufferSize = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) ?? 0);
    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    const hasHalfFloat =
      isWebGL2 ||
      Boolean(gl.getExtension('OES_texture_half_float')) ||
      Boolean(gl.getExtension('EXT_color_buffer_half_float'));
    const lowPerformance =
      isTouchDevice ||
      deviceMemory <= 4 ||
      cpuCores <= 4 ||
      maxTextureSize < 4096 ||
      maxRenderbufferSize < 4096;

    return {
      supported: true,
      quality: lowPerformance ? 'low' : 'high',
      dpr: Math.min(window.devicePixelRatio || 1, lowPerformance ? 1.5 : 2),
      usePostProcessing: !lowPerformance && isWebGL2 && hasHalfFloat,
      useContactShadows: !lowPerformance,
      useEnvironment: !lowPerformance,
      enableDirectionalLight: !lowPerformance,
      enableShadows: !lowPerformance,
      enableHtmlLabels: !lowPerformance,
      isTouchDevice,
    };
  } catch {
    return { ...DEFAULT_PROFILE, supported: false };
  }
};

export const Scene: React.FC<SceneProps> = ({ state }) => {
  const [renderError, setRenderError] = useState<string | null>(null);
  const [profile, setProfile] = useState<RenderProfile>(() => detectRenderProfile());

  useEffect(() => {
    const updateProfile = () => setProfile(detectRenderProfile());
    updateProfile();

    window.addEventListener('resize', updateProfile);
    window.addEventListener('orientationchange', updateProfile);

    return () => {
      window.removeEventListener('resize', updateProfile);
      window.removeEventListener('orientationchange', updateProfile);
    };
  }, []);

  const camera = useMemo(
    () => ({
      position:
        profile.quality === 'low'
          ? ([-5.4, 3.1, 8.6] as [number, number, number])
          : ([-6, 4, 8] as [number, number, number]),
      fov: profile.quality === 'low' ? 44 : 35,
      far: 1000,
      near: 0.1,
    }),
    [profile.quality],
  );

  const controlsDistance = profile.quality === 'low'
    ? { minDistance: 4.6, maxDistance: 14 }
    : { minDistance: 4, maxDistance: 30 };

  const showFallback = !profile.supported || Boolean(renderError);

  return (
    <div className="scene-shell relative h-full min-h-[320px] w-full">
      {showFallback && <LampFallback state={state} />}

      {!profile.supported && (
        <SceneStatus
          title="当前设备已切换为静态视图"
          message="浏览器没有可用的 WebGL 上下文，已自动显示轻量替代灯体。建议使用 iOS Safari 15+ 或 Android Chrome 100+ 并开启硬件加速。"
        />
      )}

      {profile.supported && renderError && (
        <SceneStatus
          title="3D 场景已降级"
          message={renderError}
        />
      )}

      {profile.supported && !renderError && (
        <SceneErrorBoundary
          onError={() =>
            setRenderError('移动端 GPU 无法稳定初始化当前 3D 配置，已自动切换为静态灯体。可尝试刷新页面或关闭浏览器省电模式。')
          }
        >
          <Canvas
            key={profile.quality}
            className="h-full w-full"
            dpr={profile.dpr}
            shadows={profile.enableShadows}
            fallback={<LampFallback state={state} />}
            gl={{
              alpha: true,
              antialias: !profile.isTouchDevice,
              depth: true,
              failIfMajorPerformanceCaveat: false,
              powerPreference: profile.quality === 'low' ? 'default' : 'high-performance',
              premultipliedAlpha: true,
              preserveDrawingBuffer: false,
              stencil: false,
            }}
            camera={camera}
            onCreated={({ gl }) => {
              gl.setPixelRatio(profile.dpr);

              const canvas = gl.domElement;
              const handleContextLost = (event: Event) => {
                event.preventDefault();
                setRenderError('设备的 WebGL 上下文已丢失，已自动切换为静态灯体。');
              };

              canvas.addEventListener('webglcontextlost', handleContextLost, { once: true });
            }}
          >
            <color attach="background" args={['#020202']} />
            <fog attach="fog" args={['#020202', 8, profile.quality === 'low' ? 28 : 40]} />

            <ambientLight intensity={profile.quality === 'low' ? 0.8 : 0.18} />

            {profile.enableDirectionalLight && (
              <directionalLight
                position={[5, 10, 5]}
                intensity={0.22}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-0.00015}
              />
            )}

            <LampModel
              state={state}
              quality={profile.quality}
              enableHtmlLabels={profile.enableHtmlLabels}
              enableSpotlightShadow={profile.enableShadows}
            />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow={profile.enableShadows}>
              <planeGeometry args={[36, 36]} />
              <meshStandardMaterial color="#050505" roughness={0.78} metalness={0.18} />
            </mesh>

            {profile.quality === 'high' && (
              <gridHelper
                args={[20, 40, '#ffffff', '#ffffff']}
                position={[0, 0.01, 0]}
                material-opacity={0.02}
                material-transparent
              />
            )}

            {profile.useContactShadows && (
              <ContactShadows
                position={[0, 0, 0]}
                opacity={0.75}
                scale={12}
                blur={2.6}
                far={4}
                color="#000000"
              />
            )}

            {profile.useEnvironment && (
              <hemisphereLight
                color="#d8dcff"
                groundColor="#1f1b16"
                intensity={0.35}
              />
            )}

            {state.power && (state.mode === 'Relax' || state.mode === 'Ambient') && (
              <Sparkles
                count={profile.quality === 'low' ? 20 : 56}
                scale={5}
                size={profile.quality === 'low' ? 0.8 : 1.2}
                speed={0.18}
                opacity={0.12}
                color={state.color}
                position={[0, 2, 0]}
              />
            )}

            {profile.usePostProcessing && (
              <EffectComposer multisampling={0}>
                <Bloom luminanceThreshold={1.1} intensity={0.85} mipmapBlur />
                <Vignette eskil={false} offset={0.14} darkness={0.95} />
              </EffectComposer>
            )}

            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.05}
              enablePan={false}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 2 - 0.05}
              minDistance={controlsDistance.minDistance}
              maxDistance={controlsDistance.maxDistance}
              autoRotate={state.mode === 'Ambient' && profile.quality === 'high'}
              autoRotateSpeed={0.3}
              target={[0, 1, 0]}
            />
          </Canvas>
        </SceneErrorBoundary>
      )}
    </div>
  );
};
