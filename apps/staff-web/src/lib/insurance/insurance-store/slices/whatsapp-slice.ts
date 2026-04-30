/**
 * WhatsApp slice — DLT enforcement + opt-out re-check + P3 campaign management.
 *
 * L13 / B1: sendTemplateMessage throws TemplateNotApprovedError if
 *   template.status !== 'APPROVED'. Slice-level fail-closed guard.
 * L14 / B2: opt-out re-checked at dispatch time, not audience-build time.
 * L_P3_1: scheduled campaigns re-evaluated against opt-out registry at dispatch time.
 *
 * Spec reference: SPEC-INSURANCE-001 §6, §32, L13, L14, L_P3_1
 */

import type { WhatsAppTemplate, WhatsAppCampaign } from '@dms/types';
import type {
  InsuranceSlice, WhatsAppActions,
  CreateTemplateParams, LaunchCampaignParams,
} from '../types';
import { TemplateNotApprovedError } from '../types';

export const createWhatsAppSlice: InsuranceSlice<WhatsAppActions> = (set, get) => ({
  /**
   * L13 (B1): Validates template is APPROVED at dispatch time.
   * L14 (B2): Re-checks live opt-out registry before sending.
   */
  async sendTemplateMessage(
    templateId: string,
    recipientId: string,
    _variables: Record<string, string>,
  ): Promise<{ messageId: string }> {
    // L13 / B1: fail-closed DLT guard
    const template = get().templates.find((t) => t.templateId === templateId);
    if (!template || template.status !== 'APPROVED') {
      throw new TemplateNotApprovedError(templateId);
    }

    // L14 / B2: re-check live opt-out registry at send time.
    //
    // Consent chain (DEF-PORTAL-1 / SPEC-CUSTOMER-PORTAL-001 §5.1):
    //   Portal toggle OFF  → recordPortalConsentChange(..., granted=false)
    //     → usePortalConsentStore.withdrawConsent(customerId, purpose, actor, reason)
    //       → sets revokedAt on the ConsentEntry in the portal-side consent store
    //         (customer-web/src/lib/portal/portal-consent-bridge.ts)
    //
    //   Staff revocation  → useCustomersStore.withdrawConsent(consentId, reason, actor)
    //     → sets revokedAt on the ConsentEntry in the staff-side customers-store
    //
    //   Both paths set revokedAt on the same ConsentEntry schema. In v1.1 both
    //   will write to the same DB table. In mock phase, the insurance optOuts
    //   Set here is the staff-side opt-out registry. Portal revocations in the
    //   customer-web process will not appear here until recordOptOut() is called
    //   explicitly (cross-process limitation of in-memory mocks).
    //
    //   Production path: this check will query the consent DB, and portal
    //   revocations will be visible within the same tick per L_PORTAL_2.
    const optOuts = get().optOuts;
    if (optOuts.has(recipientId)) {
      return { messageId: `skipped-optout-${recipientId}` };
    }

    // v1: mocked BSP
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return { messageId };
  },

  recordOptOut(customerId: string): void {
    set((state) => { state.optOuts.add(customerId); });
  },

  getOptOuts(): string[] {
    return Array.from(get().optOuts);
  },

  // ── P3: template management ────────────────────────────────────────────────

  createTemplate(params: CreateTemplateParams): WhatsAppTemplate {
    const now = new Date().toISOString();
    const templateId = `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const template: WhatsAppTemplate = {
      templateId,
      name: params.name,
      category: params.category,
      bodyText: params.bodyText,
      variables: params.variables,
      status: 'DRAFT',
      dltTemplateId: undefined,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => { state.templates.push(template); });
    return template;
  },

  updateTemplate(
    templateId: string,
    patch: Partial<Pick<WhatsAppTemplate, 'name' | 'bodyText' | 'variables' | 'category'>>,
  ): WhatsAppTemplate {
    set((state) => {
      const t = state.templates.find((x) => x.templateId === templateId);
      if (!t) throw new Error(`Template not found: ${templateId}`);
      // Can only edit DRAFT or REJECTED templates
      if (t.status === 'APPROVED' || t.status === 'PENDING_DLT') {
        throw new Error(`Template ${templateId} cannot be edited in status ${t.status}`);
      }
      if (patch.name !== undefined) t.name = patch.name;
      if (patch.bodyText !== undefined) t.bodyText = patch.bodyText;
      if (patch.variables !== undefined) t.variables = patch.variables;
      if (patch.category !== undefined) t.category = patch.category;
      t.updatedAt = new Date().toISOString();
    });
    return get().templates.find((t) => t.templateId === templateId)!;
  },

  submitForDlt(templateId: string): WhatsAppTemplate {
    set((state) => {
      const t = state.templates.find((x) => x.templateId === templateId);
      if (!t) throw new Error(`Template not found: ${templateId}`);
      if (t.status !== 'DRAFT' && t.status !== 'REJECTED') {
        throw new Error(`Only DRAFT/REJECTED templates can be submitted for DLT. Current: ${t.status}`);
      }
      t.status = 'PENDING_DLT';
      t.updatedAt = new Date().toISOString();
    });
    return get().templates.find((t) => t.templateId === templateId)!;
  },

  /**
   * R10+ marks template APPROVED once DLT ID entered.
   * L13: dltTemplateId must be non-null for APPROVED status.
   */
  markTemplateApproved(templateId: string, dltId: string): WhatsAppTemplate {
    if (!dltId || dltId.trim() === '') {
      throw new Error('dltTemplateId is required to approve a template (L13 / L9).');
    }
    set((state) => {
      const t = state.templates.find((x) => x.templateId === templateId);
      if (!t) throw new Error(`Template not found: ${templateId}`);
      t.status = 'APPROVED';
      t.dltTemplateId = dltId;
      t.updatedAt = new Date().toISOString();
    });
    return get().templates.find((t) => t.templateId === templateId)!;
  },

  // ── P3: campaign launcher ──────────────────────────────────────────────────

  /**
   * Launch (or schedule) a campaign.
   * L13: template must be APPROVED at launch time.
   * L_P3_1: opt-outs re-checked at dispatch time.
   */
  launchCampaign(params: LaunchCampaignParams): WhatsAppCampaign {
    // L13: template must be APPROVED
    const template = get().templates.find((t) => t.templateId === params.templateId);
    if (!template || template.status !== 'APPROVED') {
      throw new TemplateNotApprovedError(params.templateId);
    }

    const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    // Compute audience size (consent + non-opted-out leads)
    const leads = get().leads;
    const optOuts = get().optOuts;
    const audience = leads.filter((l) => {
      if (!l.marketingConsentGiven) return false;
      if (optOuts.has(l.customerId)) return false;
      if (params.audienceFilter.cities && !params.audienceFilter.cities.includes(l.outlet)) return false;
      if (params.audienceFilter.expiryWindowDays && l.expiresAt) {
        const days = Math.ceil(
          (new Date(l.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (days > params.audienceFilter.expiryWindowDays) return false;
      }
      return true;
    });

    const status = params.scheduledAt ? 'scheduled' : 'sending';
    const campaign: WhatsAppCampaign = {
      campaignId,
      name: params.name,
      templateId: params.templateId,
      audienceFilter: params.audienceFilter,
      scheduledAt: params.scheduledAt,
      status,
      stats: {
        targeted: audience.length,
        sent: 0,
        delivered: 0,
        read: 0,
        replied: 0,
        optedOut: 0,
        failed: 0,
      },
      createdBy: params.createdBy,
      createdAt: now,
    };

    set((state) => { state.campaigns.push(campaign); });
    return campaign;
  },
});
