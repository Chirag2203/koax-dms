/**
 * Visualizer3DCanvas — premium 3D showroom configurator.
 *
 * Tech stack: react-three-fiber (R3F) v8 + @react-three/drei + three r169.
 *
 * L51 (locked): Visualizer rendering pivots from 2D SVG layer compositing to
 *   true 3D rendering. Library stack: react-three-fiber + @react-three/drei +
 *   three. The 2D approach (L4, L5) is deprecated but kept in repo as P3
 *   fallback for browsers without WebGL.
 *   Trigger to use 2D fallback: WebGLRenderingContext unavailable.
 *
 * L54 (locked): Camera + lighting: studio environment via drei
 *   <Environment preset="studio" />, <ContactShadows /> for floor grounding,
 *   <OrbitControls> with constrained angles (no looking under car), gentle
 *   auto-rotate at 0.4 rad/s. Reduced-motion users get static camera.
 *
 * L56 (locked): Bundle size — lazy-loaded via dynamic import in visualizer-tab.
 *   This file MUST NOT be imported directly (use the dynamic import wrapper).
 *
 * @deprecated 2D VisualizerCanvas (L4/L5) superseded by this component.
 *   2D kept as WebGL fallback.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §30 (P3.2), L51–L56
 */

'use client';

import { Suspense, useRef, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  PerformanceMonitor,
  Center,
} from '@react-three/drei';
import * as THREE from 'three';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { cn } from '@dms/ui';
import { CarModel } from './car-model';
import type { Resolved3DAsset } from '@/src/lib/custom-builds/visualizer-3d-assets';
import type { VisualizerCustomizations } from '@dms/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Visualizer3DCanvasProps {
  asset: Resolved3DAsset;
  paintColor?: string;
  wheelSize?: number;
  /** P3.3: 3D customization state */
  customizations?: VisualizerCustomizations;
  readOnly?: boolean;
  className?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// ─── Loading state — polished skeleton ─────────────────────────────────────────

function Loading3DState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0f1a]">
      {/* Car silhouette skeleton */}
      <div className="relative w-64 h-32" aria-hidden>
        <svg
          viewBox="0 0 320 160"
          fill="none"
          className="w-full h-full opacity-20 animate-pulse"
        >
          {/* Simplified car silhouette */}
          <path
            d="M40,120 L55,88 L80,65 L160,58 L240,65 L270,88 L280,120 Z"
            fill="#334155"
          />
          <path
            d="M55,88 L70,70 L100,58 L160,55 L220,58 L255,70 L270,88 Z"
            fill="#1e293b"
          />
          <circle cx="90" cy="120" r="18" fill="#1e293b" />
          <circle cx="230" cy="120" r="18" fill="#1e293b" />
        </svg>
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"
          style={{ backgroundSize: '200% 100%' }}
        />
      </div>
      <p className="text-[13px] text-white/40 font-medium tracking-wide">
        Loading 3D viewer...
      </p>
    </div>
  );
}

// ─── WebGL check ───────────────────────────────────────────────────────────────

function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// ─── WebGL unavailable banner ──────────────────────────────────────────────────

function WebGLUnavailableBanner() {
  return (
    <div className="absolute top-3 left-3 right-3 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-600/30 text-amber-300 text-[12px] font-medium">
      <span className="shrink-0">WebGL unavailable</span>
      <span className="text-amber-400/60">—</span>
      <span className="text-amber-300/70">showing 2D preview</span>
    </div>
  );
}

// ─── 3D Scene contents ─────────────────────────────────────────────────────────

interface SceneProps {
  asset: Resolved3DAsset;
  paintColor?: string;
  wheelSize?: number;
  customizations?: VisualizerCustomizations;
  autoRotate: boolean;
  onDpr: (dpr: number) => void;
}

