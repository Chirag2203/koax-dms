/**
 * Event-slice — OwnershipChangeEvent append-only log.
 *
 * Only `appendEvent` and `logPdfExport` are public. No update or delete
 * operations exist on the event log (append-only per spec).
 *
 * Spec reference: SPEC-VEHICLES-001 §3.3 (event-slice)
 */

import type { EventActions, VehiclesSlice } from '../types';
import { makeEventId, now } from '../id-helpers';

export const createEventSlice: VehiclesSlice<EventActions> = (set) => ({
  appendEvent(kind, payload, actor, refs) {
    set((state) => {
      state.events.push({
        id: makeEventId(),
        vin: refs?.vin ?? '',
        at: now(),
        kind,
        actorId: actor.id,
        actorRole: actor.role ?? 'UNKNOWN',
        ownershipId: refs?.ownershipId,
        claimId: refs?.claimId,
        payload,
        schemaVersion: 'v1',
      });
    });
  },

  logPdfExport(vin, customerId, actor) {
    set((state) => {
      state.events.push({
        id: makeEventId(),
        vin,
        at: now(),
        kind: 'PDF_EXPORT',
        actorId: actor.id,
        actorRole: actor.role ?? 'PORTAL',
        payload: { customerId },
        schemaVersion: 'v1',
      });
    });
  },
});
