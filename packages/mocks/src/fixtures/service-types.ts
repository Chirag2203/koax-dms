import type { ServiceType } from '@dms/types';

export const serviceTypes: ServiceType[] = [
  {
    id: 'annual-service',
    name: 'Annual Service',
    description:
      'Comprehensive scheduled service covering oil and filter change, fluid top-ups, brake inspection, tyre rotation, and a 45-point health check. Calibrated to manufacturer service intervals and tailored to each make.',
    priceRange: {
      min: 15000,
      max: 45000,
    },
    durationHours: 4,
    icon: 'wrench',
  },
  {
    id: 'master-inspection',
    name: 'Master Inspection',
    description:
      'A 210-point inspection conducted by our brand-trained technicians. Covers mechanical, electrical, structural, and cosmetic assessment with a detailed written report. Mandatory for BN Certified Pre-Owned designation.',
    priceRange: {
      min: 8000,
      max: 12000,
    },
    durationHours: 6,
    icon: 'shield-check',
  },
  {
    id: 'aesthetic-detailing',
    name: 'Aesthetic Detailing',
    description:
      'Paint correction, ceramic coating, interior deep-clean, and glass treatment. Packages range from single-stage polish to full multi-day paint decontamination and 9H ceramic coating applied in our dust-controlled detailing bay.',
    priceRange: {
      min: 25000,
      max: 150000,
    },
    durationHours: 8,
    icon: 'sparkles',
  },
  {
    id: 'mechanical-repair',
    name: 'Mechanical Repair',
    description:
      'Diagnostic-led mechanical repair using OEM or OEM-equivalent parts. Covers drivetrain, suspension, brakes, cooling systems, and ancillary components. All repairs are backed by a 12-month / 20,000 km warranty on parts and labour.',
    priceRange: {
      min: 5000,
      max: 500000,
    },
    durationHours: 2,
    icon: 'settings',
  },
  {
    id: 'pre-purchase-inspection',
    name: 'Pre-Purchase Inspection',
    description:
      'An independent 180-point inspection of any vehicle you are considering buying — from BN Automobiles or elsewhere. We provide a written report and a summary consultation with the inspecting technician, with no influence from the sale.',
    priceRange: {
      min: 12000,
      max: 18000,
    },
    durationHours: 5,
    icon: 'search',
  },
  {
    id: 'accessory-installation',
    name: 'Accessory Installation',
    description:
      'Installation of manufacturer-approved and aftermarket accessories: tow bars, cargo systems, dash cameras, Apple CarPlay / Android Auto retrofits, ambient lighting upgrades, and bespoke storage solutions. All installations are coded to the vehicle where applicable.',
    priceRange: {
      min: 2000,
      max: 200000,
    },
    durationHours: 1,
    icon: 'plus-circle',
  },
  {
    // Catch-all per SPEC-SERVICE-001 §6.3 — surfaces a "Describe the issue"
    // textarea on the JC form; the SA's free-text becomes part of the JC's
    // initialNotes so technicians and the customer record have context.
    id: 'other',
    name: 'Other',
    description:
      'For service requests that do not fit the standard catalogue. Advisor must describe the customer concern in detail; the workshop diagnoses and quotes case by case.',
    priceRange: {
      min: 0,
      max: 0,
    },
    durationHours: 1,
    icon: 'help-circle',
    requiresDescription: true,
  },
];
