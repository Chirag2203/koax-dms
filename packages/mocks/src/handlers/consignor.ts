import { http, HttpResponse } from 'msw';
import {
  consignedVehicles,
  consignorPayouts,
  consignorMessages,
  consignmentAgreements,
} from '../fixtures/consignor';

let messages = [...consignorMessages];

export const consignorHandlers = [
  http.get('/api/consignor/vehicles', () => {
    return HttpResponse.json(consignedVehicles);
  }),

  http.get('/api/consignor/vehicles/:vin', ({ params }) => {
    const { vin } = params;
    const vehicle = consignedVehicles.find((v) => v.vin === vin);
    if (!vehicle) {
      return HttpResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    return HttpResponse.json(vehicle);
  }),

  http.get('/api/consignor/payouts', () => {
    return HttpResponse.json(consignorPayouts);
  }),

  http.get('/api/consignor/messages', () => {
    return HttpResponse.json(messages);
  }),

  http.get('/api/consignor/agreements', () => {
    return HttpResponse.json(consignmentAgreements);
  }),

  http.post('/api/consignor/messages', async ({ request }) => {
    const body = (await request.json()) as { subject: string; body: string };
    const newMessage = {
      id: `msg-${Date.now()}`,
      date: new Date().toISOString(),
      from: 'consignor' as const,
      senderName: 'You',
      subject: body.subject ?? 'Message',
      body: body.body ?? '',
      isRead: true,
    };
    messages = [...messages, newMessage];
    return HttpResponse.json(newMessage, { status: 201 });
  }),
];
