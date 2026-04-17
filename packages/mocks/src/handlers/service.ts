import { http, HttpResponse } from 'msw';
import {
  bays,
  jobCards,
  labourLines,
  partsLines,
  inspections,
  appointments,
  warrantyClaims,
  timelineEvents,
  advisorNotes,
} from '../fixtures/service';
import type {
  Bay,
  JobCard,
  LabourLine,
  PartsLine,
  Inspection,
  Appointment,
  WarrantyClaim,
  JobCardTimelineEvent,
  AdvisorNote,
  JobCardStatus,
  AppointmentStatus,
  WarrantyClaimStatus,
} from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  return delay(150 + Math.random() * 250);
}

// ─── In-memory mutable stores (copy-on-write pattern) ────────────────────────

let _bays: Bay[] = [...bays];
let _jobCards: JobCard[] = [...jobCards];
let _inspections: Inspection[] = [...inspections];
let _appointments: Appointment[] = [...appointments];
let _warrantyClaims: WarrantyClaim[] = [...warrantyClaims];
let _timelineEvents: JobCardTimelineEvent[] = [...timelineEvents];
let _advisorNotes: AdvisorNote[] = [...advisorNotes];

// ─── Service Handlers ─────────────────────────────────────────────────────────

export const serviceHandlers = [
  /**
   * GET /api/service/bays
   * Returns all bays, optionally filtered by outletId.
   */
  http.get('/api/staff/service/bays', async ({ request }) => {
    await randomDelay();

    const url = new URL(request.url);
    const outletId = url.searchParams.get('outletId');

    let result = [..._bays];
    if (outletId) {
      result = result.filter((b) => b.outletId === outletId);
    }

    return HttpResponse.json({ data: result, total: result.length });
  }),

  /**
   * GET /api/service/bays/:id
   */
  http.get('/api/staff/service/bays/:id', async ({ params }) => {
    await randomDelay();

    const { id } = params;
    const bay = _bays.find((b) => b.id === id);

    if (!bay) {
      return HttpResponse.json({ error: 'Bay not found' }, { status: 404 });
    }

    return HttpResponse.json({ data: bay });
  }),

  /**
   * GET /api/service/jobcards
   * Filters: status, outletId, advisorId, priority, bayId, q (text search on jobNo / customerComplaint)
   */
  http.get('/api/staff/service/jobcards', async ({ request }) => {
    await randomDelay();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') as JobCardStatus | null;
    const outletId = url.searchParams.get('outletId');
    const advisorId = url.searchParams.get('advisorId');
    const priority = url.searchParams.get('priority');
    const bayId = url.searchParams.get('bayId');
    const q = url.searchParams.get('q');

    let result = [..._jobCards];

    if (status) {
      result = result.filter((jc) => jc.status === status);
    }
    if (outletId) {
      result = result.filter((jc) => jc.outletId === outletId);
    }
    if (advisorId) {
      result = result.filter((jc) => jc.advisorId === advisorId);
    }
    if (priority) {
      result = result.filter((jc) => jc.priority === priority);
    }
    if (bayId) {
      result = result.filter((jc) => jc.bayId === bayId);
    }
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (jc) =>
          jc.jobNo.toLowerCase().includes(lower) ||
          jc.customerComplaint.toLowerCase().includes(lower) ||
          jc.vin.toLowerCase().includes(lower),
      );
    }

    return HttpResponse.json({ data: result, total: result.length });
  }),

  /**
   * GET /api/service/jobcards/:id
   */
  http.get('/api/staff/service/jobcards/:id', async ({ params }) => {
    await randomDelay();

    const { id } = params;
    const jc = _jobCards.find((j) => j.id === id);

    if (!jc) {
      return HttpResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    return HttpResponse.json({ data: jc });
  }),

  /**
   * POST /api/service/jobcards
   * Creates a new job card in RECEIVED status.
   */
  http.post('/api/staff/service/jobcards', async ({ request }) => {
    await randomDelay();

    const body = (await request.json()) as Partial<JobCard>;

    if (!body.vin || !body.customerId || !body.outletId || !body.advisorId) {
      return HttpResponse.json(
        { error: 'Missing required fields: vin, customerId, outletId, advisorId' },
        { status: 422 },
      );
    }

    const newJc: JobCard = {
      id: `jc-${Date.now()}`,
      jobNo: `JC-2026-${String(Date.now()).slice(-5)}`,
      vin: body.vin,
      customerId: body.customerId,
      outletId: body.outletId,
      advisorId: body.advisorId,
      technicianIds: body.technicianIds ?? [],
      bayId: body.bayId,
      status: 'RECEIVED',
      priority: body.priority ?? 'NORMAL',
      promisedAt: body.promisedAt ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      receivedAt: new Date().toISOString(),
      customerComplaint: body.customerComplaint ?? '',
      diagnosticNotes: body.diagnosticNotes,
      odometerIn: body.odometerIn ?? 0,
      estimatedTotal: body.estimatedTotal ?? 0,
      labourLines: [],
      partsLines: [],
      attachments: [],
    };

    _jobCards = [..._jobCards, newJc];
    return HttpResponse.json({ data: newJc }, { status: 201 });
  }),

  /**
   * PATCH /api/service/jobcards/:id
   * Updates status or other fields. Returns merged job card.
   */
  http.patch('/api/staff/service/jobcards/:id', async ({ params, request }) => {
    await randomDelay();

    const { id } = params;
    const jc = _jobCards.find((j) => j.id === id);

    if (!jc) {
      return HttpResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<JobCard>;
    const updated: JobCard = {
      ...jc,
      ...body,
      id: jc.id, // prevent id override
    };

    _jobCards = _jobCards.map((j) => (j.id === id ? updated : j));
    return HttpResponse.json({ data: updated });
  }),

  /**
   * POST /api/service/jobcards/:id/labour
   * Adds a labour line to the job card.
   */
  http.post('/api/staff/service/jobcards/:id/labour', async ({ params, request }) => {
    await randomDelay();

    const { id } = params;
    const jc = _jobCards.find((j) => j.id === id);

    if (!jc) {
      return HttpResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<LabourLine>;

    if (!body.code || !body.description || !body.technicianId) {
      return HttpResponse.json(
        { error: 'Missing required fields: code, description, technicianId' },
        { status: 422 },
      );
    }

    const newLine: LabourLine = {
      id: `lab-${Date.now()}`,
      code: body.code,
      description: body.description,
      flatRateHours: body.flatRateHours ?? 1,
      actualHours: body.actualHours,
      rate: body.rate ?? 2000,
      technicianId: body.technicianId,
      status: body.status ?? 'PLANNED',
    };

    const updated: JobCard = {
      ...jc,
      labourLines: [...jc.labourLines, newLine],
    };

    _jobCards = _jobCards.map((j) => (j.id === id ? updated : j));
    return HttpResponse.json({ data: newLine }, { status: 201 });
  }),

  /**
   * PATCH /api/service/jobcards/:id/labour/:lineId
   * Updates a labour line.
   */
  http.patch('/api/staff/service/jobcards/:id/labour/:lineId', async ({ params, request }) => {
    await randomDelay();

    const { id, lineId } = params;
    const jc = _jobCards.find((j) => j.id === id);

    if (!jc) {
      return HttpResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const line = jc.labourLines.find((l) => l.id === lineId);
    if (!line) {
      return HttpResponse.json({ error: 'Labour line not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<LabourLine>;
    const updatedLine: LabourLine = { ...line, ...body, id: line.id };

    const updated: JobCard = {
      ...jc,
      labourLines: jc.labourLines.map((l) => (l.id === lineId ? updatedLine : l)),
    };

    _jobCards = _jobCards.map((j) => (j.id === id ? updated : j));
    return HttpResponse.json({ data: updatedLine });
  }),

  /**
   * POST /api/service/jobcards/:id/parts
   * Adds a parts line to the job card.
   */
  http.post('/api/staff/service/jobcards/:id/parts', async ({ params, request }) => {
    await randomDelay();

    const { id } = params;
    const jc = _jobCards.find((j) => j.id === id);

    if (!jc) {
      return HttpResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<PartsLine>;

    if (!body.partCode || !body.description) {
      return HttpResponse.json(
        { error: 'Missing required fields: partCode, description' },
        { status: 422 },
      );
    }

    const newLine: PartsLine = {
      id: `prt-${Date.now()}`,
      partCode: body.partCode,
      description: body.description,
      qty: body.qty ?? 1,
      unitPrice: body.unitPrice ?? 0,
      warrantyCovered: body.warrantyCovered ?? false,
      status: body.status ?? 'REQUESTED',
      supplierId: body.supplierId,
    };

    const updated: JobCard = {
      ...jc,
      partsLines: [...jc.partsLines, newLine],
    };

    _jobCards = _jobCards.map((j) => (j.id === id ? updated : j));
    return HttpResponse.json({ data: newLine }, { status: 201 });
  }),

  /**
   * PATCH /api/service/jobcards/:id/parts/:lineId
   * Updates a parts line.
   */
  http.patch('/api/staff/service/jobcards/:id/parts/:lineId', async ({ params, request }) => {
    await randomDelay();

    const { id, lineId } = params;
    const jc = _jobCards.find((j) => j.id === id);

    if (!jc) {
      return HttpResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const line = jc.partsLines.find((p) => p.id === lineId);
    if (!line) {
      return HttpResponse.json({ error: 'Parts line not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<PartsLine>;
    const updatedLine: PartsLine = { ...line, ...body, id: line.id };

    const updated: JobCard = {
      ...jc,
      partsLines: jc.partsLines.map((p) => (p.id === lineId ? updatedLine : p)),
    };

    _jobCards = _jobCards.map((j) => (j.id === id ? updated : j));
    return HttpResponse.json({ data: updatedLine });
  }),

  /**
   * GET /api/service/jobcards/:id/timeline
   * Returns all timeline events for a job card, sorted ascending.
   */
  http.get('/api/staff/service/jobcards/:id/timeline', async ({ params }) => {
    await randomDelay();

    const { id } = params;
    const jc = _jobCards.find((j) => j.id === id);

    if (!jc) {
      return HttpResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const events = _timelineEvents
      .filter((e) => e.jobCardId === id)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return HttpResponse.json({ data: events, total: events.length });
  }),

  /**
   * POST /api/service/jobcards/:id/notes
   * Adds an advisor note to the job card.
   */
  http.post('/api/staff/service/jobcards/:id/notes', async ({ params, request }) => {
    await randomDelay();

    const { id } = params;
    const jc = _jobCards.find((j) => j.id === id);

    if (!jc) {
      return HttpResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<AdvisorNote>;

    if (!body.text || !body.authorId) {
      return HttpResponse.json(
        { error: 'Missing required fields: text, authorId' },
        { status: 422 },
      );
    }

    const newNote: AdvisorNote = {
      id: `note-${Date.now()}`,
      jobCardId: id as string,
      authorId: body.authorId,
      at: new Date().toISOString(),
      text: body.text,
      pinned: body.pinned ?? false,
    };

    _advisorNotes = [..._advisorNotes, newNote];
    return HttpResponse.json({ data: newNote }, { status: 201 });
  }),

  /**
   * GET /api/service/jobcards/:id/inspection
   * Returns the VHC inspection for this job card.
   */
  http.get('/api/staff/service/jobcards/:id/inspection', async ({ params }) => {
    await randomDelay();

    const { id } = params;
    const jc = _jobCards.find((j) => j.id === id);

    if (!jc) {
      return HttpResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const inspection = _inspections.find((i) => i.jobCardId === id);

    if (!inspection) {
      return HttpResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    return HttpResponse.json({ data: inspection });
  }),

  /**
   * POST /api/service/inspections
   * Creates or replaces an inspection for a job card.
   */
  http.post('/api/staff/service/inspections', async ({ request }) => {
    await randomDelay();

    const body = (await request.json()) as Partial<Inspection>;

    if (!body.jobCardId || !body.completedByTechnicianId) {
      return HttpResponse.json(
        { error: 'Missing required fields: jobCardId, completedByTechnicianId' },
        { status: 422 },
      );
    }

    const items = body.items ?? [];
    const summary = items.reduce(
      (acc, item) => {
        if (item.outcome === 'PASS') acc.pass++;
        else if (item.outcome === 'FAIL') acc.fail++;
        else if (item.outcome === 'ADVISE') acc.advise++;
        else acc.na++;
        return acc;
      },
      { pass: 0, fail: 0, advise: 0, na: 0 },
    );

    const newInspection: Inspection = {
      id: body.id ?? `insp-${Date.now()}`,
      jobCardId: body.jobCardId,
      type: body.type ?? 'VHC_210',
      items,
      completedByTechnicianId: body.completedByTechnicianId,
      completedAt: body.completedAt ?? new Date().toISOString(),
      summary,
    };

    // Replace existing or append
    const existingIdx = _inspections.findIndex((i) => i.jobCardId === body.jobCardId);
    if (existingIdx >= 0) {
      _inspections = _inspections.map((i, idx) => (idx === existingIdx ? newInspection : i));
    } else {
      _inspections = [..._inspections, newInspection];
    }

    return HttpResponse.json({ data: newInspection }, { status: 201 });
  }),

  /**
   * GET /api/service/appointments
   * Filters: status, outletId, dateFrom, dateTo
   */
  http.get('/api/staff/service/appointments', async ({ request }) => {
    await randomDelay();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') as AppointmentStatus | null;
    const outletId = url.searchParams.get('outletId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    let result = [..._appointments];

    if (status) {
      result = result.filter((a) => a.status === status);
    }
    if (outletId) {
      result = result.filter((a) => a.outletId === outletId);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((a) => new Date(a.scheduledAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      result = result.filter((a) => new Date(a.scheduledAt).getTime() <= to);
    }

    result.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    return HttpResponse.json({ data: result, total: result.length });
  }),

  /**
   * POST /api/service/appointments
   * Creates a new appointment in SCHEDULED status.
   */
  http.post('/api/staff/service/appointments', async ({ request }) => {
    await randomDelay();

    const body = (await request.json()) as Partial<Appointment>;

    if (!body.customerId || !body.outletId || !body.serviceTypeId || !body.scheduledAt) {
      return HttpResponse.json(
        { error: 'Missing required fields: customerId, outletId, serviceTypeId, scheduledAt' },
        { status: 422 },
      );
    }

    const newAppt: Appointment = {
      id: `apt-${Date.now()}`,
      customerId: body.customerId,
      vin: body.vin,
      outletId: body.outletId,
      serviceTypeId: body.serviceTypeId,
      scheduledAt: body.scheduledAt,
      estimatedDurationMins: body.estimatedDurationMins ?? 120,
      advisorId: body.advisorId,
      bayId: body.bayId,
      status: 'SCHEDULED',
      notes: body.notes,
      createdAt: new Date().toISOString(),
    };

    _appointments = [..._appointments, newAppt];
    return HttpResponse.json({ data: newAppt }, { status: 201 });
  }),

  /**
   * GET /api/service/warranty-claims
   * Filters: status, vin
   */
  http.get('/api/staff/service/warranty-claims', async ({ request }) => {
    await randomDelay();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') as WarrantyClaimStatus | null;
    const vin = url.searchParams.get('vin');

    let result = [..._warrantyClaims];

    if (status) {
      result = result.filter((wc) => wc.status === status);
    }
    if (vin) {
      result = result.filter((wc) => wc.vin === vin);
    }

    return HttpResponse.json({ data: result, total: result.length });
  }),

  /**
   * POST /api/service/warranty-claims
   * Creates a new warranty claim in DRAFT status.
   */
  http.post('/api/staff/service/warranty-claims', async ({ request }) => {
    await randomDelay();

    const body = (await request.json()) as Partial<WarrantyClaim>;

    if (!body.vin || !body.reason || !body.type) {
      return HttpResponse.json(
        { error: 'Missing required fields: vin, reason, type' },
        { status: 422 },
      );
    }

    const seq = String(_warrantyClaims.length + 1).padStart(4, '0');
    const newClaim: WarrantyClaim = {
      id: `wc-${Date.now()}`,
      claimNo: `CLM-2026-${seq}`,
      vin: body.vin,
      jobCardId: body.jobCardId,
      type: body.type,
      status: 'DRAFT',
      amount: body.amount ?? 0,
      reason: body.reason,
      partsIds: body.partsIds ?? [],
      labourIds: body.labourIds ?? [],
      notes: body.notes,
    };

    _warrantyClaims = [..._warrantyClaims, newClaim];
    return HttpResponse.json({ data: newClaim }, { status: 201 });
  }),
];

// ─── Re-export fixture pools for testing convenience ─────────────────────────
export { labourLines as labourLinesPool, partsLines as partsLinesPool };
