/**
 * PiiMask — renders masked or plain PII depending on viewer role.
 * SPEC-NOTIFICATIONS-001 L3, L15
 *
 * - Phone: +91 XXXXX X{last4} for non-R23; full for R23 in audit view
 * - Name: first name only for non-R23; full for R23 in audit view
 */

'use client';

import { Lock } from 'lucide-react';
import { maskPhone, maskName } from '../../../lib/notifications/pii-redaction';

interface PiiPhoneProps {
  phone: string | undefined;
  /** When true: caller has verified this is a DPO (R23) view — show full PII */
  unmasked?: boolean;
}

export function PiiPhone({ phone, unmasked = false }: PiiPhoneProps) {
  if (!phone) return <span className="text-ink-muted">—</span>;

  if (unmasked) {
    return <span className="font-mono text-sm tabular-nums">{phone}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink-primary">
      <span className="font-mono tabular-nums">{maskPhone(phone)}</span>
      <Lock className="h-3 w-3 text-ink-muted shrink-0" aria-hidden="true" />
    </span>
  );
}

interface PiiNameProps {
  name: string | undefined;
  unmasked?: boolean;
}

export function PiiName({ name, unmasked = false }: PiiNameProps) {
  if (!name) return <span className="text-ink-muted">—</span>;

  if (unmasked) {
    return <span className="text-sm text-ink-primary">{name}</span>;
  }

  return <span className="text-sm text-ink-primary">{maskName(name)}</span>;
}
