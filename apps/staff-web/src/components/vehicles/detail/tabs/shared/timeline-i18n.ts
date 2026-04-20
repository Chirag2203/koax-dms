/**
 * Static i18n label map for timeline keys.
 *
 * These strings mirror what lives in messages/en-IN.json under
 * staff.vehicles.timeline.*. They are used by the ownership-timeline-event
 * component (and future sales-timeline-event in P2) to resolve title keys
 * and chip/meta label keys without needing a next-intl hook in the pure
 * helper layer.
 *
 * All keys here must also appear in en-IN.json (enforced by messages-resolution.test.ts).
 * Spec reference: PLAN-VEHICLES-003 §12, L30, L41
 */

export const TIMELINE_LABELS: Record<string, string> = {
  // ── Legacy fallback ──────────────────────────────────────────────────────
  'staff.vehicles.timeline.legacyRaw': '{kind} · {actor}',

  // ── OPEN variants (enriched titles per §12 + PLAN-002 polish, L41) ──────
  'staff.vehicles.timeline.open.bnSale':        'Sale to {buyerName}',
  'staff.vehicles.timeline.open.bnConsignment': 'Consignment from {consignorName}',
  'staff.vehicles.timeline.open.serviceWalkin': 'Service intake — {actor}',
  'staff.vehicles.timeline.open.legacyImport':  'Legacy import — {actor}',
  'staff.vehicles.timeline.open.pendingClaim':  'Claim pending — {actor}',

  // ── CLOSE variants (per closeReason) ─────────────────────────────────────
  'staff.vehicles.timeline.close.bnsaletransfer':      'Ownership transferred — BN Sale',
  'staff.vehicles.timeline.close.manualrevoke':        'Ownership revoked manually',
  'staff.vehicles.timeline.close.selfrevokesold':      'Owner self-revoked — sold privately',
  'staff.vehicles.timeline.close.claimoverlap':        'Ownership closed — claim overlap',
  'staff.vehicles.timeline.close.deceasedform31':      'Ownership closed — Form 31 (deceased)',
  'staff.vehicles.timeline.close.erasurerequest':      'Ownership anonymised — erasure request',
  'staff.vehicles.timeline.close.rejectedclaim':       'Ownership closed — rejected claim',
  'staff.vehicles.timeline.close.consignedtobn':       'Vehicle consigned to BN Automobiles',
  'staff.vehicles.timeline.close.consignmentreturned': 'Consignment returned to owner',
  // Generic fallback for unknown close reason
  'staff.vehicles.timeline.ownership.close': 'Ownership closed',

  // ── Other ownership kinds ─────────────────────────────────────────────────
  'staff.vehicles.timeline.ownership.transfer':       'Ownership transferred',
  'staff.vehicles.timeline.ownership.claim_submit':   'Claim submitted',
  'staff.vehicles.timeline.ownership.claim_approve':  'Claim approved',
  'staff.vehicles.timeline.ownership.claim_reject':   'Claim rejected',
  'staff.vehicles.timeline.ownership.restore':        'Ownership restored',
  'staff.vehicles.timeline.ownership.anonymize':      'PII anonymised',
  'staff.vehicles.timeline.ownership.pdf_export':     'PDF exported',
  'staff.vehicles.timeline.ownership.joint_add':      'Joint owner added — {peerName}',
  'staff.vehicles.timeline.ownership.form31_approve': 'Form 31 approved — heir: {heirName}',

  // ── Sales event titles ───────────────────────────────────────────────────
  'staff.vehicles.timeline.sales.acquired':         'Vehicle acquired',
  'staff.vehicles.timeline.sales.listed':           'Listed at {price}',
  'staff.vehicles.timeline.sales.price_changed':    'Price changed: {fromPrice} → {toPrice}',
  'staff.vehicles.timeline.sales.reserved':         'Reserved',
  'staff.vehicles.timeline.sales.reservation_lost': 'Reservation lost',
  'staff.vehicles.timeline.sales.soldMarginScheme': 'Sold — margin scheme ({price})',
  'staff.vehicles.timeline.sales.soldConsignment':  'Sold — consignment ({price})',
  'staff.vehicles.timeline.sales.sold':             'Sold ({price})',
  'staff.vehicles.timeline.sales.returned':         'Sale returned',

  // ── Chip labels ──────────────────────────────────────────────────────────
  'staff.vehicles.timeline.chips.tcsCollected': 'TCS collected',
  'staff.vehicles.timeline.chips.tcsWaived':    'TCS waived',

  // ── Payload key labels (§12 full list) ───────────────────────────────────
  'staff.vehicles.timeline.keys.source':              'Source',
  'staff.vehicles.timeline.keys.kmAtOpen':            'Km at open',
  'staff.vehicles.timeline.keys.kmAtClose':           'Km at close',
  'staff.vehicles.timeline.keys.isJoint':             'Joint ownership',
  'staff.vehicles.timeline.keys.jointWith':           'Joint with',
  'staff.vehicles.timeline.keys.consignor':           'Consignor',
  'staff.vehicles.timeline.keys.closeReason':         'Close reason',
  'staff.vehicles.timeline.keys.graceUntilAt':        'Grace until',
  'staff.vehicles.timeline.keys.buyer':               'Buyer',
  'staff.vehicles.timeline.keys.claimant':            'Claimant',
  'staff.vehicles.timeline.keys.autoMatch':           'Auto-match',
  'staff.vehicles.timeline.keys.overlap':             'Overlaps ownership',
  'staff.vehicles.timeline.keys.rejectCategory':      'Rejection category',
  'staff.vehicles.timeline.keys.rejectReason':        'Rejection reason',
  'staff.vehicles.timeline.keys.priorCloseReason':    'Prior close reason',
  'staff.vehicles.timeline.keys.anonymizeReason':     'Anonymise reason',
  'staff.vehicles.timeline.keys.pdfExportReason':     'Export reason',
  'staff.vehicles.timeline.keys.heir':                'Heir',
  'staff.vehicles.timeline.keys.acquisitionCost':     'Acquisition cost',
  'staff.vehicles.timeline.keys.kmAtAcquisition':     'Km at acquisition',
  'staff.vehicles.timeline.keys.acquisitionSource':   'Acquisition source',
  'staff.vehicles.timeline.keys.listPrice':           'List price',
  'staff.vehicles.timeline.keys.outlet':              'Outlet',
  'staff.vehicles.timeline.keys.fromPrice':           'From price',
  'staff.vehicles.timeline.keys.toPrice':             'To price',
  'staff.vehicles.timeline.keys.priceChangeReason':   'Price change note',
  'staff.vehicles.timeline.keys.deal':                'Deal',
  'staff.vehicles.timeline.keys.depositAmount':       'Deposit',
  'staff.vehicles.timeline.keys.expiresAt':           'Expires',
  'staff.vehicles.timeline.keys.reservationLostReason': 'Reservation ended',
  'staff.vehicles.timeline.keys.salesOrder':          'Sales order',
  'staff.vehicles.timeline.keys.finalPrice':          'Final price',
  'staff.vehicles.timeline.keys.saleFlow':            'Sale type',
  'staff.vehicles.timeline.keys.tcsCollected':        'TCS collected',
  'staff.vehicles.timeline.keys.tcsWaived':           'TCS waived',
  'staff.vehicles.timeline.keys.tcsWaivedReason':     'TCS waiver reason',
  'staff.vehicles.timeline.keys.gstMargin':           'GST on margin',
  'staff.vehicles.timeline.keys.commissionEarned':    'Commission earned',
  'staff.vehicles.timeline.keys.sellerSignatures':    'Seller signatures',
  'staff.vehicles.timeline.keys.overrideBy':          'Override by',
  'staff.vehicles.timeline.keys.overrideReason':      'Override reason',
  'staff.vehicles.timeline.keys.overrideProofs':      'Override proof docs',
  'staff.vehicles.timeline.keys.returnReason':        'Return reason',
  'staff.vehicles.timeline.keys.noteForFinance':      'Finance note',
  'staff.vehicles.timeline.keys.docCategory':         'Document category',
  'staff.vehicles.timeline.keys.docSubtype':          'Document subtype',
  'staff.vehicles.timeline.keys.fileName':            'File name',
  'staff.vehicles.timeline.keys.docBefore':           'Before',
  'staff.vehicles.timeline.keys.docAfter':            'After',
  'staff.vehicles.timeline.keys.previousDoc':         'Previous document',
  'staff.vehicles.timeline.keys.previousVersion':     'Previous version',
  'staff.vehicles.timeline.keys.newVersion':          'New version',
  'staff.vehicles.timeline.keys.deleteReason':        'Delete reason',
  'staff.vehicles.timeline.keys.blockedBySale':       'Blocked by sale',
  'staff.vehicles.timeline.keys.downloadPurpose':     'Download purpose',
  'staff.vehicles.timeline.keys.purposeNote':         'Purpose note',
};
