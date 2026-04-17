/**
 * Public entry for the parts store.
 *
 * Re-exports from `./parts-store/index` so consumers can keep using the
 * `@/src/lib/parts/parts-store` import path — identical convention to the
 * service store. The internal slice structure is an implementation detail.
 *
 * Spec reference: SPEC-PARTS-001 §10
 */

export {
  usePartsStore,
  usePartsStoreSelector,
} from './parts-store/index';
export type { Actor, PartsStore, PartsState } from './parts-store/index';
