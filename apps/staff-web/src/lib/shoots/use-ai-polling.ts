'use client';

/**
 * useAiPolling — client-side polling hook for AI asset processing.
 *
 * Polls GET /api/shoots/ai-process?vendorJobId= every 1.5 s, up to 8 attempts.
 * When terminal (succeeded/failed), calls _applyAiResult on the store.
 * Uses AbortController for unmount cleanup — no polling leaks (L_AI-16).
 *
 * Usage:
 *   const { status } = useAiPolling({ vendorJobId, assetId, actor, session });
 *
 * Spec reference: SPEC-SHOOTS-002 §11, L_AI-16
 * Plan reference: PLAN-SHOOTS-AI-002 §1.2
 */

import { useEffect, useRef, useState } from 'react';
import { useShootsStore } from './shoots-store';
import type { ShootActor } from './shoots-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiPollingStatus = 'idle' | 'polling' | 'succeeded' | 'failed' | 'aborted';

export interface UseAiPollingProps {
  /** vendorJobId returned by requestAiProcess. Null/undefined = no polling. */
  vendorJobId: string | null | undefined;
  /** assetId to update when terminal. */
  assetId: string;
  /** Actor for _applyAiResult audit trail. */
  actor: ShootActor;
  /** Session header value (JSON-stringified StaffSession). */
  sessionHeader: string;
}

export interface UseAiPollingResult {
  status: AiPollingStatus;
}

// ─── Constants (L_AI-16) ─────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 1500; // 1.5 s
const MAX_ATTEMPTS = 8;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAiPolling({
  vendorJobId,
  assetId,
  actor,
  sessionHeader,
}: UseAiPollingProps): UseAiPollingResult {
  const [status, setStatus] = useState<AiPollingStatus>(
    vendorJobId ? 'polling' : 'idle',
  );
  const applyAiResult = useShootsStore((s) => s._applyAiResult);
  // Use a ref for the attempt counter to avoid stale closure issues
  const attemptRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!vendorJobId) {
      setStatus('idle');
      return;
    }

    setStatus('polling');
    attemptRef.current = 0;

    const abort = new AbortController();
    abortRef.current = abort;

    async function poll(): Promise<void> {
      if (abort.signal.aborted) return;
      if (attemptRef.current >= MAX_ATTEMPTS) {
        // Exhausted all attempts — treat as failed
        setStatus('failed');
        applyAiResult(
          assetId,
          { status: 'failed', errorMessage: 'AI polling exhausted — no response after 8 attempts' },
          actor,
        );
        return;
      }

      attemptRef.current += 1;

      try {
        const response = await fetch(
          `/api/shoots/ai-process?vendorJobId=${encodeURIComponent(vendorJobId ?? '')}`,
          {
            method: 'GET',
            headers: { 'x-staff-session': sessionHeader },
            signal: abort.signal,
          },
        );

        if (!response.ok) {
          // Non-2xx — treat as failed
          setStatus('failed');
          applyAiResult(
            assetId,
            { status: 'failed', errorMessage: `Poll HTTP ${response.status}` },
            actor,
          );
          return;
        }

        const data = await response.json() as {
          status: 'processing' | 'succeeded' | 'failed';
          processedDataUrl?: string;
          errorMessage?: string;
        };

        if (data.status === 'processing') {
          // Schedule next poll
          const timer = setTimeout(() => {
            if (!abort.signal.aborted) {
              void poll();
            }
          }, POLL_INTERVAL_MS);
          // Cleanup if aborted while timer is running
          abort.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
          return;
        }

        // Terminal
        if (data.status === 'succeeded') {
          setStatus('succeeded');
          applyAiResult(
            assetId,
            { status: 'succeeded', processedDataUrl: data.processedDataUrl },
            actor,
          );
        } else {
          setStatus('failed');
          applyAiResult(
            assetId,
            { status: 'failed', errorMessage: data.errorMessage },
            actor,
          );
        }
      } catch (err) {
        if (abort.signal.aborted) {
          setStatus('aborted');
          return;
        }
        // Network error — treat as failed
        setStatus('failed');
        applyAiResult(
          assetId,
          {
            status: 'failed',
            errorMessage: err instanceof Error ? err.message : 'Network error during AI poll',
          },
          actor,
        );
      }
    }

    // Kick off the first poll after one interval (mirrors Spyne.ai async start)
    const initialTimer = setTimeout(() => {
      if (!abort.signal.aborted) {
        void poll();
      }
    }, POLL_INTERVAL_MS);
    abort.signal.addEventListener('abort', () => clearTimeout(initialTimer), { once: true });

    return () => {
      abort.abort();
    };
  }, [vendorJobId, assetId, actor, sessionHeader, applyAiResult]);

  return { status };
}
