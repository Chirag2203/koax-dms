import { http, HttpResponse } from 'msw';
import { mockCustomer } from '../fixtures/customer';
import {
  savedVehicles,
  reservations,
  ownedVehicles,
  bookings,
  serviceRecords,
  documents,
  communicationPreferences,
} from '../fixtures/portal';

export const portalHandlers = [
  http.get('/api/portal/me', () => {
    return HttpResponse.json(mockCustomer);
  }),

  http.get('/api/portal/saved-vehicles', () => {
    return HttpResponse.json(savedVehicles);
  }),

  http.get('/api/portal/reservations', () => {
    return HttpResponse.json(reservations);
  }),

  http.get('/api/portal/owned-vehicles', () => {
    return HttpResponse.json(ownedVehicles);
  }),

  http.get('/api/portal/bookings', () => {
    return HttpResponse.json(bookings);
  }),

  http.get('/api/portal/service-history', () => {
    return HttpResponse.json(serviceRecords);
  }),

  http.get('/api/portal/service-history/:vin', ({ params }) => {
    const { vin } = params;
    const filtered = serviceRecords.filter((r) => r.vehicleVin === vin);
    return HttpResponse.json(filtered);
  }),

  http.get('/api/portal/documents', () => {
    return HttpResponse.json(documents);
  }),

  http.get('/api/portal/documents/:vin', ({ params }) => {
    const { vin } = params;
    const filtered = documents.filter((d) => d.vehicleVin === vin);
    return HttpResponse.json(filtered);
  }),

  http.get('/api/portal/preferences', () => {
    return HttpResponse.json(communicationPreferences);
  }),

  http.put('/api/portal/preferences', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),
];
