/**
 * Parts suppliers fixture — 8 records.
 *
 * Mix of OEM captives (BMW/Audi/Mercedes/Porsche India), tier-1 aftermarket
 * (Bosch / Mahle / Sachs) and one import broker for CKD/CBU scenarios.
 *
 * Spec reference: SPEC-PARTS-001 §8 (fixture seed plan)
 */

import type { Supplier } from '@dms/types';
import { supplierIdFor } from './builders';

export const suppliers: Supplier[] = [
  // ── OEM captives ────────────────────────────────────────────────────────────
  {
    id: supplierIdFor(1),
    name: 'BMW India Parts Distribution',
    gstin: '27AABCB0001A1Z5',
    address: 'Plot 16, MIDC Chakan, Pune, Maharashtra 410501',
    contact: '+91 20 6712 3400',
    paymentTerms: 'NET_30',
    currency: 'INR',
    active: true,
    isImport: false,
  },
  {
    id: supplierIdFor(2),
    name: 'Audi India Parts Centre',
    gstin: '27AACCA1234B1Z9',
    address: 'Survey 122, Aurangabad, Maharashtra 431136',
    contact: '+91 240 662 4500',
    paymentTerms: 'NET_30',
    currency: 'INR',
    active: true,
    isImport: false,
  },
  {
    id: supplierIdFor(3),
    name: 'Mercedes-Benz India Parts Hub',
    gstin: '27AADCM7890C1Z3',
    address: 'Plot 1, MIDC Chakan, Pune, Maharashtra 410501',
    contact: '+91 20 6719 8800',
    paymentTerms: 'NET_45',
    currency: 'INR',
    active: true,
    isImport: false,
  },
  {
    id: supplierIdFor(4),
    name: 'Porsche Centre Mumbai',
    gstin: '27AAECP5678D1Z1',
    address: 'Worli Naka, Dr. Annie Besant Road, Mumbai, Maharashtra 400018',
    contact: '+91 22 6674 5500',
    paymentTerms: 'ADVANCE',
    currency: 'INR',
    active: true,
    isImport: false,
  },

  // ── Tier-1 aftermarket ──────────────────────────────────────────────────────
  {
    id: supplierIdFor(5),
    name: 'Bosch Limited (India)',
    gstin: '29AAACB2222E1Z7',
    address: 'Hosur Road, Bengaluru, Karnataka 560030',
    contact: '+91 80 2299 2000',
    paymentTerms: 'NET_30',
    currency: 'INR',
    active: true,
    isImport: false,
  },
  {
    id: supplierIdFor(6),
    name: 'Mahle Filter Systems (India)',
    gstin: '27AAFCM3333F1Z5',
    address: 'MIDC Ranjangaon, Pune, Maharashtra 412220',
    contact: '+91 21 3867 5000',
    paymentTerms: 'NET_30',
    currency: 'INR',
    active: true,
    isImport: false,
  },
  {
    id: supplierIdFor(7),
    name: 'Sachs Clutch India',
    gstin: '29AAGCS4444G1Z2',
    address: 'Jigani Industrial Area, Bengaluru, Karnataka 560105',
    contact: '+91 80 2783 4100',
    paymentTerms: 'NET_30',
    currency: 'INR',
    active: true,
    isImport: false,
  },

  // ── Import broker (CKD/CBU scenarios — Doc 05 §6.4) ─────────────────────────
  {
    id: supplierIdFor(8),
    name: 'LuxeAuto Imports GmbH',
    gstin: undefined, // foreign supplier, no GSTIN
    address: 'Neckarsulmer Strasse 14, 71063 Sindelfingen, Germany',
    contact: '+49 7031 90 5500',
    paymentTerms: 'ADVANCE',
    currency: 'EUR',
    active: true,
    isImport: true,
  },
];
