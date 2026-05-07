/**
 * SPEC-SERVICE-INTAKE-001 — T13 unit tests
 *
 * Tests are mapped to spec §10 scenarios and QA findings.
 * All test store state is isolated via the module-level mock approach —
 * each test calls useServiceStore.getState() and resets via store.setState().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useServiceStore } from '../service-store';
import type { Actor } from '../service-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SA_ACTOR: Actor & { role: string } = {
  id: 'emp-r09-001',
  name: 'Priya SA',
  role: 'R09',
};

const GM_ACTOR: Actor & { role: string } = {
  id: 'emp-r19-001',
  name: 'Rohan GM',
  role: 'R19',
};

const MANAGER_ACTOR: Actor & { role: string } = {
  id: 'emp-r03-001',
  name: 'Suresh Manager',
  role: 'R03',
};

const TECH_ACTOR: Actor & { role: string } = {
  id: 'emp-r11-001',
  name: 'Vijay Tech',
  role: 'R11',
};

/** Minimal valid intake input (excludes auto-minted fields) */
function makeIntakeInput(jobCardId: string) {
  return {
    jobCardId,
    outletId: 'outlet-blr-001',
    inspectionAt: new Date().toISOString(),
    regNumber: 'KA01-XX-1234',
    odometerKm: 45_000,
    fuelLevel: 'Q2' as const,
    battery12VCondition: 'OK' as const,
    tyreCondition: {
      FL: 'GOOD' as const,
      FR: 'GOOD' as const,
      RL: 'GOOD' as const,
      RR: 'GOOD' as const,
    },
    acFunctional: true,
    wipersFunctional: true,
    lightsFunctional: true,
    dashboardWarningLightsNote: '',
    spareTyrePresent: true,
    toolKitPresent: true,
    keyCount: '2' as const,
    serviceBookPresent: false,
    rcInVehicle: 'PRESENT' as const,
    insuranceCertInVehicle: 'PRESENT' as const,
    cabinAccessoriesNote: '',
    damageCalloutIds: [],
    saName: 'Priya SA',
    saEmployeeId: 'emp-r09-001',
    saSignatureDataUrl: 'data:image/png;base64,SA_SIG_BASE64',
    saSignedAt: new Date().toISOString(),
    nextActionNoteForWorkshop: '',
  };
}

/** Reset the store's intake arrays and timeline events before each test */
function resetIntakeState() {
  useServiceStore.setState((s) => ({
    ...s,
    intakeInspections: [],
    intakeDamageCallouts: [],
    intakeInspectionPhotos: [],
    // Reset timeline events so event lookups in tests are unambiguous
    timelineEvents: s.timelineEvents.filter((e) => {
      // Keep fixture events; remove any intake events added in prior tests
      const meta = e.metadata as Record<string, unknown>;
      return !meta?.event || !String(meta.event).startsWith('intake_');
    }),
  }));
}

// ─── SC-1: recordIntakeInspection — happy path ────────────────────────────────

describe('SC-1: recordIntakeInspection (happy path)', () => {
  beforeEach(resetIntakeState);

  it('creates intake with state=DRAFT, version=1, retainUntil 5y from now', () => {
    const store = useServiceStore.getState();
    // Use a known fixture JC id (from service fixtures)
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);

    const state = useServiceStore.getState();
    const intake = state.intakeInspections.find((i) => i.id === intakeId);

    expect(intake).toBeDefined();
    expect(intake?.state).toBe('DRAFT');
    expect(intake?.version).toBe(1);
    expect(intake?.retentionPolicy).toBe('INTAKE_INSPECTION_5Y');
    expect(intake?.amendments).toHaveLength(0);

    // L7: retainUntil = createdAt + 5y
    const retainYear = parseInt(intake!.retainUntil.slice(0, 4), 10);
    const thisYear = new Date().getFullYear();
    expect(retainYear).toBe(thisYear + 5);
  });

  it('patches JobCard.intakeInspectionId with the new intake id', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);

    const jc = useServiceStore.getState().jobCards.find((j) => j.id === testJcId);
    expect(jc?.intakeInspectionId).toBe(intakeId);
  });

  it('emits a timeline event with intake_recorded metadata including actorRole (QA #5)', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';
    const eventsBefore = useServiceStore.getState().timelineEvents.length;

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);

    const eventsAfter = useServiceStore.getState().timelineEvents;
    const intakeEvent = eventsAfter.find(
      (e) =>
        e.jobCardId === testJcId &&
        (e.metadata as Record<string, unknown>)?.event === 'intake_recorded',
    );
    expect(intakeEvent).toBeDefined();
    expect((intakeEvent?.metadata as Record<string, unknown>)?.actorRole).toBe('R09');
    // intakeId returned by action must match what was stored in the event metadata
    expect((intakeEvent?.metadata as Record<string, unknown>)?.intakeInspectionId).toBe(intakeId);
    expect(eventsAfter.length).toBe(eventsBefore + 1);
  });
});

