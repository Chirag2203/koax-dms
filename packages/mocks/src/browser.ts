import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW service worker for browser environments.
 *
 * Usage in Next.js App Router (src/app/msw-provider.tsx or similar):
 *
 * ```ts
 * import { worker } from '@dms/mocks/browser';
 * await worker.start({ onUnhandledRequest: 'bypass' });
 * ```
 */
export const worker = setupWorker(...handlers);
