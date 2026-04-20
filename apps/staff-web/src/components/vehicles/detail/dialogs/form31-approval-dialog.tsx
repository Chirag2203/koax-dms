'use client';

import { useState } from 'react';
import { Dialog, Gate } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { vehicleModuleCustomers } from '@dms/mocks/fixtures';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Form31ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  vin: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Form31ApprovalDialog({ open, onClose, vin }: Form31ApprovalDialogProps) {
  const [heirCustomerId, setHeirCustomerId] = useState('');
  const [scanUrl, setScanUrl] = useState('https://scan.stub/form31.pdf');
  const { user } = useStaffAuth();
  const approveForm31Transfer = useVehiclesStore((s) => s.approveForm31Transfer);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!heirCustomerId || !user) return;
    approveForm31Transfer(
      vin,
      heirCustomerId,
      scanUrl,
      { id: user.id, name: user.name, role: user.role },
    );
    onClose();
  }

  const inputClass = cn(
    'w-full h-10 rounded-md border border-line bg-bg-canvas px-3',
    'text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent',
  );

  return (
    <Gate role={['R12', 'R19', 'R22', 'R24']} fallback="hide">
      <Dialog
        open={open}
        onClose={onClose}
        title="Form 31 Approval — Deceased Transfer"
        subtitle={`VIN: ${vin}`}
        size="md"
        footer={
          <>
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-line text-sm text-ink-secondary hover:bg-bg-subtle transition-colors">
              Cancel
            </button>
            <button type="submit" form="form31-form" disabled={!heirCustomerId} className="h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40">
              Approve Transfer
            </button>
          </>
        }
      >
        <form id="form31-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">Heir Customer</label>
            <select value={heirCustomerId} onChange={(e) => setHeirCustomerId(e.target.value)} className={inputClass} required>
              <option value="">Select heir...</option>
              {vehicleModuleCustomers.filter((c) => !c.id.startsWith('cust-bn')).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">Form 31 Scan (URL stub)</label>
            <input className={inputClass} value={scanUrl} onChange={(e) => setScanUrl(e.target.value)} placeholder="https://..." />
            <p className="text-xs text-ink-muted mt-1">Upload integration ships in P5. Enter URL manually for now.</p>
          </div>
        </form>
      </Dialog>
    </Gate>
  );
}
