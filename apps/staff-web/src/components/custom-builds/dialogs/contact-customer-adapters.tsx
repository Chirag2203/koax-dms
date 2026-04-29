/**
 * ContactCustomerAdapters — thin wrappers around WhatsappDialog + AiCallDialog
 * that accept a generic contact context rather than a sales Deal shape.
 *
 * L45 (locked): Contact buttons on build detail reuse WhatsappDialog +
 *   AiCallDialog from sales module via this thin adapter.
 *
 * Backwards compat: the underlying dialogs' props are unchanged.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 L45
 */

'use client';

import { useCallback } from 'react';
import { WhatsappDialog } from '@/src/components/sales/whatsapp-dialog';
import { AiCallDialog } from '@/src/components/sales/ai-call-dialog';
import type { Interaction } from '@dms/types';

// ─── Generic contact context ──────────────────────────────────────────────────

export interface ContactContext {
  customerId: string;
  customerName: string;
  customerPhone: string;
  contextNote?: string;
}

// ─── WhatsApp adapter ─────────────────────────────────────────────────────────

export interface BuildWhatsAppDialogProps {
  open: boolean;
  onClose: () => void;
  context: ContactContext;
  onMessageSent?: (interaction: Partial<Interaction>) => Promise<void>;
}

export function BuildWhatsAppDialog({
  open,
  onClose,
  context,
  onMessageSent,
}: BuildWhatsAppDialogProps) {
  const handleSent = useCallback(
    async (interaction: Partial<Interaction>) => {
      await onMessageSent?.(interaction);
    },
    [onMessageSent],
  );

  return (
    <WhatsappDialog
      open={open}
      onClose={onClose}
      // dealId is a required prop on the underlying dialog but only used internally
      // for the interaction record — we pass the customerId as the identifier.
      dealId={context.customerId}
      customerName={context.customerName}
      customerPhone={context.customerPhone}
      vehicleName={context.contextNote}
      onMessageSent={handleSent}
    />
  );
}

// ─── AI Call adapter ──────────────────────────────────────────────────────────

export interface BuildAiCallDialogProps {
  open: boolean;
  onClose: () => void;
  context: ContactContext;
  onCallLogged?: (interaction: Partial<Interaction>) => Promise<void>;
}

export function BuildAiCallDialog({
  open,
  onClose,
  context,
  onCallLogged,
}: BuildAiCallDialogProps) {
  const handleLogged = useCallback(
    async (interaction: Partial<Interaction>) => {
      await onCallLogged?.(interaction);
    },
    [onCallLogged],
  );

  return (
    <AiCallDialog
      open={open}
      onClose={onClose}
      dealId={context.customerId}
      customerName={context.customerName}
      vehicleName={context.contextNote}
      onCallLogged={handleLogged}
    />
  );
}
