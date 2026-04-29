/**
 * /custom-builds/visualizer-playground — Standalone 3D Visualizer.
 *
 * L94: Showroom demo without a Build Job. Auto-loads the Ferrari with a
 * synthetic empty BuildJob. Customizations are local-only (not persisted).
 * "Save to Build" is disabled with a tooltip explaining how to use it.
 *
 * Useful for showroom demos and customer walk-ins.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §38 L94
 */

import { Suspense } from 'react';
import { VisualizerPlayground } from '@/src/components/custom-builds/visualizer/visualizer-playground';

export default function VisualizerPlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-[#0a0f1a] flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
        </div>
      }
    >
      <VisualizerPlayground />
    </Suspense>
  );
}
