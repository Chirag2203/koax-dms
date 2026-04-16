import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server for Node.js / test environments (Vitest, Jest).
 *
 * Usage in test setup (e.g. vitest.setup.ts):
 *
 * ```ts
 * import { server } from '@dms/mocks/server';
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */
export const server = setupServer(...handlers);
