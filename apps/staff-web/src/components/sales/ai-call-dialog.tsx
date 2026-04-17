'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Phone, CheckCircle2, X } from 'lucide-react';
import { cn } from '@dms/ui';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import type { Interaction } from '@dms/types';
import { AI_CALL_TEMPLATES } from '@/src/lib/ai-call-templates';

// ─── Constants ────────────────────────────────────────────────────────────────

type CallIntent =
  | 'introduction'
  | 'vehicle-details'
  | 'test-drive'
  | 'follow-up'
  | 'kyc-request'
  | 'feedback'
  | 'custom';

type ExpectedOutcome =
  | 'schedule-test-drive'
  | 'collect-info'
  | 'send-docs'
  | 'close-sale'
  | 'general';

type Language = 'english' | 'hindi';

type DialogStage = 'setup' | 'calling' | 'summary';

const INTENT_OPTIONS: { value: CallIntent; label: string }[] = [
  { value: 'introduction', label: 'Introduce BN Automobiles' },
  { value: 'vehicle-details', label: 'Share vehicle details and pricing' },
  { value: 'test-drive', label: 'Book a test drive appointment' },
  { value: 'follow-up', label: 'Follow up on previous interaction' },
  { value: 'kyc-request', label: 'Request KYC documents' },
  { value: 'feedback', label: 'Gather feedback post-delivery' },
  { value: 'custom', label: 'Custom' },
];

