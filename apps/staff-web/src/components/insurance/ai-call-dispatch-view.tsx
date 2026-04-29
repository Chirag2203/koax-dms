/**
 * AiCallDispatchView — trigger a single AI call for a lead.
 *
 * Shows per-stage script selection.
 * Feature flag: when OFF, shows disabled state + TRAI notice (L_P4_1).
 * Followup config builder for per-lead sequences (L_P4_2).
 *
 * Gate: R09+
 * Spec reference: SPEC-INSURANCE-001 §33, L_P4_1, L_P4_2
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, AlertTriangle } from 'lucide-react';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';
import { AI_CALL_SCRIPTS } from '@/src/lib/insurance/insurance-store/slices/ai-call-slice';
import type { InsuranceLead } from '@dms/types';

const ACTOR_DEFAULT = { id: 'staff-r09-001', name: 'System', role: 'R09' };

export function AiCallDispatchView() {
  const router = useRouter();
  const leads = useInsuranceStore((s) => s.leads);
  const featEnabled = useInsuranceStore((s) => s.featAiCallingEnabled);
  const dispatchAiCall = useInsuranceStore((s) => s.dispatchAiCall);
  const triggerAICall = useInsuranceStore((s) => s.triggerAICall);

  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  const activeLeads = leads.filter((l) => l.stage !== 'closed-won' && l.stage !== 'closed-lost');
  const selectedLead: InsuranceLead | undefined = leads.find((l) => l.leadId === selectedLeadId);

  function handleDispatch() {
    if (!selectedLeadId) return;
    setError('');
    setDispatching(true);
    try {
      if (featEnabled) {
        const log = dispatchAiCall(selectedLeadId, selectedScriptId, ACTOR_DEFAULT);
        setResult(`Call ${log.callId} dispatched — outcome: ${log.outcome}`);
      } else {
        // P3 display-only path
        const log = triggerAICall(selectedLeadId, ACTOR_DEFAULT);
        setResult(`Mock call ${log.callId} created — outcome: ${log.outcome} (display-only)`);
      }
      setTimeout(() => router.push('/insurance/marketing/ai-calls'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dispatch failed.');
    } finally {
      setDispatching(false);
    }
  }

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        <div className="px-6 py-5 border-b border-line shrink-0">
          <h1 className="text-[22px] font-semibold text-ink-primary">Trigger AI Call</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">Select a lead and script to initiate an AI-assisted call.</p>
        </div>

        {/* Feature flag banner */}
        {!featEnabled && (
          <div className="px-6 py-3 bg-warning/10 border-b border-warning/30 flex items-center gap-3 shrink-0">
            <AlertTriangle size={16} className="text-warning shrink-0" />
            <p className="text-[13px] text-warning">
              AI calling disabled — TRAI registration pending. Dispatch is display-only (mock mode).
            </p>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6 max-w-xl space-y-5">
          {/* Lead selector */}
          <div>
            <label className="block text-[13px] text-ink-secondary mb-1.5">Select lead</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full h-9 px-3 text-[13px] rounded border border-line bg-bg-canvas text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">-- Select a lead --</option>
              {activeLeads.map((l) => (
                <option key={l.leadId} value={l.leadId}>
                  {l.vin.slice(-7)} · {l.customerId} · {l.stage}
                </option>
              ))}
            </select>
          </div>

          {/* Script selector */}
          {selectedLead && (
            <div>
              <label className="block text-[13px] text-ink-secondary mb-1.5">Select script</label>
              <div className="space-y-2">
                {AI_CALL_SCRIPTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedScriptId(s.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedScriptId === s.id
                        ? 'border-accent bg-accent/5'
                        : 'border-line bg-bg-surface hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-ink-primary">{s.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-subtle text-ink-muted">
                        {s.stage}
                      </span>
                    </div>
                    <p className="text-[12px] text-ink-muted line-clamp-2">{s.previewText}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded border border-error/40 bg-error/10 p-3">
              <p className="text-[13px] text-error">{error}</p>
            </div>
          )}

          {result && (
            <div className="rounded border border-success/40 bg-success/10 p-3">
              <p className="text-[13px] text-success">{result}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleDispatch}
            disabled={!selectedLeadId || dispatching}
            className="inline-flex items-center gap-2 h-10 px-5 rounded bg-accent text-white text-[14px] font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Phone size={15} aria-hidden="true" />
            {featEnabled ? 'Dispatch AI Call' : 'Trigger Mock Call'}
          </button>
        </div>
      </div>
    </Gate>
  );
}