// ─── SC-4: captureCustomerSignature ──────────────────────────────────────────

describe('SC-4: captureCustomerSignature — DRAFT → CUSTOMER_SIGNED', () => {
  beforeEach(resetIntakeState);

  it('transitions state from DRAFT to CUSTOMER_SIGNED', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,CUSTOMER_SIG', SA_ACTOR);

    const intake = useServiceStore.getState().intakeInspections.find((i) => i.id === intakeId);
    expect(intake?.state).toBe('CUSTOMER_SIGNED');
    expect(intake?.customerSignatureDataUrl).toBe('data:image/png;base64,CUSTOMER_SIG');
    expect(intake?.customerSignedAt).toBeDefined();
  });

  it('does not transition if state is not DRAFT', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    // First signature should work
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,SIG1', SA_ACTOR);
    // Second call when already CUSTOMER_SIGNED — should be a no-op (state guard)
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,SIG2', SA_ACTOR);

    const intake = useServiceStore.getState().intakeInspections.find((i) => i.id === intakeId);
    // State should remain CUSTOMER_SIGNED (not regressed to DRAFT)
    expect(intake?.state).toBe('CUSTOMER_SIGNED');
    // The first signature should be preserved (second call was no-op)
    expect(intake?.customerSignatureDataUrl).toBe('data:image/png;base64,SIG1');
  });
});

// ─── SC-7: attachSignedSheet ──────────────────────────────────────────────────

describe('SC-7: attachSignedSheet — CUSTOMER_SIGNED → COMPLETED', () => {
  beforeEach(resetIntakeState);

  it('transitions to COMPLETED and sets signedSheetAttachmentId', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,CUSTOMER_SIG', SA_ACTOR);
    store.attachSignedSheet(
      intakeId,
      {
        jobCardId: testJcId,
        dataUrl: 'data:application/pdf;base64,PDF_BASE64',
        name: 'signed-intake.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      },
      SA_ACTOR,
    );

    const intake = useServiceStore.getState().intakeInspections.find((i) => i.id === intakeId);
    expect(intake?.state).toBe('COMPLETED');
    expect(intake?.signedSheetAttachmentId).toBeDefined();
    expect(intake?.signedSheetUploadedAt).toBeDefined();
  });

  it('sets JC.intakeInspectionCompletedAt on COMPLETED', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,CUSTOMER_SIG', SA_ACTOR);
    store.attachSignedSheet(
      intakeId,
      {
        jobCardId: testJcId,
        dataUrl: 'data:application/pdf;base64,PDF_BASE64',
        name: 'signed-intake.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      },
      SA_ACTOR,
    );

    const jc = useServiceStore.getState().jobCards.find((j) => j.id === testJcId);
    expect(jc?.intakeInspectionCompletedAt).toBeDefined();
  });
});

// ─── SC-9: amendIntake ────────────────────────────────────────────────────────

