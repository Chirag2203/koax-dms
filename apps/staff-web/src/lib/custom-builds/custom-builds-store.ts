/**
 * Public entry for the custom-builds store.
 *
 * Re-exports from `./custom-builds-store/index` so consumers can use the
 * canonical import path. Mirrors parts-store.ts pattern.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §14
 */

export {
  useCustomBuildsStore,
  useCustomBuildsStoreSelector,
} from './custom-builds-store/index';
export type { Actor, CustomBuildsStore, CustomBuildsState } from './custom-builds-store/index';
