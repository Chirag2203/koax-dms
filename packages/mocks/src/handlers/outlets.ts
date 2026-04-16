import { http, HttpResponse } from 'msw';
import { outlets } from '../fixtures/outlets';

export const outletHandlers = [
  /**
   * GET /api/outlets
   * Returns all outlets. Optionally filtered by city query param.
   */
  http.get('/api/outlets', ({ request }) => {
    const url = new URL(request.url);
    const city = url.searchParams.get('city');

    const data = city
      ? outlets.filter((o) => o.city === city)
      : outlets;

    return HttpResponse.json({ data });
  }),

  /**
   * GET /api/outlets/:city
   * Returns a single outlet by city slug (bangalore | mumbai | chennai).
   */
  http.get('/api/outlets/:city', ({ params }) => {
    const { city } = params as { city: string };
    const outlet = outlets.find((o) => o.city === city.toLowerCase());

    if (!outlet) {
      return HttpResponse.json(
        { error: 'Outlet not found', code: 'OUTLET_NOT_FOUND' },
        { status: 404 },
      );
    }

    return HttpResponse.json({ data: outlet });
  }),
];
