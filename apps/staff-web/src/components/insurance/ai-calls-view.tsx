/**
 * AiCallsView — AI calling history (campaign-style view).
 *
 * Shows call logs grouped by lead. Feature flag banner when disabled.
 * P4: dispatch behind feat_insurance_ai_calling flag (L_P4_1).
 *
 * Gate: R09+
 * Spec reference: SPEC-INSURANCE-001 §5.6, §33, L17, L_P4_1
 */

'use client';

import Link from 'next/link';
import { Phone, AlertTriangle, Plus } from 'lucide-react';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';

const OUTCOME_BADGE: Record<string, string> = {
  interested: 'bg-success/15 text-success',
  callback: 'bg-accent/15 text-accent',
  callback_later: 'bg-accent/15 text-accent',
  'not-interested': 'bg-ink-faint/20 text-ink-muted',
  not_interested: 'bg-ink-faint/20 text-ink-muted',
  'wrong-number': 'bg-warning/15 text-warning',
  wrong_number: 'bg-warning/15 text-warning',
  'do-not-call': 'bg-error/15 text-error',
  do_not_call: 'bg-error/15 text-error',
  voicemail: 'bg-bg-subtle text-ink-muted',
};

export function AiCallsView() {
  const callLogs = useInsuranceStore((s) => s.callLogs);
  const featEnabled = useInsuranceStore((s) => s.featAiCallingEnabled);

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        <div className="flex items-center justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <h1 className="text-[22px] font-semibold text-ink-primary">AI Calling</h1>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {callLogs.length} call{callLogs.length !== 1 ? 's' : ''} logged
            </p>
          </div>
          <Link
            href="/insurance/marketing/ai-calls/new"
            className="inline-flex items-center gap-2 h-9 px-3 rounded bg-accent text-white text-[13px] hover:bg-accent/90 transition-colors"
          >
            <Plus size={14} aria-hidden="true" />
            New Call
          </Link>
        </div>

        {/* Feature flag banner — L_P4_1 */}
        {!featEnabled && (
          <div className="px-6 py-3 bg-warning/10 border-b border-warning/30 flex items-center gap-3 shrink-0">
            <AlertTriangle size={16} className="text-warning shrink-0" aria-hidden="true" />
            <p className="text-[13px] text-warning">
              AI calling is disabled — TRAI auto-dialler registration pending (OQ5).
              {' '}Feature flag <code className="font-mono text-[12px]">feat_insurance_ai_calling</code> is OFF.
              Real dispatch will be enabled once OQ4 + OQ5 prerequisites are met.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6">
          {callLogs.length === 0 && (
            <div className="rounded-lg border border-line bg-bg-surface p-8 text-center">
              <Phone size={32} className="mx-auto mb-2 text-ink-faint" />
              <p className="text-[14px] text-ink-muted">No AI calls logged yet.</p>
            </div>
          )}

          <div className="space-y-2">
            {callLogs.map((log) => (
              <div
                key={log.callId}
                className="rounded-lg border border-line bg-bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone size={13} className="text-ink-muted shrink-0" aria-hidden="true" />
                      <span className="text-[13px] font-medium text-ink-primary truncate">
                        Lead {log.leadId}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OUTCOME_BADGE[log.outcome] ?? 'bg-bg-subtle text-ink-muted'}`}>
                        {log.outcome}
                      </span>
                      {log.isMocked && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-faint/15 text-ink-faint">
                          mock
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-ink-muted">
                      {new Date(log.calledAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                      {log.durationSeconds != null && ` · ${log.durationSeconds}s`}
                    </p>
                    {log.transcript && (
                      <details className="mt-1.5">
                        <summary className="text-[11px] text-accent cursor-pointer">View transcript</summary>
                        <p className="mt-1 text-[12px] text-ink-secondary leading-relaxed whitespace-pre-wrap">
                          {log.transcript}
                        </p>
                      </details>
                    )}
                  </div>
                  <Link
                    href={`/insurance/leads/${log.leadId}?tab=ai-calls`}
                    className="shrink-0 text-[12px] text-accent hover:underline"
                  >
                    Lead detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Gate>
  );
}
