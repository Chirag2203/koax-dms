/**
 * Parts handlers barrel — assembles the flat `partsHandlers` array expected
 * by `packages/mocks/src/handlers/index.ts`.
 *
 * Spec reference: SPEC-PARTS-001 §2
 */

import { partsCatalogHandlers } from './parts-catalog';
import { purchaseOrderHandlers } from './purchase-orders';
import { grnHandlers } from './grns';
import { movementHandlers } from './movements';

export const partsHandlers = [
  ...partsCatalogHandlers,
  ...purchaseOrderHandlers,
  ...grnHandlers,
  ...movementHandlers,
];
