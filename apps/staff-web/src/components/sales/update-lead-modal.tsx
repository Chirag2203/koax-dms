'use client';

import { useState, useRef } from 'react';
import { Car, X } from 'lucide-react';
import { cn } from '@dms/ui';
import { vehicles } from '@dms/mocks/fixtures';
import type { Deal } from '@dms/types';
import type { Vehicle } from '@dms/types';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpdateLeadModalProps {
  open: boolean;
  onClose: () => void;
  deal: Deal;
  onSaved: (updated: Partial<Deal>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
  'text-sm text-ink-primary placeholder:text-ink-muted',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'transition-colors',
);

const labelCls = 'block text-xs uppercase tracking-wide text-ink-muted mb-1.5 font-medium';
const errorCls = 'text-xs text-state-danger mt-1';

// ─── Vehicle combobox (inline) ────────────────────────────────────────────────

function VehicleCombobox({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (vin: string | undefined) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedVehicle = value
    ? (vehicles.find((v) => v.vin === value) ?? null)
    : null;

  const filtered =
    query.trim().length < 1
      ? []
      : vehicles
          .filter((v) => {
            const q = query.toLowerCase();
            return (
              v.vin.toLowerCase().includes(q) ||
              v.make.toLowerCase().includes(q) ||
              v.model.toLowerCase().includes(q) ||
              (v.variant?.toLowerCase().includes(q) ?? false)
            );
          })
          .slice(0, 8);

  function selectVehicle(vehicle: Vehicle) {
    onChange(vehicle.vin);
    setQuery('');
    setOpen(false);
  }

  function clearVehicle() {
    onChange(undefined);
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      {selectedVehicle ? (
        <div className="flex items-center gap-2 h-10 bg-bg-subtle border border-line rounded-md px-3">
          <Car className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="flex-1 text-sm text-ink-primary truncate">
            {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            {selectedVehicle.variant ? ` ${selectedVehicle.variant}` : ''}
          </span>
          <span className="font-mono text-xs text-ink-muted bg-bg-canvas rounded px-1.5 py-0.5 shrink-0">
            {selectedVehicle.vin}
          </span>
          <button
            type="button"
            onClick={clearVehicle}
            aria-label="Clear selected vehicle"
            className="shrink-0 rounded p-0.5 text-ink-muted hover:text-ink-primary transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
            <Car className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(e.target.value.length > 0);
            }}
            onFocus={() => query.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search VIN, Make, Model..."
            className={cn(inputCls, 'pl-9')}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            role="combobox"
          />
        </div>
      )}

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-md border border-line bg-bg-surface shadow-xl overflow-hidden"
        >
          {filtered.map((v) => (
            <li key={v.vin}>
              <button
                type="button"
                onMouseDown={() => selectVehicle(v)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-hover transition-colors"
                role="option"
                aria-selected={false}
              >
                <Car className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-ink-primary truncate">
                    {v.year} {v.make} {v.model} {v.variant ?? ''}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">{v.vin}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-line bg-bg-surface shadow-xl px-3 py-3">
          <p className="text-sm text-ink-muted">No matching vehicles found.</p>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UpdateLeadModal({ open, onClose, deal, onSaved }: UpdateLeadModalProps) {
  const { toasts, toast, dismiss } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState(deal.customerName);
  const [email, setEmail] = useState(deal.customerEmail ?? '');
  const [vehicleVin, setVehicleVin] = useState<string | undefined>(deal.vehicleVin);
  const [budgetMin, setBudgetMin] = useState(deal.budgetMin != null ? String(deal.budgetMin) : '');
  const [budgetMax, setBudgetMax] = useState(deal.budgetMax != null ? String(deal.budgetMax) : '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(deal.priority ?? 'medium');
  const [notes, setNotes] = useState(deal.notes ?? '');

  const [nameError, setNameError] = useState('');
  const [budgetError, setBudgetError] = useState('');

  function validate(): boolean {
    let ok = true;
    if (!customerName.trim() || customerName.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      ok = false;
    } else {
      setNameError('');
    }
    const min = budgetMin ? Number(budgetMin) : undefined;
    const max = budgetMax ? Number(budgetMax) : undefined;
    if (min !== undefined && max !== undefined && max < min) {
      setBudgetError('Max must be greater than or equal to min');
      ok = false;
    } else {
      setBudgetError('');
    }
    return ok;
  }

  function handleClose() {
    // Reset to deal values on close
    setCustomerName(deal.customerName);
    setEmail(deal.customerEmail ?? '');
    setVehicleVin(deal.vehicleVin);
    setBudgetMin(deal.budgetMin != null ? String(deal.budgetMin) : '');
    setBudgetMax(deal.budgetMax != null ? String(deal.budgetMax) : '');
    setPriority(deal.priority ?? 'medium');
    setNotes(deal.notes ?? '');
    setNameError('');
    setBudgetError('');
    onClose();
  }

  async function handleSave() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Partial<Deal> = {
        customerName: customerName.trim(),
        customerEmail: email.trim() || undefined,
        vehicleVin,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        priority,
        notes: notes.trim() || undefined,
      };
      const res = await fetch(`/api/staff/sales/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved(payload);
      toast('Lead updated', 'success');
      handleClose();
    } catch {
      toast('Could not save. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Update Lead"
        size="md"
        dirty={false}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Customer Name */}
          <div>
            <label htmlFor="ul-name" className={labelCls}>
              Customer name <span className="text-ink-muted" aria-hidden="true">*</span>
            </label>
            <input
              id="ul-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={cn(inputCls, nameError && 'border-state-danger')}
              aria-invalid={!!nameError}
            />
            {nameError && <p className={errorCls}>{nameError}</p>}
          </div>

          {/* Phone — read-only */}
          <div>
            <label htmlFor="ul-phone" className={labelCls}>
              Phone number
            </label>
            <input
              id="ul-phone"
              type="text"
              value={deal.customerPhone}
              readOnly
              className={cn(inputCls, 'opacity-60 cursor-not-allowed')}
              aria-describedby="ul-phone-hint"
            />
            <p id="ul-phone-hint" className="text-xs text-ink-muted mt-1">
              Phone is used as identity and cannot be changed
            </p>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="ul-email" className={labelCls}>
              Email address
            </label>
            <input
              id="ul-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className={inputCls}
            />
          </div>

          {/* Vehicle of interest */}
          <div>
            <label className={labelCls}>Vehicle of interest</label>
            <VehicleCombobox value={vehicleVin} onChange={setVehicleVin} />
          </div>

          {/* Budget range */}
          <div>
            <label className={labelCls}>Budget range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex">
                  <span className="flex items-center px-3 h-10 bg-bg-canvas border border-r-0 border-line rounded-l-md text-sm text-ink-secondary font-mono shrink-0">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Minimum"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    aria-label="Minimum budget"
                    className={cn(inputCls, 'rounded-l-none font-mono text-right', budgetError && 'border-state-danger')}
                  />
                </div>
              </div>
              <div>
                <div className="flex">
                  <span className="flex items-center px-3 h-10 bg-bg-canvas border border-r-0 border-line rounded-l-md text-sm text-ink-secondary font-mono shrink-0">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Maximum"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    aria-label="Maximum budget"
                    className={cn(inputCls, 'rounded-l-none font-mono text-right', budgetError && 'border-state-danger')}
                  />
                </div>
              </div>
            </div>
            {budgetError && <p className={errorCls}>{budgetError}</p>}
          </div>

          {/* Priority */}
          <div>
            <label className={labelCls}>Priority</label>
            <div className="flex items-center gap-1 bg-bg-subtle rounded-md p-0.5 border border-line w-fit">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'h-8 px-4 rounded text-xs font-medium capitalize transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    priority === p
                      ? 'bg-bg-surface text-ink-primary shadow-sm'
                      : 'text-ink-muted hover:text-ink-secondary',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="ul-notes" className={labelCls}>
              Notes
            </label>
            <div className="relative">
              <textarea
                id="ul-notes"
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context or requirements..."
                className={cn(
                  'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5',
                  'text-sm text-ink-primary placeholder:text-ink-muted resize-y min-h-[80px]',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  'transition-colors',
                )}
              />
              <p className="absolute bottom-2 right-3 font-mono text-xs text-ink-muted pointer-events-none">
                {notes.length}/1000
              </p>
            </div>
          </div>
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
