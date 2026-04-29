/**
 * CreateLeadView — create insurance lead with DPDP consent.
 *
 * L15 / B3: explicit consent checkbox required; defaults false.
 * L12: VIN must exist in vehicles fixture.
 *
 * Spec reference: SPEC-INSURANCE-001 §5.1, L15
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { Gate } from '@/src/components/primitives/gate';
import { VINNotFoundError } from '@/src/lib/insurance/insurance-store';
import { vehicles } from '@dms/mocks/fixtures';

export function CreateLeadView() {
  const router = useRouter();
  const { user } = useStaffAuth();
  const createLead = useInsuranceStore((s) => s.createLead);

  const [form, setForm] = useState({
    vin: '',
    customerId: 'customer-001',
    odometer: 0,
    customerAge: 35,
    customerCity: '',
    panLast4: '',
    noClaimBonusYears: 0,
    // L15: defaults false
    marketingConsentGiven: false,
  });

  const [vinError, setVinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.vin === form.vin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setVinError(null);

    try {
      const lead = createLead({
        vin: form.vin,
        customerId: form.customerId,
        assignedAdvisorId: user.id,
        outlet: (user.outlet === 'all' ? 'bangalore' : user.outlet) as 'bangalore' | 'mumbai' | 'chennai',
        odometer: form.odometer,
        customerAge: form.customerAge,
        customerCity: form.customerCity,
        panLast4: form.panLast4,
        noClaimBonusYears: form.noClaimBonusYears,
        marketingConsentGiven: form.marketingConsentGiven,
      });
      router.push(`/insurance/leads/${lead.leadId}`);
    } catch (e) {
      if (e instanceof VINNotFoundError) {
        setVinError('VIN not found in vehicle inventory. Please select a valid VIN.');
      } else {
        setError('Failed to create lead. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">New Insurance Lead</h1>
            <p className="mt-0.5 text-[13px] text-ink-muted leading-[1.5]">Create a new insurance lead for a vehicle</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-[13px] text-danger">
                {error}
              </div>
            )}

            {/* VIN selection */}
            <div>
              <label className="block text-[13px] font-medium text-ink-primary mb-1.5" htmlFor="vin">
                Vehicle (VIN) *
              </label>
              <select
                id="vin"
                required
                value={form.vin}
                onChange={(e) => {
                  setForm((f) => ({ ...f, vin: e.target.value }));
                  setVinError(null);
                }}
                className="w-full h-10 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select a vehicle</option>
                {vehicles.slice(0, 20).map((v) => (
                  <option key={v.vin} value={v.vin}>
                    {v.year} {v.make} {v.model} — {v.vin}
                  </option>
                ))}
              </select>
              {vinError && <p className="mt-1 text-[12px] text-danger">{vinError}</p>}
              {selectedVehicle && (
                <p className="mt-1 text-[12px] text-ink-muted">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} · {selectedVehicle.city} · {selectedVehicle.km.toLocaleString('en-IN')} km
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-ink-primary mb-1.5" htmlFor="odometer">
                  Odometer (km) *
                </label>
                <input
                  id="odometer"
                  type="number"
                  required
                  value={form.odometer}
                  onChange={(e) => setForm((f) => ({ ...f, odometer: Number(e.target.value) }))}
                  className="w-full h-10 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ink-primary mb-1.5" htmlFor="ncbYears">
                  NCB Years (0–5) *
                </label>
                <input
                  id="ncbYears"
                  type="number"
                  required
                  min={0}
                  max={5}
                  value={form.noClaimBonusYears}
                  onChange={(e) => setForm((f) => ({ ...f, noClaimBonusYears: Number(e.target.value) }))}
                  className="w-full h-10 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-ink-primary mb-1.5" htmlFor="customerAge">
                  Customer Age *
                </label>
                <input
                  id="customerAge"
                  type="number"
                  required
                  value={form.customerAge}
                  onChange={(e) => setForm((f) => ({ ...f, customerAge: Number(e.target.value) }))}
                  className="w-full h-10 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ink-primary mb-1.5" htmlFor="customerCity">
                  Customer City *
                </label>
                <input
                  id="customerCity"
                  type="text"
                  required
                  value={form.customerCity}
                  onChange={(e) => setForm((f) => ({ ...f, customerCity: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g. Bangalore"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink-primary mb-1.5" htmlFor="panLast4">
                PAN Last 4 Digits *
              </label>
              <input
                id="panLast4"
                type="text"
                required
                maxLength={4}
                pattern="[A-Z0-9]{4}"
                value={form.panLast4}
                onChange={(e) => setForm((f) => ({ ...f, panLast4: e.target.value.toUpperCase().slice(0, 4) }))}
                className="w-full h-10 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. 4567"
              />
              <p className="mt-1 text-[11px] text-ink-muted">PAN masked for privacy — only last 4 digits stored</p>
            </div>

            {/* DPDP consent — L15 / B3 */}
            <div className="rounded-lg border border-line bg-bg-subtle p-4">
              <h3 className="text-[13px] font-medium text-ink-primary mb-2">Marketing Consent (Optional)</h3>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="marketingConsent"
                  checked={form.marketingConsentGiven}
                  onChange={(e) => setForm((f) => ({ ...f, marketingConsentGiven: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded accent-accent flex-shrink-0"
                  aria-label="Marketing consent for insurance products"
                />
                <span className="text-[12px] text-ink-secondary leading-relaxed">
                  I agree to receive marketing communications about insurance products from BN Automobiles via WhatsApp and SMS.
                  {/* i18n key: insurance.consent.marketingPurpose — reviewed by legal before P3 */}
                </span>
              </label>
              <p className="mt-2 text-[11px] text-ink-muted">
                Purpose: INSURANCE_MARKETING. Consent can be withdrawn at any time. Lead is created regardless of this choice.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {submitting ? 'Creating...' : 'Create Lead'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="h-10 px-5 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-secondary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Gate>
  );
}
