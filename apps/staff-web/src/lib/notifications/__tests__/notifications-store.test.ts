/**
 * Notifications store tests — SPEC-NOTIFICATIONS-001 §14
 *
 * Covers: recordSent (happy path, L1, L2, L4, L11, L18), cancelDispatch (L8),
 * recordStatusUpdate (L14 retry), selectors, createTemplate, editTemplate (L6),
 * markApproved (L2), submitForDlt, markRejected.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationsStore } from '../notifications-store';
import {
  TemplateNotApprovedError,
  DltIdRequiredError,
  MissingVariableError,
  DispatchNotCancellableError,
} from '@dms/types';
import type {
  NotificationTemplate,
  NotificationConsentSnapshot,
  RecordSentPayload,
  Actor,
} from '@dms/types';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// consent-bridge: by default allow dispatch with a frozen snapshot
vi.mock('../consent-bridge', () => ({
  checkConsentAtDispatch: vi.fn((_customerId: string, snapshot: NotificationConsentSnapshot) => ({
    allowed: true,
    snapshot,
  })),
  getPurposeForDispatch: vi.fn(() => 'SERVICE_REMINDER'),
}));

import { checkConsentAtDispatch } from '../consent-bridge';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const approvedSmsTemplate: NotificationTemplate = {
  id: 'tmpl-test-sms-approved',
  channel: 'SMS',
  module: 'SERVICE_BOOKING',
  name: 'Test SMS Approved',
  bodyMarkdown: 'Hello {{customer_name}}, booking {{job_no}} confirmed.',
  variables: [
    { name: 'customer_name', type: 'string', required: true, example: 'Test' },
    { name: 'job_no', type: 'string', required: true, example: 'JC-001' },
  ],
  status: 'APPROVED',
  dltTemplateId: 'DLT1234567890123456',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'staff-r12',
};

const approvedWhatsAppTemplate: NotificationTemplate = {
  id: 'tmpl-test-wa-approved',
  channel: 'WHATSAPP',
  module: 'INSURANCE',
  name: 'Test WhatsApp Approved',
  bodyMarkdown: 'Hello {{customer_name}}, your policy expires {{expiry_date}}.',
  variables: [
    { name: 'customer_name', type: 'string', required: true, example: 'Test' },
    { name: 'expiry_date', type: 'date', required: true, example: '01 Jun 2026' },
  ],
  status: 'APPROVED',
  dltTemplateId: 'DLT9876543210987654',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'staff-r12',
};

const draftTemplate: NotificationTemplate = {
  id: 'tmpl-test-draft',
  channel: 'SMS',
  module: 'SERVICE_BOOKING',
  name: 'Test Draft Template',
  bodyMarkdown: 'Draft body.',
  variables: [],
  status: 'DRAFT',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'staff-r12',
};

const pendingTemplate: NotificationTemplate = {
  id: 'tmpl-test-pending',
  channel: 'SMS',
  module: 'INSURANCE',
  name: 'Pending DLT Template',
  bodyMarkdown: 'Pending body.',
  variables: [],
  status: 'PENDING_DLT',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'staff-r12',
};

const approvedTemplateNoDltId: NotificationTemplate = {
  id: 'tmpl-test-approved-no-dlt',
  channel: 'WHATSAPP',
  module: 'INSURANCE',
  name: 'No DLT ID Template',
  bodyMarkdown: 'Body.',
  variables: [],
  status: 'APPROVED',
  dltTemplateId: undefined, // intentionally missing — L2 guard test
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'staff-r12',
};

const MOCK_CONSENT: NotificationConsentSnapshot = {
  purpose: 'SERVICE_REMINDER',
  capturedAt: '2026-01-01T00:00:00.000Z',
  capturedBy: 'staff-r09',
  source: 'STAFF_FORM',
};

const MOCK_ACTOR: Actor = { id: 'staff-r12', name: 'Priya Sharma', role: 'R12' };

function makePayload(
  overrides: Partial<RecordSentPayload> = {},
): RecordSentPayload {
  return {
    templateId: 'tmpl-test-sms-approved',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-test-001', raw: '+919876543210' },
    variables: { customer_name: 'Test User', job_no: 'JC-2026-00001' },
    consentSnapshot: MOCK_CONSENT,
    ...overrides,
  };
}

// ── Store setup helpers ────────────────────────────────────────────────────────

function seedStore(extras: NotificationTemplate[] = []) {
  useNotificationsStore.getState()._seed(
    [approvedSmsTemplate, approvedWhatsAppTemplate, draftTemplate, pendingTemplate, approvedTemplateNoDltId, ...extras],
    [],
    [],
  );
}

// ─── recordSent tests ─────────────────────────────────────────────────────────

describe('recordSent', () => {
  beforeEach(() => {
    seedStore();
    vi.mocked(checkConsentAtDispatch).mockReturnValue({
      allowed: true,
      snapshot: MOCK_CONSENT,
    });
  });

  it('happy path: creates dispatch with status sent (S-N-1)', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    expect(dispatch.status).toBe('sent');
    expect(dispatch.templateId).toBe('tmpl-test-sms-approved');
    expect(dispatch.consentSnapshot).toEqual(MOCK_CONSENT); // L18
    expect(dispatch.module).toBe('SERVICE_BOOKING');
  });

  it('L1: throws TemplateNotApprovedError for DRAFT template (S-N-4)', () => {
    expect(() =>
      useNotificationsStore
        .getState()
        .recordSent(makePayload({ templateId: 'tmpl-test-draft' })),
    ).toThrow(TemplateNotApprovedError);
  });

  it('L1: throws TemplateNotApprovedError for non-existent template', () => {
    expect(() =>
      useNotificationsStore
        .getState()
        .recordSent(makePayload({ templateId: 'tmpl-does-not-exist' })),
    ).toThrow(TemplateNotApprovedError);
  });

  it('L1: throws TemplateNotApprovedError for PENDING_DLT template', () => {
    expect(() =>
      useNotificationsStore
        .getState()
        .recordSent(makePayload({ templateId: 'tmpl-test-pending' })),
    ).toThrow(TemplateNotApprovedError);
  });

  it('L2: throws DltIdRequiredError for APPROVED WhatsApp template without dltTemplateId', () => {
    expect(() =>
      useNotificationsStore.getState().recordSent(
        makePayload({
          templateId: 'tmpl-test-approved-no-dlt',
          channel: 'WHATSAPP',
          module: 'INSURANCE',
          variables: {},
        }),
      ),
    ).toThrow(DltIdRequiredError);
  });

  it('L11: throws MissingVariableError for missing required variable (S-N-8)', () => {
    expect(() =>
      useNotificationsStore.getState().recordSent(
        makePayload({ variables: { customer_name: 'Test' } }), // missing job_no
      ),
    ).toThrow(MissingVariableError);
  });

  it('L11: MissingVariableError lists the missing variable names', () => {
    try {
      useNotificationsStore.getState().recordSent(makePayload({ variables: {} }));
    } catch (e) {
      expect(e).toBeInstanceOf(MissingVariableError);
      expect((e as Error).message).toContain('customer_name');
      expect((e as Error).message).toContain('job_no');
    }
  });

  it('L4: creates opted-out dispatch when consent revoked (S-N-3)', () => {
    vi.mocked(checkConsentAtDispatch).mockReturnValueOnce({
      allowed: false,
      snapshot: MOCK_CONSENT,
    });
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    expect(dispatch.status).toBe('opted-out');
  });

  it('L4: does not create audit sent event for opted-out dispatch', () => {
    vi.mocked(checkConsentAtDispatch).mockReturnValueOnce({
      allowed: false,
      snapshot: MOCK_CONSENT,
    });
    const before = useNotificationsStore.getState().auditEvents.length;
    useNotificationsStore.getState().recordSent(makePayload());
    const after = useNotificationsStore.getState().auditEvents;
    const newEvent = after[after.length - 1];
    expect(newEvent?.kind).toBe('consent-blocked');
    expect(after.length).toBe(before + 1);
  });

  it('L18: consent snapshot is frozen from checkConsentAtDispatch result', () => {
    const frozenSnapshot: NotificationConsentSnapshot = {
      purpose: 'WHATSAPP_MARKETING',
      capturedAt: '2025-01-01T00:00:00.000Z',
      capturedBy: 'PORTAL_SIGNUP',
      source: 'PORTAL_SIGNUP',
    };
    vi.mocked(checkConsentAtDispatch).mockReturnValueOnce({
      allowed: true,
      snapshot: frozenSnapshot,
    });
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    expect(dispatch.consentSnapshot).toEqual(frozenSnapshot);
  });

  it('appends dispatch to store dispatches array', () => {
    const before = useNotificationsStore.getState().dispatches.length;
    useNotificationsStore.getState().recordSent(makePayload());
    expect(useNotificationsStore.getState().dispatches.length).toBe(before + 1);
  });

  it('appends a sent audit event', () => {
    const before = useNotificationsStore.getState().auditEvents.length;
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    const events = useNotificationsStore.getState().auditEvents;
    const sentEvent = events.find((e) => e.dispatchId === dispatch.id && e.kind === 'sent');
    expect(sentEvent).toBeDefined();
    expect(useNotificationsStore.getState().auditEvents.length).toBe(before + 1);
  });
});

// ─── cancelDispatch tests ─────────────────────────────────────────────────────

describe('cancelDispatch', () => {
  beforeEach(() => {
    seedStore();
    vi.mocked(checkConsentAtDispatch).mockReturnValue({ allowed: true, snapshot: MOCK_CONSENT });
  });

  it('L8: cancels a queued dispatch (S-N-10)', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    // Manually set to queued for this test
    useNotificationsStore.getState()._seed(
      useNotificationsStore.getState().templates,
      [{ ...dispatch, status: 'queued' }],
      useNotificationsStore.getState().auditEvents,
    );

    useNotificationsStore.getState().cancelDispatch(dispatch.id, MOCK_ACTOR);
    const updated = useNotificationsStore.getState().dispatches.find((d) => d.id === dispatch.id);
    expect(updated?.status).toBe('cancelled');
  });

  it('L8: throws DispatchNotCancellableError for sent dispatch (S-N-11)', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    expect(() =>
      useNotificationsStore.getState().cancelDispatch(dispatch.id, MOCK_ACTOR),
    ).toThrow(DispatchNotCancellableError);
  });

  it('L8: appends cancelled audit event', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    useNotificationsStore.getState()._seed(
      useNotificationsStore.getState().templates,
      [{ ...dispatch, status: 'queued' }],
      [],
    );

    useNotificationsStore.getState().cancelDispatch(dispatch.id, MOCK_ACTOR);
    const events = useNotificationsStore.getState().auditEvents;
    const cancelEvent = events.find(
      (e) => e.dispatchId === dispatch.id && e.kind === 'cancelled',
    );
    expect(cancelEvent).toBeDefined();
    expect(cancelEvent?.actorId).toBe(MOCK_ACTOR.id);
  });

  it('L8: throws DispatchNotCancellableError for delivered dispatch', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    useNotificationsStore.getState()._seed(
      useNotificationsStore.getState().templates,
      [{ ...dispatch, status: 'delivered' }],
      [],
    );
    expect(() =>
      useNotificationsStore.getState().cancelDispatch(dispatch.id, MOCK_ACTOR),
    ).toThrow(DispatchNotCancellableError);
  });
});

// ─── recordStatusUpdate + L14 retry tests ─────────────────────────────────────

describe('recordStatusUpdate — L14 retry backoff', () => {
  beforeEach(() => {
    seedStore();
    vi.mocked(checkConsentAtDispatch).mockReturnValue({ allowed: true, snapshot: MOCK_CONSENT });
  });

  it('L14: first failure increments retryCount to 1 and sets status queued', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    useNotificationsStore
      .getState()
      .recordStatusUpdate(dispatch.id, 'failed', undefined, 'BSP_ERROR');

    const updated = useNotificationsStore.getState().dispatches.find((d) => d.id === dispatch.id);
    expect(updated?.retryCount).toBe(1);
    expect(updated?.status).toBe('queued');
  });

  it('L14: appends retry-queued audit event on first failure', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    useNotificationsStore
      .getState()
      .recordStatusUpdate(dispatch.id, 'failed', undefined, 'BSP_ERROR');

    const events = useNotificationsStore.getState().auditEvents;
    const retryEvent = events.find(
      (e) => e.dispatchId === dispatch.id && e.kind === 'retry-queued',
    );
    expect(retryEvent).toBeDefined();
  });

  it('L14: second failure increments retryCount to 2 (S-N-7)', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    useNotificationsStore.getState().recordStatusUpdate(dispatch.id, 'failed', undefined, 'ERR1');
    useNotificationsStore.getState().recordStatusUpdate(dispatch.id, 'failed', undefined, 'ERR2');

    const updated = useNotificationsStore.getState().dispatches.find((d) => d.id === dispatch.id);
    expect(updated?.retryCount).toBe(2);
    expect(updated?.status).toBe('queued');
  });

  it('L14: third failure makes dispatch terminal failed (S-N-7)', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    useNotificationsStore.getState().recordStatusUpdate(dispatch.id, 'failed', undefined, 'ERR1');
    useNotificationsStore.getState().recordStatusUpdate(dispatch.id, 'failed', undefined, 'ERR2');
    useNotificationsStore.getState().recordStatusUpdate(dispatch.id, 'failed', undefined, 'ERR3');

    const updated = useNotificationsStore.getState().dispatches.find((d) => d.id === dispatch.id);
    expect(updated?.retryCount).toBe(3);
    expect(updated?.status).toBe('failed');
  });

  it('L14: terminal failed dispatch appears in selectFailedDispatches', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    useNotificationsStore.getState().recordStatusUpdate(dispatch.id, 'failed', undefined, 'ERR');
    useNotificationsStore.getState().recordStatusUpdate(dispatch.id, 'failed', undefined, 'ERR');
    useNotificationsStore.getState().recordStatusUpdate(dispatch.id, 'failed', undefined, 'ERR');

    const failed = useNotificationsStore.getState().selectFailedDispatches();
    expect(failed.find((d) => d.id === dispatch.id)).toBeDefined();
  });

  it('updates status to delivered', () => {
    const dispatch = useNotificationsStore.getState().recordSent(makePayload());
    useNotificationsStore.getState().recordStatusUpdate(dispatch.id, 'delivered', 'prov-123');
    const updated = useNotificationsStore.getState().dispatches.find((d) => d.id === dispatch.id);
    expect(updated?.status).toBe('delivered');
    expect(updated?.providerMessageId).toBe('prov-123');
  });
});

// ─── Template actions ─────────────────────────────────────────────────────────

describe('createTemplate', () => {
  beforeEach(() => seedStore());

  it('creates a template in DRAFT status', () => {
    const tmpl = useNotificationsStore.getState().createTemplate({
      channel: 'SMS',
      module: 'CUSTOMERS',
      name: 'New Test Template',
      bodyMarkdown: 'Hello {{customer_name}}.',
      variables: [{ name: 'customer_name', type: 'string', required: true }],
      createdBy: 'staff-r12',
    });
    expect(tmpl.status).toBe('DRAFT');
    expect(tmpl.dltTemplateId).toBeUndefined();
  });
});

describe('submitForDlt', () => {
  beforeEach(() => seedStore());

  it('transitions DRAFT → PENDING_DLT', () => {
    const tmpl = useNotificationsStore.getState().submitForDlt('tmpl-test-draft', MOCK_ACTOR);
    expect(tmpl.status).toBe('PENDING_DLT');
  });

  it('throws if template is not DRAFT or REJECTED', () => {
    expect(() =>
      useNotificationsStore.getState().submitForDlt('tmpl-test-sms-approved', MOCK_ACTOR),
    ).toThrow();
  });
});

describe('markApproved', () => {
  beforeEach(() => seedStore());

  it('L2: throws DltIdRequiredError for SMS template with empty dltId (S-N-9)', () => {
    useNotificationsStore.getState().submitForDlt('tmpl-test-draft', MOCK_ACTOR);
    expect(() =>
      useNotificationsStore
        .getState()
        .markApproved('tmpl-test-draft', '', MOCK_ACTOR),
    ).toThrow(DltIdRequiredError);
  });

  it('approves PENDING_DLT template with valid DLT ID', () => {
    useNotificationsStore.getState().submitForDlt('tmpl-test-draft', MOCK_ACTOR);
    const tmpl = useNotificationsStore
      .getState()
      .markApproved('tmpl-test-draft', 'DLT1111111111111111', MOCK_ACTOR);
    expect(tmpl.status).toBe('APPROVED');
    expect(tmpl.dltTemplateId).toBe('DLT1111111111111111');
    expect(tmpl.approvedBy).toBe(MOCK_ACTOR.id);
  });

  it('sets approvedAt timestamp', () => {
    useNotificationsStore.getState().submitForDlt('tmpl-test-draft', MOCK_ACTOR);
    const tmpl = useNotificationsStore
      .getState()
      .markApproved('tmpl-test-draft', 'DLT1111111111111111', MOCK_ACTOR);
    expect(tmpl.approvedAt).toBeDefined();
  });
});

describe('editTemplate — L6 version fork', () => {
  beforeEach(() => seedStore());

  it('L6: editing APPROVED template creates new DRAFT + marks original DEPRECATED (S-N-5)', () => {
    const newTmpl = useNotificationsStore.getState().editTemplate(
      'tmpl-test-sms-approved',
      { bodyMarkdown: 'Updated body {{customer_name}}.' },
      MOCK_ACTOR,
    );
    expect(newTmpl.status).toBe('DRAFT');
    expect(newTmpl.supersedes).toBe('tmpl-test-sms-approved');
    expect(newTmpl.dltTemplateId).toBeUndefined(); // L6: DLT ID cleared

    const original = useNotificationsStore
      .getState()
      .templates.find((t) => t.id === 'tmpl-test-sms-approved');
    expect(original?.status).toBe('DEPRECATED');
    expect(original?.supersededBy).toBe(newTmpl.id);
  });

  it('L6: editing DRAFT template mutates in place', () => {
    useNotificationsStore.getState().editTemplate(
      'tmpl-test-draft',
      { name: 'Updated Draft Name' },
      MOCK_ACTOR,
    );
    const tmpl = useNotificationsStore
      .getState()
      .templates.find((t) => t.id === 'tmpl-test-draft');
    expect(tmpl?.name).toBe('Updated Draft Name');
    expect(tmpl?.status).toBe('DRAFT'); // status unchanged
  });

  it('L6: editing PENDING_DLT template throws', () => {
    expect(() =>
      useNotificationsStore
        .getState()
        .editTemplate('tmpl-test-pending', { name: 'Changed' }, MOCK_ACTOR),
    ).toThrow('under DLT review');
  });

  it('L6: new version from APPROVED retains original body until patch applied', () => {
    const original = useNotificationsStore
      .getState()
      .templates.find((t) => t.id === 'tmpl-test-sms-approved');
    const newBody = 'Updated body {{customer_name}} {{job_no}}.';
    const newTmpl = useNotificationsStore.getState().editTemplate(
      'tmpl-test-sms-approved',
      { bodyMarkdown: newBody },
      MOCK_ACTOR,
    );
    expect(newTmpl.bodyMarkdown).toBe(newBody);
    expect(original?.bodyMarkdown).not.toBe(newBody); // original unchanged
  });
});

// ─── Selectors ────────────────────────────────────────────────────────────────

describe('selectors', () => {
  beforeEach(() => {
    vi.mocked(checkConsentAtDispatch).mockReturnValue({ allowed: true, snapshot: MOCK_CONSENT });
    seedStore();
    // Seed some dispatches
    useNotificationsStore.getState().recordSent(makePayload());
    useNotificationsStore.getState().recordSent(
      makePayload({ module: 'INSURANCE', channel: 'WHATSAPP', templateId: 'tmpl-test-wa-approved',
        variables: { customer_name: 'Test', expiry_date: '01 Jun 2026' } }),
    );
  });

  it('selectDispatchesByModule returns only matching module', () => {
    const svc = useNotificationsStore.getState().selectDispatchesByModule('SERVICE_BOOKING');
    expect(svc.every((d) => d.module === 'SERVICE_BOOKING')).toBe(true);
  });

  it('selectDispatchesByRecipient returns dispatches for given customerId', () => {
    const dispatches = useNotificationsStore
      .getState()
      .selectDispatchesByRecipient('cust-test-001');
    expect(dispatches.every((d) => d.recipient.customerId === 'cust-test-001')).toBe(true);
  });

  it('selectApprovedTemplates returns only APPROVED templates', () => {
    const approved = useNotificationsStore.getState().selectApprovedTemplates();
    expect(approved.every((t) => t.status === 'APPROVED')).toBe(true);
  });

  it('selectApprovedTemplates filters by channel', () => {
    const sms = useNotificationsStore.getState().selectApprovedTemplates('SMS');
    expect(sms.every((t) => t.channel === 'SMS')).toBe(true);
  });

  it('selectDispatchPage returns first page with correct page size', () => {
    const result = useNotificationsStore.getState().selectDispatchPage(1, {});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.items.length).toBeLessThanOrEqual(50);
  });

  it('selectDispatchPage returns empty result for out-of-range page', () => {
    const result = useNotificationsStore.getState().selectDispatchPage(999, {});
    expect(result.items.length).toBe(0);
  });

  it('selectDispatchPage filters by module', () => {
    const result = useNotificationsStore
      .getState()
      .selectDispatchPage(1, { module: 'SERVICE_BOOKING' });
    expect(result.items.every((d) => d.module === 'SERVICE_BOOKING')).toBe(true);
  });

  it('selectDispatchPage orders by sentAt DESC (L12)', () => {
    const result = useNotificationsStore.getState().selectDispatchPage(1, {});
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i - 1]!.sentAt >= result.items[i]!.sentAt).toBe(true);
    }
  });
});