describe('SC-9: amendIntake — COMPLETED → AMENDED, version bumps', () => {
  beforeEach(resetIntakeState);

  function createCompletedIntake() {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,CUSTOMER_SIG', SA_ACTOR);
    store.attachSignedSheet(
      intakeId,
      {
        jobCardId: testJcId,
        dataUrl: 'data:application/pdf;base64,PDF_BASE64',
        name: 'signed-intake.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      },
      SA_ACTOR,
    );
    return intakeId;
  }

  it('transitions COMPLETED → AMENDED, bumps version, appends amendment row', () => {
    const intakeId = createCompletedIntake();
    const result = useServiceStore.getState().amendIntake(
      intakeId,
      { odometerKm: { before: 45_000, after: 45_120 } },
      'OCR mismatch with photo; corrected per actual reading.',
      GM_ACTOR,
    );
    expect(result.ok).toBe(true);

    const intake = useServiceStore.getState().intakeInspections.find((i) => i.id === intakeId);
    expect(intake?.state).toBe('AMENDED');
    expect(intake?.version).toBe(2);
    expect(intake?.amendments).toHaveLength(1);
    expect(intake?.amendments[0]?.byRole).toBe('R19');
    expect(intake?.amendments[0]?.changedFields).toContain('odometerKm');
  });

  it('supports re-amendment (AMENDED → AMENDED) — version increments again', () => {
    const intakeId = createCompletedIntake();

    useServiceStore.getState().amendIntake(
      intakeId,
      { odometerKm: { before: 45_000, after: 45_120 } },
      'OCR mismatch with photo; corrected per actual reading.',
      GM_ACTOR,
    );

    const result = useServiceStore.getState().amendIntake(
      intakeId,
      { fuelLevel: { before: 'Q2', after: 'Q3' } },
      'Fuel level re-checked after refuelling before reception.',
      GM_ACTOR,
    );
    expect(result.ok).toBe(true);

    const intake = useServiceStore.getState().intakeInspections.find((i) => i.id === intakeId);
    expect(intake?.version).toBe(3);
    expect(intake?.amendments).toHaveLength(2);
  });
});

// ─── SC-10: amendIntake rejects R09 (rank below R12 required by L8) ──────────

describe('SC-10: amendIntake rejects R09 actor', () => {
  beforeEach(resetIntakeState);

  it('returns UNAUTHORIZED for R09 trying to amend', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,CUSTOMER_SIG', SA_ACTOR);
    store.attachSignedSheet(
      intakeId,
      {
        jobCardId: testJcId,
        dataUrl: 'data:application/pdf;base64,PDF_BASE64',
        name: 'signed-intake.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      },
      SA_ACTOR,
    );

    const result = useServiceStore.getState().amendIntake(
      intakeId,
      { odometerKm: { before: 45_000, after: 45_120 } },
      'Tried to amend as SA — should fail.',
      SA_ACTOR, // R09 — not allowed
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('UNAUTHORIZED');
    }

    // Intake state must be unchanged
    const intake = useServiceStore.getState().intakeInspections.find((i) => i.id === intakeId);
    expect(intake?.state).toBe('COMPLETED');
    expect(intake?.version).toBe(1);
    expect(intake?.amendments).toHaveLength(0);
  });

  it('also rejects R11 (Workshop Tech)', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,CUSTOMER_SIG', SA_ACTOR);
    store.attachSignedSheet(
      intakeId,
      {
        jobCardId: testJcId,
        dataUrl: 'data:application/pdf;base64,PDF_BASE64',
        name: 'signed-intake.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      },
      SA_ACTOR,
    );

    const result = useServiceStore.getState().amendIntake(
      intakeId,
      { odometerKm: { before: 45_000, after: 45_120 } },
      'Tech trying to amend — should fail.',
      TECH_ACTOR, // R11 — not allowed
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('UNAUTHORIZED');
  });
});

// ─── SC-17 (B6): attachSignedSheet REJECTS from DRAFT ────────────────────────

describe('SC-17 / B6: attachSignedSheet rejects from DRAFT state', () => {
  beforeEach(resetIntakeState);

  it('rejects upload when state is DRAFT (no signature captured yet)', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    // Do NOT call captureCustomerSignature — go straight to attachSignedSheet
    store.attachSignedSheet(
      intakeId,
      {
        jobCardId: testJcId,
        dataUrl: 'data:application/pdf;base64,PDF_BASE64',
        name: 'signed-intake.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      },
      SA_ACTOR,
    );

    // State must remain DRAFT — the attachment must have been rejected
    const intake = useServiceStore.getState().intakeInspections.find((i) => i.id === intakeId);
    expect(intake?.state).toBe('DRAFT');
    expect(intake?.signedSheetAttachmentId).toBeUndefined();
  });
});

// ─── L8 tightened: scalarDiffs MUST NOT contain data: image URLs ─────────────

describe('L8 tightened: amendment audit redaction', () => {
  beforeEach(resetIntakeState);

  function createCompletedIntake() {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,CUSTOMER_SIG', SA_ACTOR);
    store.attachSignedSheet(
      intakeId,
      {
        jobCardId: testJcId,
        dataUrl: 'data:application/pdf;base64,PDF_BASE64',
        name: 'signed-intake.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      },
      SA_ACTOR,
    );
    return intakeId;
  }

  it('rejects scalarDiffs that contain customerSignatureDataUrl', () => {
    const intakeId = createCompletedIntake();

    const result = useServiceStore.getState().amendIntake(
      intakeId,
      {
        customerSignatureDataUrl: {
          before: 'data:image/png;base64,OLD_SIG',
          after: 'data:image/png;base64,NEW_SIG',
        },
      },
      'Attempting to store signature data in amendment.',
      GM_ACTOR,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('PII_IN_DIFFS');
  });

  it('scalarDiffs in amendments array do NOT contain data:image/ substrings', () => {
    const intakeId = createCompletedIntake();

    useServiceStore.getState().amendIntake(
      intakeId,
      {
        odometerKm: { before: 45_000, after: 45_120 },
        fuelLevel: { before: 'Q2', after: 'Q3' },
      },
      'Valid amendment with scalar fields only.',
      GM_ACTOR,
    );

    const intake = useServiceStore.getState().intakeInspections.find((i) => i.id === intakeId);
    expect(intake?.amendments).toHaveLength(1);
    // L8 tightened: assertion that no data:image/ substring appears in any amendment row
    expect(JSON.stringify(intake!.amendments[0]!).indexOf('data:image')).toBe(-1);
  });
});

// ─── QA #4: addIntakePhoto rejects > 1 MB ────────────────────────────────────

describe('QA #4: addIntakePhoto rejects photos > 1 MB', () => {
  beforeEach(resetIntakeState);

  it('rejects a photo that exceeds 1 MB', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);

    // Create a base64 string that encodes > 1 MB of data
    // 1 MB = 1,048,576 bytes; base64 = ~1.33x → need ~1,398,102 chars of base64
    // We'll use a string slightly over that length to simulate a large image
    const overLimitBase64 = 'A'.repeat(1_600_000); // well over 1 MB when decoded

    const result = store.addIntakePhoto(intakeId, overLimitBase64, 'front_3q_driver', SA_ACTOR);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('PHOTO_TOO_LARGE');

    // Verify no photo was added
    const photos = useServiceStore.getState().intakeInspectionPhotos;
    expect(photos.filter((p) => p.intakeInspectionId === intakeId)).toHaveLength(0);
  });

  it('accepts a photo within the 1 MB limit', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);

    // Small valid base64 PNG stub
    const smallBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

    const result = store.addIntakePhoto(intakeId, smallBase64, 'front_3q_driver', SA_ACTOR);

    expect(result.ok).toBe(true);
  });
});

