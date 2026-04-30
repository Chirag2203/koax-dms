/**
 * NewLeadPage — /leads/new
 *
 * SPEC-LEADS-001 §9.3, SC-01, SC-12
 * L4: Walk-in form is staff-only (R05+) — gated via Gate.
 *
 * Pre-flight:
 * 1. Card + Field from detail-card.tsx
 * 2. text-xs/sm/base only
 * 3. rounded-md only
 * 4. Gate for RBAC, no inline hasRank
 * 5. i18n under leads.*
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LeadSource } from '@dms/types';
import { useLeadsStore } from '@/src/lib/leads/leads-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useOutlet } from '@/src/providers/outlet-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { Gate } from '@/src/components/primitives/gate';

type City = 'bangalore' | 'mumbai' | 'chennai';

const CUSTOMER_OPTIONS = [
  { id: 'cust-arjun-mehta',  name: 'Arjun Mehta' },
  { id: 'cust-priya-mehta',  name: 'Priya Mehta' },
  { id: 'cust-vikram-singh', name: 'Vikram Singh' },
  { id: 'cust-meera-iyer',   name: 'Meera Iyer' },
  { id: 'cust-rahul-kumar',  name: 'Rahul Kumar' },
  { id: 'cust-rohan-desai',  name: 'Rohan Desai' },
  { id: 'cust-neha-kapoor',  name: 'Neha Kapoor' },
  { id: 'cust-sunita-reddy', name: 'Sunita Reddy' },
  { id: 'cust-karan-shah',   name: 'Karan Shah' },
];

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'walk-in',         label: 'Walk-in' },
  { value: 'phone',           label: 'Phone' },
  { value: 'referral',        label: 'Referral' },
  { value: 'web-form',        label: 'Web Form' },
  { value: 'service-upgrade', label: 'Service Upgrade' },
];

const OUTLET_OPTIONS: { value: City; label: string }[] = [
  { value: 'bangalore', label: 'Bangalore (BLR)' },
  { value: 'mumbai',    label: 'Mumbai (MUM)' },
  { value: 'chennai',   label: 'Chennai (CHE)' },
];

function SelectField({
  id, label, value, onChange, options, required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-ink-muted uppercase tracking-wider mb-1">
        {label} {required && <span className="text-state-error">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border border-line bg-bg-canvas px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function NewLeadPage() {
  const t = useTranslations('leads.form');
  const router = useRouter();
  const { user } = useStaffAuth();
  const { outlet } = useOutlet();
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const { toasts, toast, dismiss } = useToast();

  const defaultOutlet = (outlet && outlet !== 'all' ? outlet : 'bangalore') as City;

  const [customerId, setCustomerId] = useState('');
  const [vin, setVin] = useState('');
  const [source, setSource] = useState<string>('walk-in');
  const [outletId, setOutletId] = useState<string>(defaultOutlet);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const vinOptions = Object.entries(vehicles).map(([v, veh]) => ({
    value: v,
    label: `${v} — ${veh.year} ${veh.make} ${veh.model}`,
  }));

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!customerId) errs.customerId = 'Customer is required.';
    if (!source) errs.source = 'Source is required.';
    if (!outletId) errs.outletId = 'Outlet is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !user) return;
    setSubmitting(true);
    try {
      const actor = { id: user.id, name: user.name, role: user.role };
      const newLead = useLeadsStore.getState().createLead(
        {
          source: source as LeadSource,
          customerId,
          outletId: outletId as City,
          vehicleInterestVin: vin || undefined,
          initialNote: notes.trim() || undefined,
        },
        actor,
      );
      router.push(`/leads/${newLead.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create lead.', 'error');
      setSubmitting(false);
    }
  }

  return (
    <Gate role={['R05', 'R09', 'R10', 'R12', 'R13', 'R19', 'R22', 'R24']} fallback="hide">
      <div className="max-w-xl mx-auto px-6 py-8">
        <button
          type="button"
          onClick={() => router.push('/leads')}
          className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink-primary mb-6 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Leads
        </button>

        <div className="rounded-md border border-line bg-bg-surface p-6">
          <h1 className="text-lg font-semibold text-ink-primary mb-1">{t('title')}</h1>
          <p className="text-sm text-ink-muted mb-6">{t('subtitle')}</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="new-lead-customer" className="block text-xs text-ink-muted uppercase tracking-wider mb-1">
                {t('customer')} <span className="text-state-error">*</span>
              </label>
              <select
                id="new-lead-customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-md border border-line bg-bg-canvas px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">{t('customerPlaceholder')}</option>
                {CUSTOMER_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              {errors.customerId && <p className="text-xs text-state-error mt-1">{errors.customerId}</p>}
            </div>

            <div>
              <label htmlFor="new-lead-vin" className="block text-xs text-ink-muted uppercase tracking-wider mb-1">
                {t('vehicleInterest')}
              </label>
              <select
                id="new-lead-vin"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="w-full rounded-md border border-line bg-bg-canvas px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">{t('vehicleInterestPlaceholder')}</option>
                {vinOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <SelectField
              id="new-lead-source"
              label={t('source')}
              value={source}
              onChange={setSource}
              options={SOURCE_OPTIONS}
              required
            />
            {errors.source && <p className="text-xs text-state-error -mt-3">{errors.source}</p>}

            <SelectField
              id="new-lead-outlet"
              label={t('outlet')}
              value={outletId}
              onChange={setOutletId}
              options={OUTLET_OPTIONS}
              required
            />
            {errors.outletId && <p className="text-xs text-state-error -mt-3">{errors.outletId}</p>}

            <div>
              <label htmlFor="new-lead-notes" className="block text-xs text-ink-muted uppercase tracking-wider mb-1">
                {t('notes')}
              </label>
              <textarea
                id="new-lead-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="w-full rounded-md border border-line bg-bg-canvas px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/leads')}
                className="h-9 px-4 rounded-md border border-line bg-bg-surface text-sm text-ink-secondary hover:bg-bg-hover transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {submitting ? 'Creating...' : t('submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </Gate>
  );
}
