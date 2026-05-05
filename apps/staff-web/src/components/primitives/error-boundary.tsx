/**
 * ErrorBoundary — widget-level error boundary primitive.
 *
 * Per CLAUDE.md §17.0 + SPEC-ARCH-UI-001 §11 L4: widgets that should fail
 * INDEPENDENTLY of the rest of their module (e.g., the 3D visualizer, a
 * third-party embed, a chunk-loaded canvas) wrap themselves in this so a
 * load/render crash renders a graceful fallback instead of bubbling to the
 * module-level error.tsx (which would tear down the whole module shell).
 *
 * Use sparingly — most failures should bubble to the module-level boundary.
 *
 * Canonical use case: dynamic-import 3D canvas where a stale Next.js build
 * manifest can produce `_next/undefined` chunk URLs. The boundary catches
 * the chunk-load reject so the rest of the visualizer-tab UI (panel,
 * controls, save bar) stays interactive.
 */

'use client';

import { Component, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  /** What renders when the boundary catches an error. Receives error + reset. */
  fallback: (props: { error: Error; reset: () => void }) => ReactNode;
  /** The wrapped tree. */
  children: ReactNode;
  /** Optional onError side-effect (for telemetry hooks). */
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError?.(error);
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}