// ─── L5 slot uniqueness: addIntakePhoto replaces existing slot ────────────────

describe('L5: slot uniqueness — addIntakePhoto replaces an existing slot', () => {
  beforeEach(resetIntakeState);

  it('replaces an existing photo when the same slot is used again', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);

    const smallBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

    const result1 = store.addIntakePhoto(intakeId, `${smallBase64}_v1`, 'odometer', SA_ACTOR);
    const result2 = store.addIntakePhoto(intakeId, `${smallBase64}_v2`, 'odometer', SA_ACTOR);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    const photos = useServiceStore.getState().intakeInspectionPhotos.filter(
      (p) => p.intakeInspectionId === intakeId && p.slot === 'odometer',
    );
    // L5: slot uniqueness — exactly one photo per slot
    expect(photos).toHaveLength(1);
    // The second photo should be the one retained
    expect(photos[0]?.dataUrl).toContain('_v2');
  });
});

// ─── SC-16 / L13: selectIntakesByCustomerId two-hop join ─────────────────────

describe('SC-16 / L13: selectIntakesByCustomerId — two-hop join through JC', () => {
  beforeEach(resetIntakeState);

  it('returns intake records for a given customer via JC.customerId', () => {
    const store = useServiceStore.getState();

    // Find JCs with the same customer from fixtures
    const jobCards = store.jobCards;
    // Use the first available JC and its customerId
    const testJc = jobCards[0];
    if (!testJc) return; // skip if no fixtures

    const customerId = testJc.customerId;

    // Record an intake for this JC
    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJc.id), SA_ACTOR);

    const result = useServiceStore.getState().selectIntakesByCustomerId(customerId);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((i) => i.id === intakeId)).toBe(true);
    // All returned intakes should belong to this customer's JCs
    const customerJcIds = new Set(
      jobCards.filter((jc) => jc.customerId === customerId).map((jc) => jc.id),
    );
    for (const intake of result) {
      expect(customerJcIds.has(intake.jobCardId)).toBe(true);
    }
  });

  it('returns empty array for a customer with no JCs', () => {
    const store = useServiceStore.getState();
    const result = store.selectIntakesByCustomerId('cust-does-not-exist-999');
    expect(result).toHaveLength(0);
  });
});

