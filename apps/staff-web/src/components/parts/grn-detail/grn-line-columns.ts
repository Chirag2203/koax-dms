/**
 * GRN line column definitions — extracted to keep grn-lines-table.tsx under 350 LoC.
 *
 * Spec reference: PLAN-PARTS-006 §5.2, §13
 */

export interface GrnLineDisplay {
  id: string;
  partCode: string;
  partName: string | undefined;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  lineTotal: number;
  condition: 'OK' | 'DAMAGED' | 'WRONG';
  hasPo: boolean; // false for walk-in receipts → no ordered comparison tints
}

/**
 * Build the display row from raw store data.
 */
export function buildGrnLineDisplay(
  line: {
    id: string;
    partCode: string;
    orderedQty: number;
    receivedQty: number;
    unitPrice: number;
    condition: 'OK' | 'DAMAGED' | 'WRONG';
  },
  partName: string | undefined,
  hasPo: boolean,
): GrnLineDisplay {
  return {
    id: line.id,
    partCode: line.partCode,
    partName,
    orderedQty: line.orderedQty,
    receivedQty: line.receivedQty,
    unitPrice: line.unitPrice,
    lineTotal: line.receivedQty * line.unitPrice,
    condition: line.condition,
    hasPo,
  };
}
