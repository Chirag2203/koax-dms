/**
 * IntakePdfDocument — @react-pdf/renderer server-side PDF template.
 *
 * L3: Server-only — MUST NOT be imported by any client-side code path.
 *     Called exclusively from the Route Handler at:
 *     app/api/service/intake-inspection/[jobCardId]/pdf/route.ts
 *
 * L4: Field layout derived from INTAKE_FIELDS (field-definitions.ts).
 *     Both this template and the digital form iterate the same definitions.
 *
 * Layout (A4 portrait per PLAN §3):
 *   Header band — BN logo placeholder, JC number, intake date, outlet GSTIN
 *   Section A  — Vehicle ident grid (2 columns)
 *   Section B  — 5-view body diagram (SVG fallback to PNG per plan risk row)
 *                + damage table
 *   Section C  — Inventory checklist (2-column grid with ✓/✗ marks)
 *   Section D  — Functional checks
 *   Section E  — Customer + SA signature blocks (embed dataUrls as <Image>)
 *   Footer     — DPDP retention notice + QR code (base64 stub per DEF-INTAKE-15)
 *
 * L14: Photos NOT embedded — photos stay in DMS only (pii_sensitivity: medium).
 * L11: Customer signature embedded only when present (pii_sensitivity: medium).
 *      Route Handler enforces R11 403 server-side before this is called.
 *
 * Note on SVG: @react-pdf/renderer Svg primitive can be quirky with complex
 * external SVGs. Per plan risk row we fall back to an <Image> of the PNG
 * equivalent when the Svg primitive would fail. For v1 stub the diagram is
 * rendered as a placeholder rect with a note; P2 replaces with proper asset.
 *
 * @react-pdf/renderer is a Phase 2 dependency (~400 KB server-only bundle).
 * Never import this file from any client module or page component.
 */

// server-only guard (Next.js convention — no 'use client' directive here)
import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IntakePdfData {
  // From IntakeInspection
  id: string;
  jobCardId: string;
  jobNo: string;             // resolved from JobCard
  inspectionAt: string;
  outletId: string;
  outletGstin?: string;      // resolved from outlet fixture
  // Section A
  regNumber: string;
  vin: string;               // resolved from Vehicle (L10/§8)
  make: string;              // resolved from Vehicle
  model: string;             // resolved from Vehicle
  variant?: string;          // resolved from Vehicle
  year: number | string;     // resolved from Vehicle
  exteriorColor: string;     // resolved from Vehicle
  odometerKm: number;
  fuelLevel: string;
  // Section B
  damageCallouts: Array<{
    number: number;
    view: string;
    locationText: string;
    code: string;
    severity: number;
  }>;
  // Section C
  spareTyrePresent: boolean;
  toolKitPresent: boolean;
  keyCount: string;
  keyType?: string;
  serviceBookPresent: boolean;
  rcInVehicle: string;
  insuranceCertInVehicle: string;
  cabinAccessoriesNote?: string;
  // Section D
  battery12VCondition: string;
  tyreCondition: { FL: string; FR: string; RL: string; RR: string };
  acFunctional: boolean;
  wipersFunctional: boolean;
  lightsFunctional: boolean;
  infotainmentFunctional?: boolean;
  dashboardWarningLightsNote?: string;
  // Section E — signatures (pii_sensitivity:medium — only rendered if present)
  customerName: string;      // resolved from Customer (L10/§8)
  customerSignatureDataUrl?: string;
  customerSignedAt?: string;
  saName: string;
  saEmployeeId: string;
  saSignatureDataUrl: string;
  saSignedAt: string;
  // Footer
  qrPayload: string;
  // State
  state: string;
  version: number;
}

// ── Font registration (Inter via npm @fontsource/inter paths) ─────────────────
// Using system-safe fallback; real font path wired when @fontsource/inter is added.
// v1 stub uses Helvetica (PDF built-in) to avoid font-file path dependency.
// DEF-INTAKE-15-equivalent: swap in Inter once @fontsource/inter is installed.