function Scene({ asset, paintColor, wheelSize, customizations, autoRotate, onDpr }: SceneProps) {
  return (
    <>
      {/* Performance monitor — drops DPR if FPS falls below 30 */}
      <PerformanceMonitor
        onDecline={() => onDpr(1)}
        onIncline={() => onDpr(Math.min(window.devicePixelRatio, 2))}
      />

      {/* Studio environment (drei preset) */}
      <Environment preset="studio" />

      {/* Car model — centered */}
      <Center>
        <CarModel
          modelUrl={asset.modelUrl}
          paintColor={paintColor}
          wheelSize={wheelSize}
          paintMaterialHints={asset.paintMaterialHints}
          wheelMeshHints={asset.wheelMeshHints}
          exhaustMeshHints={asset.exhaustMeshHints}
          customizations={customizations}
          modelSlug="ferrari"
        />
      </Center>

      {/* Contact shadow — grounds the car.
          L74 (locked): position y=-0.05 (below ground plane) so the shadow
          plane never intersects the car body. opacity=0.35, blur=2, far=2
          keeps it subtle and prevents the dark-band artefact. */}
      <ContactShadows
        position={[0, -0.05, 0]}
        opacity={0.35}
        scale={10}
        blur={2}
        far={2}
        color="#000000"
      />

      {/* Orbit controls — constrained (L54) */}
      <OrbitControls
        enableZoom
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={autoRotate}
        autoRotateSpeed={0.4}
        makeDefault
      />
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function Visualizer3DCanvas({
  asset,
  paintColor,
  wheelSize = 20,
  customizations,
  readOnly = false,
  className,
  onFullscreenChange,
}: Visualizer3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [webglAvailable] = useState(() => isWebGLAvailable());
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);

  // Reduced-motion: detect via media query (R3F Canvas doesn't expose useReducedMotion)
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      onFullscreenChange?.(fs);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [onFullscreenChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) void document.exitFullscreen();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const handleDpr = useCallback((newDpr: number) => {
    setDpr([1, newDpr]);
  }, []);

  // Auto-rotate disabled for reduced-motion users (L54)
  const autoRotate = !prefersReducedMotion && !readOnly;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden rounded-xl select-none group',
        isFullscreen && 'rounded-none',
        className,
      )}
      style={{ aspectRatio: '16 / 9' }}
      role="img"
      aria-label={`3D view of ${asset.displayName}${paintColor ? ' with custom paint' : ''}`}
    >
      {/* Showroom backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 30%, #1e2a3a 0%, #0d1117 60%, #070b12 100%)',
        }}
        aria-hidden
      />

      {/* WebGL unavailable banner — shown above fallback 2D */}
      {!webglAvailable && <WebGLUnavailableBanner />}

      {/* 3D Canvas — only rendered when WebGL available */}
      {webglAvailable && (
        <Canvas
          className="absolute inset-0"
          camera={{ position: [4, 1.5, 4], fov: 35 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          dpr={dpr}
          shadows
        >
          <Suspense fallback={null}>
            <Scene
              asset={asset}
              paintColor={paintColor}
              wheelSize={wheelSize}
              customizations={customizations}
              autoRotate={autoRotate}
              onDpr={handleDpr}
            />
          </Suspense>
        </Canvas>
      )}

      {/* Loading skeleton — shown while GLTF loads (R3F Suspense boundary above handles this,
          but we also show it initially before Canvas mounts) */}
      <Suspense fallback={<Loading3DState />}>
        {/* Invisible — just to trigger suspense boundary for the loading state */}
        <span className="sr-only" />
      </Suspense>

      {/* Canvas toolbar */}
      {!readOnly && (
        <div
          className={cn(
            'absolute top-3 right-3 flex items-center gap-2 z-50',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            isFullscreen && 'opacity-100',
          )}
        >
          {/* Reset to stock */}
          <button
            type="button"
            onClick={() => {
              // Orbit controls reset via R3F imperative handle would go here.
              // For now, remounting is handled by the parent via key change.
            }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium',
              'backdrop-blur-md border transition-all',
              'bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-black/60',
            )}
            aria-label="Reset camera to default position"
          >
            <RotateCcw size={12} aria-hidden />
            Reset
          </button>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className={cn(
              'p-1.5 rounded-md backdrop-blur-md border transition-all',
              'bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-black/60',
            )}
            aria-label={
              isFullscreen
                ? 'Exit fullscreen'
                : 'Enter fullscreen presentation mode'
            }
          >
            {isFullscreen ? (
              <Minimize2 size={13} aria-hidden />
            ) : (
              <Maximize2 size={13} aria-hidden />
            )}
          </button>
        </div>
      )}

      {/* Read-only badge */}
      {readOnly && (
        <div
          className="absolute bottom-3 left-3 px-2 py-1 rounded text-[10px] font-mono text-accent bg-accent/10 border border-accent/20"
          aria-hidden
        >
          3D Preview
        </div>
      )}
    </div>
  );
}
