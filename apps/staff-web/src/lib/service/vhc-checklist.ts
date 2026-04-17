/**
 * Representative 20-item VHC (Vehicle Health Check) checklist.
 *
 * Pre-populated into every new Inspection created by startInspection().
 * All items start with outcome 'NA'.
 *
 * Spec reference: PLAN-SERVICE-002 §U11, P3 build
 */

import type { InspectionItem } from '@dms/types';

export const VHC_REP_CHECKLIST: Omit<InspectionItem, 'notes' | 'imageUrl'>[] = [
  // Engine (5)
  { id: 'vhc-engine-oil',       category: 'Engine',     name: 'Engine oil level & condition',    outcome: 'NA' },
  { id: 'vhc-engine-coolant',   category: 'Engine',     name: 'Coolant level & condition',        outcome: 'NA' },
  { id: 'vhc-engine-belts',     category: 'Engine',     name: 'Drive belt condition',             outcome: 'NA' },
  { id: 'vhc-engine-mounts',    category: 'Engine',     name: 'Engine mounts integrity',          outcome: 'NA' },
  { id: 'vhc-engine-leaks',     category: 'Engine',     name: 'Oil / fluid leaks',                outcome: 'NA' },

  // Brakes (3)
  { id: 'vhc-brake-pads',       category: 'Brakes',     name: 'Brake pad thickness (front)',      outcome: 'NA' },
  { id: 'vhc-brake-discs',      category: 'Brakes',     name: 'Brake disc condition (all)',       outcome: 'NA' },
  { id: 'vhc-brake-fluid',      category: 'Brakes',     name: 'Brake fluid level',                outcome: 'NA' },

  // Suspension (3)
  { id: 'vhc-susp-shocks',      category: 'Suspension', name: 'Shock absorber condition',        outcome: 'NA' },
  { id: 'vhc-susp-bushings',    category: 'Suspension', name: 'Control arm bushings',            outcome: 'NA' },
  { id: 'vhc-susp-steering',    category: 'Suspension', name: 'Steering rack play',              outcome: 'NA' },

  // Electrical (3)
  { id: 'vhc-elec-battery',     category: 'Electrical', name: 'Battery voltage & terminals',     outcome: 'NA' },
  { id: 'vhc-elec-lights',      category: 'Electrical', name: 'All exterior lights functional',  outcome: 'NA' },
  { id: 'vhc-elec-ac',          category: 'Electrical', name: 'A/C cooling & blower operation',  outcome: 'NA' },

  // Interior (3)
  { id: 'vhc-int-seatbelts',    category: 'Interior',   name: 'Seatbelt condition & latch',      outcome: 'NA' },
  { id: 'vhc-int-wipers',       category: 'Interior',   name: 'Wiper blades & washer fluid',     outcome: 'NA' },
  { id: 'vhc-int-instruments',  category: 'Interior',   name: 'Dashboard warning lights',        outcome: 'NA' },

  // Exterior (2)
  { id: 'vhc-ext-bodywork',     category: 'Exterior',   name: 'Body panel condition',            outcome: 'NA' },
  { id: 'vhc-ext-glass',        category: 'Exterior',   name: 'Windscreen & glass chips/cracks', outcome: 'NA' },

  // Tyres (1)
  { id: 'vhc-tyre-depth',       category: 'Tyres',      name: 'Tyre tread depth & pressure',     outcome: 'NA' },
];

/** Builds the full InspectionItem array for a new inspection (all NA, no notes/images). */
export function buildVhcItems(): InspectionItem[] {
  return VHC_REP_CHECKLIST.map((item) => ({
    ...item,
    notes: undefined,
    imageUrl: undefined,
  }));
}
