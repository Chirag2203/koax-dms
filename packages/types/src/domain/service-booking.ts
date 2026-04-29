/**
 * ServiceBookingRequest — the payload a R20 customer submits when booking a
 * service appointment from the customer portal.
 *
 * SECURITY: customerId is intentionally absent from this schema.
 * It MUST be derived exclusively from the authenticated session on the server.
 * The server must reject any client-supplied customerId. See SPEC-CUSTOMER-PORTAL-002 §14 NFR-S.
 *
 * Spec reference: SPEC-CUSTOMER-PORTAL-002 §5.4
 */

import { z } from 'zod';

export const ServiceBookingRequestSchema = z.object({
  // NOTE: customerId is intentionally absent — derived from session server-side only.
  vin: z.string().min(1),
  serviceTypeId: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  scheduledSlot: z.enum(['MORNING', 'AFTERNOON']),
  outletId: z.string().min(1),
  pickupMode: z.enum(['WORKSHOP_DROP', 'HOME_PICKUP']),
  pickupAddress: z
    .object({
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      pinCode: z.string().regex(/^\d{6}$/, 'Must be a 6-digit PIN code'),
    })
    .optional(),
  concerns: z.string().max(500).optional(),
  requestId: z.string().uuid().optional(), // client-generated idempotency key
});

export type ServiceBookingRequest = z.infer<typeof ServiceBookingRequestSchema>;
