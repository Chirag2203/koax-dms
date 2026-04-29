/**
 * CampaignCreatorView — 3-step campaign creation wizard.
 *
 * Step 1: Select APPROVED template (L13 — only APPROVED shown).
 * Step 2: Build audience (hasMarketingConsent + excludeOptedOut hardcoded — L10).
 * Step 3: Schedule + preview before launch.
 *
 * Gate: R10+
 * Spec reference: SPEC-INSURANCE-001 §5.5, §32, L9, L10, L13, L_P3_1
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';
import { TemplateNotApprovedError } from '@/src/lib/insurance/insurance-store';

type Step = 1 | 2 | 3;
const EXPIRY_WINDOWS = [60, 30, 15, 7] as const;

export function CampaignCreatorView() {
  const router = useRouter();
  const templates = useInsuranceStore((s) => s.templates);
  const leads = useInsuranceStore((s) => s.leads);
  const optOuts = useInsuranceStore((s) => s.getOptOuts)();
  const launchCampaign = useInsuranceStore((s) => s.launchCampaign);

  const [step, setStep] = useState<Step>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [expiryWindow, setExpiryWindow] = useState<number | undefined>(undefined);
  const [selectedCities, setSelectedCities] = useState<('bangalore' | 'mumbai' | 'chennai')[]>([]);
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');

  const approvedTemplates = templates.filter((t) => t.status === 'APPROVED');

  // Compute audience preview
  const audienceLeads = leads.filter((l) => {
    if (!l.marketingConsentGiven) return false;
    if (optOuts.includes(l.customerId)) return false;
    if (selectedCities.length > 0 && !selectedCities.includes(l.outlet)) return false;
    if (expiryWindow !== undefined && l.expiresAt) {
      const days = Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days > expiryWindow) return false;
    }
    return true;
  });

  function toggleCity(city: 'bangalore' | 'mumbai' | 'chennai') {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city],
    );
  }

  function handleLaunch() {
    setError('');
    try {
      const campaign = launchCampaign({
        name: campaignName || 'Unnamed Campaign',
        templateId: selectedTemplateId,
        audienceFilter: {
          hasMarketingConsent: true,
          excludeOptedOut: true,
          ...(selectedCities.length > 0 ? { cities: selectedCities } : {}),
          ...(expiryWindow !== undefined ? { expiryWindowDays: expiryWindow } : {}),
        },
        scheduledAt: scheduleNow ? undefined : scheduledAt || undefined,
        createdBy: 'staff-r10-001',
      });
      router.push(`/insurance/marketing/whatsapp/campaigns/${campaign.campaignId}`);
    } catch (e) {
      if (e instanceof TemplateNotApprovedError) {
        setError('Selected template is no longer APPROVED. Please choose another.');
      } else {
        setError(e instanceof Error ? e.message : 'Launch failed.');
      }
    }
  }

  return (
    <Gate role="R10" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        <div className="px-6 py-5 border-b border-line shrink-0">
          <h1 className="text-[22px] font-semibold text-ink-primary">New Campaign</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">Step {step} of 3</p>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex gap-2 shrink-0">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-accent' : 'bg-bg-subtle'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Template */}
          {step === 1 && (
            <div className="max-w-xl">
              <h2 className="text-[16px] font-semibold text-ink-primary mb-1">Select Template</h2>
              <p className="text-[13px] text-ink-muted mb-4">
                Only APPROVED DLT-registered templates can be used (L13 / L9).
              </p>

              {approvedTemplates.length === 0 && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
                  <p className="text-[13px] text-warning">
                    No approved templates. Approve a DLT template first before launching a campaign.
                  </p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {approvedTemplates.map((t) => (
                  <button
                    key={t.templateId}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.templateId)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedTemplateId === t.templateId
                        ? 'border-accent bg-accent/5'
                        : 'border-line bg-bg-surface hover:border-line-strong'
                    }`}
                  >
                    <p className="text-[14px] font-medium text-ink-primary">{t.name}</p>
                    <p className="text-[12px] text-ink-muted truncate mt-0.5">{t.bodyText}</p>
                    <p className="text-[11px] text-success mt-1">DLT: {t.dltTemplateId}</p>
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-[13px] text-ink-secondary mb-1">Campaign name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. April Renewal Reminder"
                  className="w-full h-9 px-3 text-[13px] rounded border border-line bg-bg-canvas text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <div className="max-w-xl">
              <h2 className="text-[16px] font-semibold text-ink-primary mb-1">Build Audience</h2>
              <p className="text-[13px] text-ink-muted mb-4">
                Only customers with marketing consent are included (DPDP L10). Opt-outs excluded automatically.
              </p>

              <div className="mb-4">
                <label className="block text-[13px] text-ink-secondary mb-2">City filter</label>
                <div className="flex gap-2">
                  {(['bangalore', 'mumbai', 'chennai'] as const).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleCity(city)}
                      className={`h-8 px-3 rounded text-[12px] capitalize transition-colors ${
                        selectedCities.includes(city)
                          ? 'bg-accent text-white'
                          : 'border border-line bg-bg-surface text-ink-secondary hover:bg-bg-hover'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[13px] text-ink-secondary mb-2">Expiry window</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExpiryWindow(undefined)}
                    className={`h-8 px-3 rounded text-[12px] transition-colors ${
                      expiryWindow === undefined
                        ? 'bg-accent text-white'
                        : 'border border-line bg-bg-surface text-ink-secondary hover:bg-bg-hover'
                    }`}
                  >
                    Any
                  </button>
                  {EXPIRY_WINDOWS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExpiryWindow(d)}
                      className={`h-8 px-3 rounded text-[12px] transition-colors ${
                        expiryWindow === d
                          ? 'bg-accent text-white'
                          : 'border border-line bg-bg-surface text-ink-secondary hover:bg-bg-hover'
                      }`}
                    >
                      ≤{d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-bg-surface p-4">
                <p className="text-[13px] text-ink-secondary mb-1">Audience preview</p>
                <p className="text-[24px] font-semibold text-ink-primary">{audienceLeads.length}</p>
                <p className="text-[12px] text-ink-muted">
                  customers with consent · excl. {optOuts.length} opt-out(s)
                </p>
                {audienceLeads.slice(0, 3).map((l) => (
                  <p key={l.leadId} className="text-[11px] text-ink-faint mt-1">
                    {l.customerId} · {l.vin.slice(-7)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Schedule + preview */}
          {step === 3 && (
            <div className="max-w-xl">
              <h2 className="text-[16px] font-semibold text-ink-primary mb-1">Schedule</h2>
              <p className="text-[13px] text-ink-muted mb-4">
                Scheduled campaigns re-check opt-outs at dispatch time (L_P3_1).
              </p>

              <div className="flex gap-3 mb-4">
                {(['now', 'later'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setScheduleNow(opt === 'now')}
                    className={`flex-1 h-10 rounded text-[13px] font-medium transition-colors ${
                      (opt === 'now') === scheduleNow
                        ? 'bg-accent text-white'
                        : 'border border-line bg-bg-surface text-ink-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {opt === 'now' ? 'Send Now' : 'Schedule for Later'}
                  </button>
                ))}
              </div>

              {!scheduleNow && (
                <div className="mb-4">
                  <label className="block text-[13px] text-ink-secondary mb-1">Date + time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full h-9 px-3 text-[13px] rounded border border-line bg-bg-canvas text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}

              <div className="rounded-lg border border-line bg-bg-surface p-4 mb-4">
                <p className="text-[13px] font-medium text-ink-primary mb-2">Preview</p>
                <div className="space-y-1.5 text-[12px] text-ink-secondary">
                  <p>Template: <b className="text-ink-primary">{templates.find((t) => t.templateId === selectedTemplateId)?.name ?? '—'}</b></p>
                  <p>Audience: <b className="text-ink-primary">{audienceLeads.length} customers</b></p>
                  <p>Schedule: <b className="text-ink-primary">{scheduleNow ? 'Send immediately' : scheduledAt || '—'}</b></p>
                </div>
              </div>

              {error && (
                <div className="rounded border border-error/40 bg-error/10 p-3 mb-4">
                  <p className="text-[13px] text-error">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t border-line flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="inline-flex items-center gap-2 h-9 px-3 rounded border border-line bg-bg-surface text-[13px] text-ink-primary hover:bg-bg-hover transition-colors"
            >
              <ChevronLeft size={14} aria-hidden="true" />
              Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              disabled={step === 1 && !selectedTemplateId}
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded bg-accent text-white text-[13px] hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              Next
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!selectedTemplateId}
              onClick={handleLaunch}
              className="inline-flex items-center gap-2 h-9 px-4 rounded bg-accent text-white text-[13px] hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              Launch Campaign
            </button>
          )}
        </div>
      </div>
    </Gate>
  );
}