// ─── amendIntake reason validation ───────────────────────────────────────────

describe('amendIntake reason validation', () => {
  beforeEach(resetIntakeState);

  function createCompletedIntake() {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    store.captureCustomerSignature(intakeId, 'data:image/png;base64,CUSTOMER_SIG', SA_ACTOR);
    store.attachSignedSheet(
      intakeId,
      {
        jobCardId: testJcId,
        dataUrl: 'data:application/pdf;base64,PDF_BASE64',
        name: 'signed-intake.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      },
      SA_ACTOR,
    );
    return intakeId;
  }

  it('rejects amendment with reason shorter than 10 characters', () => {
    const intakeId = createCompletedIntake();

    const result = useServiceStore.getState().amendIntake(
      intakeId,
      { odometerKm: { before: 45_000, after: 45_120 } },
      'Too short', // 9 chars
      GM_ACTOR,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('REASON_TOO_SHORT');
  });

  it('rejects amendment on DRAFT state', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);
    // intake is in DRAFT, not COMPLETED

    const result = store.amendIntake(
      intakeId,
      { odometerKm: { before: 45_000, after: 45_120 } },
      'Trying to amend a DRAFT intake record.',
      GM_ACTOR,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_STATE');
  });
});

// ─── recordIntakeSkipped ──────────────────────────────────────────────────────

describe('recordIntakeSkipped', () => {
  beforeEach(resetIntakeState);

  it('allows R19 to skip intake with a reason', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const result = store.recordIntakeSkipped(
      testJcId,
      'Fleet vehicle — corporate agreement exempts walk-around',
      GM_ACTOR,
    );

    expect(result.ok).toBe(true);
  });

  it('rejects R09 from skipping intake', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const result = store.recordIntakeSkipped(
      testJcId,
      'R09 should not be allowed to skip.',
      SA_ACTOR, // R09
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('UNAUTHORIZED');
  });

  it('rejects empty reason', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const result = store.recordIntakeSkipped(
      testJcId,
      '', // empty reason
      GM_ACTOR,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('REASON_REQUIRED');
  });
});

// ─── selectIntakeForJobCard ────────────────────────────────────────────────────

describe('selectIntakeForJobCard', () => {
  beforeEach(resetIntakeState);

  it('returns the intake for a specific job card', () => {
    const store = useServiceStore.getState();
    const jcs = store.jobCards;
    const testJcId = jcs[0]?.id ?? 'jc-test-001';

    const intakeId = store.recordIntakeInspection(makeIntakeInput(testJcId), SA_ACTOR);

    const found = useServiceStore.getState().selectIntakeForJobCard(testJcId);
    expect(found?.id).toBe(intakeId);
  });

  it('returns undefined for a JC with no intake', () => {
    const store = useServiceStore.getState();
    const found = store.selectIntakeForJobCard('nonexistent-jc-id');
    expect(found).toBeUndefined();
  });
});
