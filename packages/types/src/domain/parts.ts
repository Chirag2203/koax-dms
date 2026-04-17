/**
 * Parts module — Zod schemas and TypeScript types.
 *
 * Spec reference: SPEC-PARTS-001 §4 (entities & schemas)
 * All enums, schemas, and inferred types are exported for use across
 * staff-web, mocks, and any future backend.
 */

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const PartCategoryEnum = z.enum([
  'MECHANICAL',
  'ELECTRICAL',
  'TRIM',
  'CONSUMABLE',
]);
export type PartCategory = z.infer<typeof PartCategoryEnum>;

export const PartCriticalityEnum = z.enum([
  'ROUTINE',
  'COMMON',
  'CRITICAL',
  'SAFETY',
]);
export type PartCriticality = z.infer<typeof PartCriticalityEnum>;

export const PartStockStatusEnum = z.enum(['OK', 'LOW', 'OUT']);
export type PartStockStatus = z.infer<typeof PartStockStatusEnum>;

export const PurchaseOrderStatusEnum = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'DISPATCHED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CLOSED',
]);
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusEnum>;

export const GrnStatusEnum = z.enum([
  'DRAFT',
  'PENDING_QC',
  'MATCHED',
  'REJECTED',
  'POSTED',
]);
export type GrnStatus = z.infer<typeof GrnStatusEnum>;

export const StockMovementTypeEnum = z.enum([
  'IN',
  'OUT',
  'ADJUST',
  'TRANSFER',
]);
export type StockMovementType = z.infer<typeof StockMovementTypeEnum>;

// ─── Part master ──────────────────────────────────────────────────────────────

export const PartStockSchema = z.object({
  outletId: z.string(),
  qty: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  location: z.string(), // rack/shelf
});
export type PartStock = z.infer<typeof PartStockSchema>;

export const PartSchema = z.object({
  partCode: z.string(), // OEM number, PK
  name: z.string(),
  brand: z.string(), // BMW / Audi / Mercedes / Porsche / …
  fitsVehicles: z.array(z.string()), // model-year tuples
  category: PartCategoryEnum,
  criticality: PartCriticalityEnum,
  uom: z.string().default('EA'),
  hsnCode: z.string(), // typ. 8708
  mrp: z.number(),
  avgCost: z.number(),
  lastPurchasePrice: z.number(),
  warrantyPolicy: z.string().optional(),
  supersededBy: z.string().optional(), // newer partCode per Doc 09
  stock: z.array(PartStockSchema), // one row per outlet
  supplierIds: z.array(z.string()),
});
export type Part = z.infer<typeof PartSchema>;

// ─── Supplier ─────────────────────────────────────────────────────────────────

export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  gstin: z.string().optional(),
  address: z.string(),
  contact: z.string(),
  paymentTerms: z.string(), // 'NET_30', 'ADVANCE', etc.
  currency: z.enum(['INR', 'EUR', 'USD', 'GBP']).default('INR'),
  active: z.boolean().default(true),
  isImport: z.boolean().optional(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

// ─── Purchase Order ───────────────────────────────────────────────────────────

export const PurchaseOrderLineSchema = z.object({
  id: z.string(),
  partCode: z.string(),
  qty: z.number().int().min(1),
  unitPrice: z.number(),
  lineTotal: z.number(),
});
export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLineSchema>;

export const PurchaseOrderSchema = z.object({
  id: z.string(),
  poNo: z.string(), // PO-2026-00001
  supplierId: z.string(),
  outletId: z.string(),
  status: PurchaseOrderStatusEnum,
  createdBy: z.string(),
  createdAt: z.string(),
  submittedAt: z.string().optional(),
  approverId: z.string().optional(),
  approvedAt: z.string().optional(),
  rejectedReason: z.string().optional(),
  dispatchedAt: z.string().optional(),
  lines: z.array(PurchaseOrderLineSchema),
  subtotal: z.number(),
  gst: z.number(),
  total: z.number(),
  expectedDeliveryAt: z.string(),
  isImport: z.boolean().default(false),
  fxRate: z.number().optional(),
  notes: z.string().optional(),
  linkedJobCardId: z.string().optional(), // Service-originated PO
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

// ─── GRN ──────────────────────────────────────────────────────────────────────

export const GrnLineSchema = z.object({
  id: z.string(),
  partCode: z.string(),
  orderedQty: z.number().int().min(0),
  receivedQty: z.number().int().min(0),
  unitPrice: z.number(),
  condition: z.enum(['OK', 'DAMAGED', 'WRONG']),
  batchNo: z.string().optional(),
  serialNos: z.array(z.string()).optional(),
});
export type GrnLine = z.infer<typeof GrnLineSchema>;

export const GrnSchema = z.object({
  id: z.string(),
  grnNo: z.string(), // GRN-2026-00001
  poId: z.string().optional(), // walk-in/emergency receipts allowed
  supplierId: z.string(),
  outletId: z.string(),
  status: GrnStatusEnum,
  receivedBy: z.string(),
  receivedAt: z.string(),
  qcBy: z.string().optional(),
  qcAt: z.string().optional(),
  postedAt: z.string().optional(),
  rejectedReason: z.string().optional(),
  lines: z.array(GrnLineSchema),
  landedCostAdders: z
    .object({
      freight: z.number().default(0),
      customs: z.number().default(0),
      igst: z.number().default(0),
      clearing: z.number().default(0),
    })
    .optional(),
  discrepancyNotes: z.string().optional(),
  threeWayMatchStatus: z.enum(['MATCHED', 'DISCREPANCY']).optional(),
});
export type Grn = z.infer<typeof GrnSchema>;

// ─── Stock Movement ───────────────────────────────────────────────────────────

export const StockMovementSchema = z.object({
  id: z.string(),
  partCode: z.string(),
  outletId: z.string(),
  type: StockMovementTypeEnum,
  qty: z.number().int(), // signed: IN positive, OUT negative
  refType: z.enum(['GRN', 'JOBCARD', 'ADJUST', 'TRANSFER']),
  refId: z.string(),
  at: z.string(),
  actorId: z.string(),
  reason: z.string().optional(),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;