// ── Styles ────────────────────────────────────────────────────────────────────

const MONO = 'Courier';
const SANS = 'Helvetica';
const SANS_BOLD = 'Helvetica-Bold';

const s = StyleSheet.create({
  page: {
    fontFamily: SANS,
    fontSize: 9,
    color: '#1a1a1a',
    paddingHorizontal: 28,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
  },
  // ── Header band ─────────────────────────────────────────────────────────────
  headerBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 8,
    marginBottom: 10,
  },
  logoPlaceholder: {
    width: 60,
    height: 24,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: SANS_BOLD,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 13,
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 8,
    color: '#555555',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  headerMono: {
    fontFamily: MONO,
    fontSize: 8,
    color: '#1a1a1a',
  },
  headerLabel: {
    fontSize: 7,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // ── Section ──────────────────────────────────────────────────────────────────
  sectionHeader: {
    fontFamily: SANS_BOLD,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#1a1a1a',
    borderBottomWidth: 0.75,
    borderBottomColor: '#cccccc',
    paddingBottom: 3,
    marginBottom: 6,
    marginTop: 10,
  },
  // ── Grid ─────────────────────────────────────────────────────────────────────
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  fieldCell: {
    width: '50%',
    paddingRight: 8,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 7,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 9,
    color: '#1a1a1a',
    fontFamily: MONO,
  },
  // ── Checkbox row ─────────────────────────────────────────────────────────────
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 4,
    paddingRight: 8,
  },
  checkBox: {
    width: 10,
    height: 10,
    borderWidth: 0.75,
    borderColor: '#888888',
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    fontFamily: SANS_BOLD,
    fontSize: 8,
    color: '#1a1a1a',
  },
  checkLabel: {
    fontSize: 8,
    color: '#1a1a1a',
  },
  // ── Damage table ──────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.25,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 8,
    color: '#1a1a1a',
  },
  tableHeaderCell: {
    fontSize: 7,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: SANS_BOLD,
  },
  col1: { width: '8%' },
  col2: { width: '18%' },
  col3: { width: '36%' },
  col4: { width: '14%' },
  col5: { width: '12%' },
  col6: { width: '12%' },
  // ── Diagram placeholder ───────────────────────────────────────────────────────
  diagramBox: {
    width: '100%',
    height: 90,
    borderWidth: 0.5,
    borderColor: '#cccccc',
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  diagramNote: {
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
  },
  // ── Signature block ───────────────────────────────────────────────────────────
  sigBlock: {
    width: '48%',
    borderTopWidth: 0.75,
    borderTopColor: '#888888',
    paddingTop: 4,
    marginTop: 4,
  },
  sigName: {
    fontFamily: SANS_BOLD,
    fontSize: 8,
    color: '#1a1a1a',
  },
  sigDate: {
    fontSize: 7,
    color: '#888888',
    marginTop: 2,
  },
  sigImage: {
    width: '100%',
    height: 50,
    objectFit: 'contain',
    marginBottom: 4,
  },
  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: '#888888',
    flex: 1,
    paddingRight: 12,
    lineHeight: 1.4,
  },
  qrBox: {
    width: 48,
    height: 48,
    borderWidth: 0.5,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrText: {
    fontSize: 5,
    color: '#aaaaaa',
    textAlign: 'center',
  },
  // ── Misc ──────────────────────────────────────────────────────────────────────
  noDamageNote: {
    fontSize: 8,
    color: '#888888',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  stateChip: {
    borderWidth: 0.5,
    borderColor: '#888888',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  stateChipText: {
    fontSize: 7,
    fontFamily: MONO,
    color: '#1a1a1a',
    textTransform: 'uppercase',
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function bool(v: boolean): string {
  return v ? '✓' : '✗';
}

function fuelLabel(f: string): string {
  const map: Record<string, string> = {
    EMPTY: 'Empty', Q1: '1/4', Q2: '1/2', Q3: '3/4', FULL: 'Full',
  };
  return map[f] ?? f;
}

function presenceLabel(p: string): string {
  const map: Record<string, string> = {
    PRESENT: 'Present', ABSENT: 'Absent', NOT_VERIFIED: 'Not Verified',
  };
  return map[p] ?? p;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const CODE_LABELS: Record<string, string> = {
  S: 'Scratch', D: 'Dent', C: 'Chip/Crack', R: 'Rust', B: 'Broken', P: 'Paint Fade',
};

const VIEW_LABELS: Record<string, string> = {
  TOP: 'Top', FRONT: 'Front', REAR: 'Rear', LEFT: 'Left', RIGHT: 'Right',
};

// ── Outlet GSTIN stub (v1: fixture — real lookup via outlet-store in v1.5) ────

const OUTLET_GSTIN: Record<string, string> = {
  'BLR-01': '29AABCB1234A1Z5',
  'MUM-01': '27AABCB1234A1Z2',
  'CHE-01': '33AABCB1234A1Z0',
};

// ── CheckRow helper ───────────────────────────────────────────────────────────

function CheckRow({ label, value }: { label: string; value: boolean }) {
  return (
    <View style={s.checkRow}>
      <View style={s.checkBox}>
        {value && <Text style={s.checkMark}>✓</Text>}
      </View>
      <Text style={s.checkLabel}>{label}</Text>
    </View>
  );
}

// ── FieldCell helper ──────────────────────────────────────────────────────────

function FieldCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.fieldCell}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

// ── IntakePdfDocument ─────────────────────────────────────────────────────────

export function IntakePdfDocument({ data }: { data: IntakePdfData }) {
  const gstin = data.outletGstin ?? OUTLET_GSTIN[data.outletId] ?? 'N/A';

  return (
    <Document
      title={`Intake Inspection — ${data.jobNo}`}
      author="BN Automobiles"
      subject="Vehicle Intake Inspection Sheet"
      keywords="intake inspection vehicle condition"
      creator="DMS Staff Web"
    >
      <Page size="A4" orientation="portrait" style={s.page}>

        {/* ── Header Band ──────────────────────────────────────────────── */}
        <View style={s.headerBand} fixed>
          <View style={s.logoPlaceholder}>
            <Text style={s.logoText}>BNA</Text>
          </View>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>BN AUTOMOBILES</Text>
            <Text style={s.headerSubtitle}>Vehicle Intake Inspection Sheet</Text>
          </View>

          <View style={s.headerRight}>
            <Text style={s.headerLabel}>Job Card</Text>
            <Text style={s.headerMono}>{data.jobNo}</Text>
            <Text style={[s.headerLabel, { marginTop: 4 }]}>Intake Date</Text>
            <Text style={s.headerMono}>{formatDate(data.inspectionAt)}</Text>
            <Text style={[s.headerLabel, { marginTop: 4 }]}>Outlet GSTIN</Text>
            <Text style={s.headerMono}>{gstin}</Text>
          </View>
        </View>

        {/* ── State chip ───────────────────────────────────────────────── */}
        {data.version > 1 && (
          <View style={s.stateChip}>
            <Text style={s.stateChipText}>V{data.version} — {data.state}</Text>
          </View>
        )}

        {/* ── Section A — Vehicle Ident ─────────────────────────────────── */}
        <Text style={s.sectionHeader}>Section A — Vehicle Identification</Text>
        <View style={s.grid2}>
          {/* L10/§8: VIN + make/model/year/colour resolved from Vehicle at render time */}
          <FieldCell label="Registration No." value={data.regNumber} />
          <FieldCell label="VIN" value={data.vin} />
          <FieldCell label="Make" value={data.make} />
          <FieldCell label="Model" value={data.model} />
          <FieldCell label="Variant" value={data.variant ?? '—'} />
          <FieldCell label="Year" value={String(data.year)} />
          <FieldCell label="Exterior Colour" value={data.exteriorColor} />
          <FieldCell label="Odometer (km)" value={String(data.odometerKm)} />
          <FieldCell label="Fuel Level" value={fuelLabel(data.fuelLevel)} />
          <FieldCell label="Outlet" value={data.outletId} />
        </View>

        {/* ── Section B — Body Damage ───────────────────────────────────── */}
        <Text style={s.sectionHeader}>Section B — Body Damage</Text>

        {/*
          L6: Body diagram SVG asset.
          Per plan risk row: @react-pdf/renderer Svg primitive can struggle
          with external SVG files. v1 stub uses a placeholder rect with note;
          P2 embeds PNG export of the body diagram once commissioned (DEF-INTAKE-7).
          Decision: placeholder over broken Svg render; documented here.
        */}
        <View style={s.diagramBox}>
          <Text style={s.diagramNote}>
            [Body Diagram — 5-view vehicle sketch]
          </Text>
          <Text style={[s.diagramNote, { marginTop: 2 }]}>
            TOP · FRONT · REAR · LEFT · RIGHT
          </Text>
          <Text style={[s.diagramNote, { marginTop: 2, fontSize: 6 }]}>
            v1 stub — commissioned artwork in P2 (DEF-INTAKE-7)
          </Text>
        </View>

        {/* Damage code legend */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
          {['S=Scratch', 'D=Dent', 'C=Chip/Crack', 'R=Rust', 'B=Broken', 'P=Paint Fade'].map((l) => (
            <Text key={l} style={{ fontSize: 7, color: '#555555' }}>{l}</Text>
          ))}
        </View>

        {/* Damage table */}
        {data.damageCallouts.length === 0 ? (
          <Text style={s.noDamageNote}>No pre-existing damage recorded — vehicle received in clean condition.</Text>
        ) : (
          <View>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.col1]}>#</Text>
              <Text style={[s.tableHeaderCell, s.col2]}>View</Text>
              <Text style={[s.tableHeaderCell, s.col3]}>Location</Text>
              <Text style={[s.tableHeaderCell, s.col4]}>Code</Text>
              <Text style={[s.tableHeaderCell, s.col5]}>Sev.</Text>
              <Text style={[s.tableHeaderCell, s.col6]}>Init.</Text>
            </View>
            {data.damageCallouts.map((callout) => (
              <View key={callout.number} style={s.tableRow}>
                <Text style={[s.tableCell, s.col1]}>{callout.number}</Text>
                <Text style={[s.tableCell, s.col2]}>{VIEW_LABELS[callout.view] ?? callout.view}</Text>
                <Text style={[s.tableCell, s.col3]}>{callout.locationText}</Text>
                <Text style={[s.tableCell, s.col4]}>{CODE_LABELS[callout.code] ?? callout.code}</Text>
                <Text style={[s.tableCell, s.col5]}>{callout.severity}</Text>
                <Text style={[s.tableCell, s.col6]}></Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Section C — Inventory ─────────────────────────────────────── */}
        <Text style={s.sectionHeader}>Section C — Inventory Checklist</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <CheckRow label="Spare Tyre Present" value={data.spareTyrePresent} />
          <CheckRow label="Tool Kit Present" value={data.toolKitPresent} />
          <CheckRow label="Service Book Present" value={data.serviceBookPresent} />
          <View style={s.fieldCell}>
            <Text style={s.fieldLabel}>Number of Keys</Text>
            <Text style={s.fieldValue}>{data.keyCount}</Text>
          </View>
          <View style={s.fieldCell}>
            <Text style={s.fieldLabel}>Key Type</Text>
            <Text style={s.fieldValue}>{data.keyType ?? '—'}</Text>
          </View>
          <View style={s.fieldCell}>
            <Text style={s.fieldLabel}>RC in Vehicle (MV Act §130)</Text>
            <Text style={s.fieldValue}>{presenceLabel(data.rcInVehicle)}</Text>
          </View>
          <View style={s.fieldCell}>
            <Text style={s.fieldLabel}>Insurance Cert (MV Act §145)</Text>
            <Text style={s.fieldValue}>{presenceLabel(data.insuranceCertInVehicle)}</Text>
          </View>
          {data.cabinAccessoriesNote && (
            <View style={{ width: '100%', marginBottom: 4 }}>
              <Text style={s.fieldLabel}>Cabin Accessories</Text>
              <Text style={s.fieldValue}>{data.cabinAccessoriesNote}</Text>
            </View>
          )}
        </View>

        {/* ── Section D — Functional Checks ────────────────────────────── */}
        <Text style={s.sectionHeader}>Section D — Functional Checks</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <CheckRow label="Air Conditioning" value={data.acFunctional} />
          <CheckRow label="Wipers" value={data.wipersFunctional} />
          <CheckRow label="Lights" value={data.lightsFunctional} />
          {data.infotainmentFunctional !== undefined && (
            <CheckRow label="Infotainment" value={data.infotainmentFunctional} />
          )}
          <View style={s.fieldCell}>
            <Text style={s.fieldLabel}>12V Battery</Text>
            <Text style={s.fieldValue}>{data.battery12VCondition.replace('_', ' ')}</Text>
          </View>
          <View style={s.fieldCell}>
            <Text style={s.fieldLabel}>Tyre Condition FL/FR/RL/RR</Text>
            <Text style={s.fieldValue}>
              {data.tyreCondition.FL} / {data.tyreCondition.FR} / {data.tyreCondition.RL} / {data.tyreCondition.RR}
            </Text>
          </View>
          {data.dashboardWarningLightsNote && (
            <View style={{ width: '100%', marginBottom: 4 }}>
              <Text style={s.fieldLabel}>Dashboard Warning Lights</Text>
              <Text style={s.fieldValue}>{data.dashboardWarningLightsNote}</Text>
            </View>
          )}
        </View>

        {/* ── Section E — Signatures ────────────────────────────────────── */}
        <Text style={s.sectionHeader}>Section E — Signatures</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          {/* Customer signature block */}
          <View style={s.sigBlock}>
            {/* L11: Customer signature — pii_sensitivity:medium.
                Only embedded when present. Route Handler ensures R11 never
                reaches this point (403 enforced server-side per L12). */}
            {data.customerSignatureDataUrl ? (
              <Image src={data.customerSignatureDataUrl} style={s.sigImage} />
            ) : (
              <View style={{ height: 50, borderBottomWidth: 0.5, borderBottomColor: '#888888', marginBottom: 4 }} />
            )}
            <Text style={s.sigName}>{data.customerName}</Text>
            <Text style={s.sigDate}>
              {data.customerSignedAt
                ? `Signed: ${formatDate(data.customerSignedAt)}`
                : 'Customer Signature'
              }
            </Text>
          </View>

          {/* SA signature block */}
          <View style={s.sigBlock}>
            <Image src={data.saSignatureDataUrl} style={s.sigImage} />
            <Text style={s.sigName}>{data.saName}</Text>
            <Text style={s.sigDate}>ID: {data.saEmployeeId}</Text>
            <Text style={s.sigDate}>Signed: {formatDate(data.saSignedAt)}</Text>
          </View>
        </View>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        {/* L7: DPDP retention notice */}
        {/* L12: part of chain-of-custody artefact */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            This document is a vehicle condition record completed in the customer&apos;s
            presence. Customer signature acknowledges pre-existing damage as noted.
            Retained for 5 years per company policy and BN Automobiles DPDP notice.
            Ref: {data.id}
          </Text>
          {/* QR stub — real QR generation is DEF-INTAKE-15-equivalent; v1 stub shows URL */}
          <View style={s.qrBox}>
            <Text style={s.qrText}>{data.qrPayload.replace('https://dms.bnautos.in', '').slice(0, 30)}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