const OUTCOME_OPTIONS: { value: ExpectedOutcome; label: string }[] = [
  { value: 'schedule-test-drive', label: 'Schedule test drive' },
  { value: 'collect-info', label: 'Collect information' },
  { value: 'send-docs', label: 'Send docs' },
  { value: 'close-sale', label: 'Close sale' },
  { value: 'general', label: 'General update' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDuration(dur: string): number {
  // "3m 24s" → 3*60+24 = 204
  const mMatch = dur.match(/(\d+)m/);
  const sMatch = dur.match(/(\d+)s/);
  const m = mMatch ? parseInt(mMatch[1] ?? '0', 10) : 0;
  const s = sMatch ? parseInt(sMatch[1] ?? '0', 10) : 0;
  return m * 60 + s;
}

function buildTranscriptLines(
  intent: CallIntent,
  customerName: string,
  vehicleName?: string,
): { delay: number; speaker: 'agent' | 'customer'; text: string }[] {
  const firstName = customerName.split(' ')[0] ?? customerName;
  const vehicle = vehicleName ?? 'the vehicle';

  const intentOpeners: Record<CallIntent, string> = {
    introduction: `Agent: "I'm calling from BN Automobiles to introduce our curated pre-owned collection."`,
    'vehicle-details': `Agent: "I'm calling from BN Automobiles regarding your interest in the ${vehicle}."`,
    'test-drive': `Agent: "I'm calling from BN Automobiles to help you book a test drive for the ${vehicle}."`,
    'follow-up': `Agent: "I'm following up from BN Automobiles regarding your recent enquiry with us."`,
    'kyc-request': `Agent: "I'm calling from BN Automobiles to request your KYC documents to proceed further."`,
    feedback: `Agent: "I'm calling from BN Automobiles to collect your valuable feedback on your recent experience."`,
    custom: `Agent: "I'm calling from BN Automobiles. How can I assist you today?"`,
  };

  const intentQuestions: Record<CallIntent, string> = {
    introduction: `Agent: "Would you like to receive our curated vehicle list via email or WhatsApp?"`,
    'vehicle-details': `Agent: "Would you be available for a viewing this weekend?"`,
    'test-drive': `Agent: "Are you available for a test drive on Saturday morning at our Bangalore outlet?"`,
    'follow-up': `Agent: "Have you had a chance to discuss the options with your family?"`,
    'kyc-request': `Agent: "Would you prefer to upload your documents via our secure portal or visit us in person?"`,
    feedback: `Agent: "On a scale of 1-10, how would you rate your overall experience with us?"`,
    custom: `Agent: "Is there anything specific I can help you with today?"`,
  };

  return [
    { delay: 500, speaker: 'agent', text: `Agent: "Hello, is this ${firstName}?"` },
    { delay: 1500, speaker: 'customer', text: `${firstName}: "Yes, speaking."` },
    { delay: 2500, speaker: 'agent', text: intentOpeners[intent] ?? '' },
    { delay: 3500, speaker: 'agent', text: intentQuestions[intent] ?? '' },
  ];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiCallDialogProps {
  open: boolean;
  onClose: () => void;
  dealId: string;
  customerName: string;
  vehicleName?: string;
  onCallLogged: (interaction: Partial<Interaction>) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiCallDialog({
  open,
  onClose,
  customerName,
  vehicleName,
  onCallLogged,
}: AiCallDialogProps) {
  const { toasts, toast, dismiss } = useToast();

  // Setup state
  const [stage, setStage] = useState<DialogStage>('setup');
  const [intent, setIntent] = useState<CallIntent | ''>('');
  const [context, setContext] = useState('');
  const [outcome, setOutcome] = useState<ExpectedOutcome>('general');
  const [language, setLanguage] = useState<Language>('hindi');
  const [submitting, setSubmitting] = useState(false);

  // Calling state
  const [transcriptLines, setTranscriptLines] = useState<
    { speaker: 'agent' | 'customer'; text: string }[]
  >([]);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function resetAll() {
    setStage('setup');
    setIntent('');
    setContext('');
    setOutcome('general');
    setLanguage('hindi');
    setTranscriptLines([]);
    // clear any pending timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  // Scroll transcript to bottom as new lines appear
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptLines]);

  function startCall() {
    if (!intent) return;
    setStage('calling');
    setTranscriptLines([]);

    const lines = buildTranscriptLines(intent as CallIntent, customerName, vehicleName);
    lines.forEach((line) => {
      const t = setTimeout(() => {
        setTranscriptLines((prev) => [...prev, { speaker: line.speaker, text: line.text }]);
      }, line.delay);
      timersRef.current.push(t);
    });

    // Auto-transition to summary after 6s
    const autoT = setTimeout(() => {
      setStage('summary');
    }, 6000);
    timersRef.current.push(autoT);
  }

  function endCallEarly() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setStage('summary');
  }

  async function handleSaveAndClose() {
    if (!intent) return;
    const template = AI_CALL_TEMPLATES[intent];
    if (!template) return;

    const ctx = { customerName, vehicleName };
    const summary = template.summary(ctx);
    const intentLabel =
      INTENT_OPTIONS.find((o) => o.value === intent)?.label ?? intent;

    setSubmitting(true);
    try {
      await onCallLogged({
        type: 'call-ai',
        title: `AI Call — ${intentLabel}`,
        body: summary,
        durationSeconds: parseDuration(template.duration),
      });
      toast('AI call logged', 'success');
      handleClose();
    } finally {
      setSubmitting(false);
    }
  }

  // Get template for summary stage
  const activeTemplate = intent ? AI_CALL_TEMPLATES[intent] : null;
  const summaryCtx = { customerName, vehicleName };
  const summaryText = activeTemplate ? activeTemplate.summary(summaryCtx) : '';
  const actionItems = activeTemplate ? activeTemplate.actionItems(summaryCtx) : [];
  const sentiment = activeTemplate ? activeTemplate.sentiment : 'neutral';
  const duration = activeTemplate ? activeTemplate.duration : '—';

  const sentimentConfig: Record<
    'positive' | 'neutral' | 'follow-up',
    { label: string; classes: string }
  > = {
    positive: {
      label: 'Positive',
      classes: 'bg-[rgb(var(--state-listed)/0.12)] text-[rgb(var(--state-listed))]',
    },
    neutral: {
      label: 'Neutral',
      classes: 'bg-bg-subtle text-ink-muted',
    },
    'follow-up': {
      label: 'Needs Follow-up',
      classes:
        'bg-[rgb(var(--state-pending)/0.12)] text-[rgb(var(--state-pending))]',
    },
  };

  // Dialog title changes per stage
  const dialogTitle =
    stage === 'setup'
      ? 'AI Call Setup'
      : stage === 'calling'
        ? `Calling ${customerName.split(' ')[0]}...`
        : 'Call Completed';

  return (
    <>
      <Dialog
        open={open}
        onClose={stage === 'calling' ? () => undefined : handleClose}
        title={dialogTitle}
        size="md"
        closeOnBackdrop={stage !== 'calling'}
        footer={
          stage === 'setup' ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium border border-line',
                  'bg-bg-canvas text-ink-secondary hover:text-ink-primary',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startCall}
                disabled={!intent}
                className={cn(
                  'inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-semibold text-white',
                  'bg-accent hover:bg-accent/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Initiate AI Call
              </button>
            </>
          ) : stage === 'calling' ? (
            <button
              type="button"
              onClick={endCallEarly}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              End Call
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium border border-line',
                  'bg-bg-canvas text-ink-secondary hover:text-ink-primary',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndClose}
                disabled={submitting}
                className={cn(
                  'inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-semibold text-white',
                  'bg-accent hover:bg-accent/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {submitting ? 'Saving…' : 'Save & Close'}
              </button>
            </>
          )
        }
      >
        {/* ── Stage 1: Setup ─────────────────────────────────────────────── */}
        {stage === 'setup' && (
          <div className="space-y-5">
            {/* Info banner */}
            <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-ink-secondary">
              AI calls are recorded and summarized. The customer will be informed at the start of the call.
            </div>

            {/* Call Intent */}
            <div>
              <label
                htmlFor="ai-call-intent"
                className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5"
              >
                Call Intent <span className="text-ink-muted normal-case tracking-normal">*</span>
              </label>
              <select
                id="ai-call-intent"
                value={intent}
                onChange={(e) => setIntent(e.target.value as CallIntent)}
                className={cn(
                  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
                  'text-sm text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                )}
              >
                <option value="">Select intent...</option>
                {INTENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Context */}
            <div>
              <label
                htmlFor="ai-call-context"
                className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5"
              >
                Additional Context
              </label>
              <textarea
                id="ai-call-context"
                rows={3}
                maxLength={500}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Any specific points to cover, customer's recent concerns, or key terms to mention..."
                className={cn(
                  'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5 resize-none',
                  'text-sm text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  'placeholder:text-ink-muted',
                )}
              />
              <p className="text-xs text-ink-muted text-right mt-1">{context.length}/500</p>
            </div>

            {/* Expected Outcome */}
            <div>
              <label
                htmlFor="ai-call-outcome"
                className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5"
              >
                Expected Outcome
              </label>
              <select
                id="ai-call-outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as ExpectedOutcome)}
                className={cn(
                  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
                  'text-sm text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                )}
              >
                {OUTCOME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
                Language
              </p>
              <div className="flex items-center gap-1 bg-bg-subtle rounded-md p-0.5 border border-line w-fit">
                {(['english', 'hindi'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      'h-8 px-4 rounded text-xs font-medium capitalize transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      language === lang
                        ? 'bg-bg-surface text-ink-primary shadow-sm'
                        : 'text-ink-muted hover:text-ink-secondary',
                    )}
                  >
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Stage 2: Calling ───────────────────────────────────────────── */}
        {stage === 'calling' && (
          <div className="flex flex-col items-center py-4">
            {/* Pulsing phone icon */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute h-24 w-24 rounded-full bg-accent/10 animate-ping" aria-hidden="true" />
              <div className="relative h-24 w-24 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
                <Phone className="h-8 w-8 text-accent" aria-hidden="true" />
              </div>
            </div>

            <h3 className="text-[18px] font-semibold text-ink-primary mb-1">
              Calling {customerName.split(' ')[0]}...
            </h3>
            <p className="font-mono text-[12px] text-ink-muted mb-6">
              AI Agent: BN Sales Assistant
            </p>

            {/* Live transcript */}
            <div
              ref={transcriptRef}
              className="mt-2 w-full max-h-48 overflow-y-auto rounded-md border border-line bg-bg-subtle p-3 text-sm space-y-2"
              aria-live="polite"
              aria-label="Call transcript"
            >
              {transcriptLines.length === 0 ? (
                <p className="text-xs text-ink-muted italic">Connecting...</p>
              ) : (
                transcriptLines.map((line, idx) => (
                  <p key={idx} className={line.speaker === 'agent' ? 'text-accent' : 'text-ink-primary'}>
                    {line.text}
                  </p>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Stage 3: Summary ───────────────────────────────────────────── */}
        {stage === 'summary' && (
          <div className="space-y-5">
            {/* Success icon + title */}
            <div className="flex flex-col items-center py-2">
              <CheckCircle2
                className="h-10 w-10 text-[rgb(var(--state-listed))] mb-3"
                aria-hidden="true"
              />
              <h3 className="text-[18px] font-semibold text-ink-primary">Call Completed</h3>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-line bg-bg-subtle p-3 text-center">
                <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">Duration</p>
                <p className="font-mono text-sm font-semibold text-ink-primary">{duration}</p>
              </div>
              <div className="rounded-md border border-line bg-bg-subtle p-3 text-center">
                <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">Sentiment</p>
                <span
                  className={cn(
                    'inline-block text-xs font-medium px-2 py-0.5 rounded-full',
                    sentimentConfig[sentiment]?.classes ?? 'bg-bg-subtle text-ink-muted',
                  )}
                >
                  {sentimentConfig[sentiment]?.label ?? sentiment}
                </span>
              </div>
              <div className="rounded-md border border-line bg-bg-subtle p-3 text-center">
                <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">Language</p>
                <p className="text-sm font-medium text-ink-primary capitalize">{language}</p>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h4 className="text-sm font-semibold text-ink-primary mb-2">Summary</h4>
              <div className="rounded-md border border-line bg-bg-subtle p-3 text-[13px] text-ink-secondary leading-relaxed">
                {summaryText}
              </div>
            </div>

            {/* Action Items */}
            {actionItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-ink-primary mb-2">Action Items</h4>
                <ul className="space-y-2">
                  {actionItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border border-line bg-bg-subtle accent-accent shrink-0"
                        aria-label={item}
                        readOnly
                      />
                      <span className="text-[13px] text-ink-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
