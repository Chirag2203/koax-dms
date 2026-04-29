'use client';

/**
 * Edit outlet dialog — SPEC-SETTINGS-001 §6.3
 * L2: GSTIN regex validation.
 * L3: Manager dropdown filtered to R03+ at outlet.
 * L8: Contact fields labelled as office numbers.
 * L10: code field displayed as read-only.
 * R02+ only.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/src/components/primitives/dialog';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useSettingsStore } from '@/src/lib/settings/settings-store';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { isValidGstin } from '@/src/lib/settings/gstin-validator';
import { hasRank } from '@dms/types';
import type { OutletConfig, StaffRoleCode } from '@dms/types';
import { cn } from '@dms/ui';

interface EditOutletDialogProps {
  outlet: OutletConfig;
  open: boolean;
  onClose: () => void;
}

// ─── Form input class (canonical per SPEC-ARCH-UI-001 §12) ───────────────────
const INPUT_CLASS =
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';
const ERROR_INPUT_CLASS = 'border-state-danger focus:border-state-danger focus:ring-state-danger/30';
const LABEL_CLASS = 'block text-xs text-ink-muted uppercase tracking-wider mb-1.5';
const ERROR_CLASS = 'text-xs text-state-danger mt-1';

export function EditOutletDialog({ outlet, open, onClose }: EditOutletDialogProps) {
  const t = useTranslations('staff.settings');
  const { updateOutlet, deactivateOutlet, reactivateOutlet, outlets } = useSettingsStore();
  const { staffById } = useStaffStore();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  // Map outlet code to city name for staff filtering (Seam 18)
  const CODE_TO_CITY: Record<string, string> = {
    BLR: 'bangalore',
    MUM: 'mumbai',
    CHE: 'chennai',
  };
  const outletCity = CODE_TO_CITY[outlet.code] ?? '';

  // L3: Manager dropdown — staff with R03+ at this outlet
  const eligibleManagers = useMemo(() => {
    return Object.values(staffById).filter(
      (s) => s.outlet === outletCity && hasRank(s.role as StaffRoleCode, 'R03'),
    );
  }, [staffById, outletCity]);

  // Form state
  const [name, setName] = useState(outlet.name);
  const [line1, setLine1] = useState(outlet.address.line1);
  const [line2, setLine2] = useState(outlet.address.line2 ?? '');
  const [city, setCity] = useState(outlet.address.city);
  const [state, setState] = useState(outlet.address.state);
  const [pin, setPin] = useState(outlet.address.pin);
  const [gstin, setGstin] = useState(outlet.gstin);
  const [managerId, setManagerId] = useState(outlet.managerId);
  const [contactPhone, setContactPhone] = useState(outlet.contactPhone);
  const [contactEmail, setContactEmail] = useState(outlet.contactEmail);

  // Validation errors
  const [gstinError, setGstinError] = useState('');
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);

  const isDirty =
    name !== outlet.name ||
    line1 !== outlet.address.line1 ||
    line2 !== (outlet.address.line2 ?? '') ||
    city !== outlet.address.city ||
    state !== outlet.address.state ||
    pin !== outlet.address.pin ||
    gstin !== outlet.gstin ||
    managerId !== outlet.managerId ||
    contactPhone !== outlet.contactPhone ||
    contactEmail !== outlet.contactEmail;

  const validateGstin = (value: string) => {
    if (!isValidGstin(value)) {
      setGstinError(t('outlets.edit.errors.gstinInvalid', { example: `${outlet.address.state === 'Karnataka' ? '29' : outlet.address.state === 'Maharashtra' ? '27' : '33'}AABCT1332L1ZQ` }));
      return false;
    }
    setGstinError('');
    return true;
  };

  const validatePin = (value: string) => {
    if (!/^\d{6}$/.test(value)) {
      setPinError(t('outlets.edit.errors.pinInvalid'));
      return false;
    }
    setPinError('');
    return true;
  };

  const canSave =
    !gstinError &&
    !pinError &&
    name.trim().length > 0 &&
    line1.trim().length > 0 &&
    city.trim().length > 0 &&
    pin.trim().length === 6 &&
    isValidGstin(gstin) &&
    managerId.trim().length > 0 &&
    isDirty;

  const handleSave = async () => {
    if (!user) return;
    if (!validateGstin(gstin)) return;
    if (!validatePin(pin)) return;

    setSaving(true);
    try {
      // Build staffProfiles map for manager validation (Seam 18)
      const staffProfiles: Record<string, { role: StaffRoleCode; outlet: string }> = {};
      for (const s of Object.values(staffById)) {
        staffProfiles[s.id] = { role: s.role as StaffRoleCode, outlet: s.outlet };
      }

      updateOutlet(
        outlet.id,
        {
          name,
          address: { line1, line2: line2 || undefined, city, state, pin },
          gstin,
          managerId,
          contactPhone,
          contactEmail,
        },
        { id: user.id, role: user.role },
        staffProfiles,
      );
      toast(t('outlets.edit.savedToast', { name }), 'success');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('outlets.edit.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <Dialog
        open={open}
        onClose={onClose}
        title={t('outlets.edit.title', { name: outlet.name })}
        subtitle={t('outlets.edit.subtitle')}
        size="lg"
        dirty={isDirty}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Identification */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">{t('outlets.edit.sections.identification')}</p>
            <div className="grid grid-cols-2 gap-4">
              {/* L10: code is read-only */}
              <div>
                <label className={LABEL_CLASS}>{t('outlets.edit.fields.code')}</label>
                <div className="h-10 w-full bg-bg-subtle/50 border border-line rounded-md px-3 flex items-center">
                  <span className="font-mono text-sm text-ink-muted">{outlet.code}</span>
                  <span className="ml-2 text-[10px] text-ink-muted">{t('outlets.edit.codeImmutable')}</span>
                </div>
              </div>
              <div>
                <label htmlFor="outlet-name" className={LABEL_CLASS}>{t('outlets.edit.fields.name')}</label>
                <input
                  id="outlet-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            {/* L2: GSTIN validation */}
            <div className="mt-4">
              <label htmlFor="outlet-gstin" className={LABEL_CLASS}>{t('outlets.edit.fields.gstin')}</label>
              <input
                id="outlet-gstin"
                type="text"
                value={gstin}
                onChange={(e) => {
                  setGstin(e.target.value.toUpperCase());
                  if (gstinError) validateGstin(e.target.value.toUpperCase());
                }}
                onBlur={(e) => validateGstin(e.target.value.toUpperCase())}
                className={cn(INPUT_CLASS, gstinError && ERROR_INPUT_CLASS, 'font-mono')}
                maxLength={15}
                placeholder="29AABCT1332L1ZQ"
              />
              {gstinError && <p className={ERROR_CLASS}>{gstinError}</p>}
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">{t('outlets.edit.sections.address')}</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="outlet-line1" className={LABEL_CLASS}>{t('outlets.edit.fields.line1')}</label>
                <input id="outlet-line1" type="text" value={line1} onChange={(e) => setLine1(e.target.value)} className={INPUT_CLASS} />
              </div>
              <div>
                <label htmlFor="outlet-line2" className={LABEL_CLASS}>{t('outlets.edit.fields.line2')}</label>
                <input id="outlet-line2" type="text" value={line2} onChange={(e) => setLine2(e.target.value)} className={INPUT_CLASS} placeholder={t('outlets.edit.fields.line2Placeholder')} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="outlet-city" className={LABEL_CLASS}>{t('outlets.edit.fields.city')}</label>
                  <input id="outlet-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label htmlFor="outlet-state" className={LABEL_CLASS}>{t('outlets.edit.fields.state')}</label>
                  <input id="outlet-state" type="text" value={state} onChange={(e) => setState(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label htmlFor="outlet-pin" className={LABEL_CLASS}>{t('outlets.edit.fields.pin')}</label>
                  <input
                    id="outlet-pin"
                    type="text"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      if (pinError) validatePin(e.target.value);
                    }}
                    onBlur={(e) => validatePin(e.target.value)}
                    className={cn(INPUT_CLASS, pinError && ERROR_INPUT_CLASS, 'font-mono')}
                    maxLength={6}
                    placeholder="560071"
                  />
                  {pinError && <p className={ERROR_CLASS}>{pinError}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Contact — L8: office numbers only */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">{t('outlets.edit.sections.contact')}</p>
            <p className="text-xs text-ink-muted mb-3">{t('outlets.edit.contactNote')}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="outlet-phone" className={LABEL_CLASS}>{t('outlets.edit.fields.phone')}</label>
                <input id="outlet-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={INPUT_CLASS} />
              </div>
              <div>
                <label htmlFor="outlet-email" className={LABEL_CLASS}>{t('outlets.edit.fields.email')}</label>
                <input id="outlet-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={INPUT_CLASS} />
              </div>
            </div>
          </div>

          {/* Management — L3: manager dropdown filtered to R03+ at outlet */}
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">{t('outlets.edit.sections.management')}</p>
            <div>
              <label htmlFor="outlet-manager" className={LABEL_CLASS}>{t('outlets.edit.fields.manager')}</label>
              {eligibleManagers.length === 0 ? (
                <p className="text-xs text-state-danger mt-1">{t('outlets.edit.noEligibleManagers')}</p>
              ) : (
                <select
                  id="outlet-manager"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {eligibleManagers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.roleName}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-ink-muted mt-1">{t('outlets.edit.managerNote')}</p>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
