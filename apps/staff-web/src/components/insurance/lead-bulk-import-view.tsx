/**
 * LeadBulkImportView — CSV + XLSX bulk import for insurance leads.
 *
 * L_P3_3: Accepts .csv and .xlsx / .xls files.
 *   - CSV: existing text parser (unchanged)
 *   - XLSX: SheetJS (xlsx) — first sheet → JSON rows → same RowSchema Zod validation
 *   - Sample template downloadable (CSV data-URI + XLSX generated client-side)
 *
 * Column mapping: vin, customerId, outlet, odometer, customerAge,
 *   customerCity, panLast4, noClaimBonusYears
 *
 * Gate: R10+
 * Spec reference: SPEC-INSURANCE-001 Task 3 — Lead bulk import, L_P3_3
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, FileText, X, Download } from 'lucide-react';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { cn } from '@dms/ui';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';

// ─── Column schema ────────────────────────────────────────────────────────────

const CSV_COLUMNS = ['vin', 'customerId', 'outlet', 'odometer', 'customerAge', 'customerCity', 'panLast4', 'noClaimBonusYears'] as const;

const RowSchema = z.object({
  vin: z.string().min(11).max(17),
  customerId: z.string().min(1),
  outlet: z.enum(['bangalore', 'mumbai', 'chennai']),
  odometer: z.coerce.number().int().min(0),
  customerAge: z.coerce.number().int().min(18).max(99),
  customerCity: z.string().min(1),
  panLast4: z.string().length(4).regex(/^[0-9A-Z]{4}$/),
  noClaimBonusYears: z.coerce.number().int().min(0).max(5),
});

type ParsedRow = z.infer<typeof RowSchema>;

interface ImportRow {
  rowIndex: number;
  raw: Record<string, string>;
  parsed: ParsedRow | null;
  errors: string[];
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const values = line.split(',').map((v) => v.trim());
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => { raw[h] = values[idx] ?? ''; });

    const result = RowSchema.safeParse(raw);
    rows.push({
      rowIndex: i,
      raw,
      parsed: result.success ? result.data : null,
      errors: result.success ? [] : result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    });
  }

  return rows;
}

// ─── XLSX parser ──────────────────────────────────────────────────────────────

function parseXLSX(buffer: ArrayBuffer): ImportRow[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch {
    return [];
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  // Convert sheet to array of objects (header row = keys)
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false, // keep values as strings for consistent Zod coercion
  });

  return jsonRows.map((row, index) => {
    // Normalise keys: lowercase + underscores
    const raw: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const normKey = key.trim().toLowerCase().replace(/\s+/g, '_');
      raw[normKey] = String(value ?? '');
    }

    const result = RowSchema.safeParse(raw);
    return {
      rowIndex: index + 1,
      raw,
      parsed: result.success ? result.data : null,
      errors: result.success ? [] : result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  });
}

// ─── XLSX template generator ──────────────────────────────────────────────────

function downloadXLSXTemplate() {
  const wb = XLSX.utils.book_new();
  const headerRow = [...CSV_COLUMNS];
  const sampleRow = ['WP0AB2A91MS247831', 'customer-001', 'bangalore', '45000', '35', 'Bangalore', '1234', '2'];

  const ws = XLSX.utils.aoa_to_sheet([headerRow, sampleRow]);

  // Column widths
  ws['!cols'] = CSV_COLUMNS.map(() => ({ wch: 20 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Leads Import');
  XLSX.writeFile(wb, 'leads-import-template.xlsx');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadBulkImportView() {
  const createLead = useInsuranceStore((s) => s.createLead);

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'xlsx' | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isCSV = ext === 'csv';
    const isXLSX = ext === 'xlsx' || ext === 'xls';

    if (!isCSV && !isXLSX) {
      setParseError('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.');
      return;
    }

    setFileName(file.name);
    setFileType(isCSV ? 'csv' : 'xlsx');
    setImportResult(null);
    setParseError(null);

    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setRows(parseCSV(text));
      };
      reader.onerror = () => setParseError('Failed to read CSV file.');
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        try {
          const parsed = parseXLSX(buffer);
          if (parsed.length === 0) {
            setParseError('No data rows found in the XLSX file. Check that the first sheet has data and the correct column headers.');
            return;
          }
          setRows(parsed);
        } catch {
          setParseError('Failed to parse XLSX file. The file may be corrupted or in an unsupported format.');
        }
      };
      reader.onerror = () => setParseError('Failed to read XLSX file.');
      reader.readAsArrayBuffer(file);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    setImporting(true);
    let created = 0;
    let failed = 0;

    for (const row of rows) {
      if (!row.parsed) { failed++; continue; }
      try {
        createLead({
          ...row.parsed,
          assignedAdvisorId: 'staff-r09-001', // default advisor for bulk imports
          marketingConsentGiven: false,
        });
        created++;
      } catch {
        failed++;
      }
    }

    setImportResult({ created, failed });
    setImporting(false);
  }

  function handleReset() {
    setRows([]);
    setFileName(null);
    setFileType(null);
    setImportResult(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const validRows = rows.filter((r) => r.parsed !== null);
  const invalidRows = rows.filter((r) => r.parsed === null);

  return (
    <Gate role="R10" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        {/* Header */}
        <div className="px-6 py-5 border-b border-line shrink-0">
          <Link
            href="/insurance/leads"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink-primary mb-3"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Leads
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-semibold text-ink-primary">Bulk Import Leads</h1>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                Upload a CSV or Excel file with insurance leads. One lead per row.
              </p>
            </div>
            {/* Template download — CSV (data-URI) + XLSX (generated client-side) */}
            <div className="flex items-center gap-2">
              <a
                href="data:text/csv;charset=utf-8,vin,customerId,outlet,odometer,customerAge,customerCity,panLast4,noClaimBonusYears%0AWP0AB2A91MS247831,customer-001,bangalore,45000,35,Bangalore,1234,2"
                download="leads-import-template.csv"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line bg-bg-surface text-[13px] text-ink-primary hover:bg-bg-hover transition-colors"
              >
                <FileText size={14} aria-hidden="true" />
                CSV Template
              </a>
              <button
                type="button"
                onClick={downloadXLSXTemplate}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line bg-bg-surface text-[13px] text-ink-primary hover:bg-bg-hover transition-colors"
              >
                <Download size={14} aria-hidden="true" />
                XLSX Template
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Import result */}
          {importResult && (
            <div className={cn(
              'rounded-lg border px-4 py-3 flex items-center justify-between',
              importResult.failed === 0
                ? 'border-success/30 bg-success/5'
                : 'border-warning/30 bg-warning/5',
            )}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success" aria-hidden="true" />
                <p className="text-[13px] text-ink-primary">
                  Import complete — {importResult.created} lead{importResult.created !== 1 ? 's' : ''} created
                  {importResult.failed > 0 && `, ${importResult.failed} failed`}.
                </p>
              </div>
              <button type="button" onClick={handleReset} className="text-ink-muted hover:text-ink-primary">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Parse error banner */}
          {parseError && (
            <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-error shrink-0" aria-hidden="true" />
              <p className="text-[13px] text-error">{parseError}</p>
              <button type="button" onClick={handleReset} className="ml-auto text-ink-muted hover:text-ink-primary">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Drop zone */}
          {!fileName && !parseError && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-line rounded-lg p-12 flex flex-col items-center justify-center text-center hover:border-accent/60 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload CSV or XLSX file"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            >
              <Upload size={32} className="text-ink-faint mb-3" aria-hidden="true" />
              <p className="text-[15px] text-ink-primary font-medium mb-1">Drop CSV or Excel file here or click to browse</p>
              <p className="text-[13px] text-ink-muted">Accepts .csv, .xlsx, .xls</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                onChange={handleFileInput}
                aria-label="File input"
              />
            </div>
          )}

          {/* File loaded — stats */}
          {fileName && rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-ink-muted" aria-hidden="true" />
                  <div>
                    <p className="text-[14px] font-medium text-ink-primary">{fileName}</p>
                    <p className="text-[12px] text-ink-muted">
                      {fileType?.toUpperCase()} · {rows.length} row{rows.length !== 1 ? 's' : ''} —{' '}
                      <span className="text-success">{validRows.length} valid</span>
                      {invalidRows.length > 0 && (
                        <span className="text-error ml-1">, {invalidRows.length} with errors</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleReset} className="text-[13px] text-ink-muted hover:text-ink-primary">
                    Remove file
                  </button>
                  {validRows.length > 0 && !importResult && (
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={importing}
                      className="inline-flex items-center gap-2 h-9 px-4 rounded bg-accent text-white text-[13px] font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                    >
                      {importing ? 'Importing…' : `Import ${validRows.length} lead${validRows.length !== 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              </div>

              {/* Expected columns reference */}
              <div className="rounded border border-line bg-bg-subtle px-4 py-3">
                <p className="text-[12px] font-semibold text-ink-secondary mb-1">Expected columns</p>
                <p className="font-mono text-[11px] text-ink-muted">{CSV_COLUMNS.join(', ')}</p>
              </div>

              {/* Preview table */}
              <div className="rounded-lg border border-line bg-bg-surface overflow-hidden">
                <div className="px-4 py-3 border-b border-line">
                  <h2 className="text-[14px] font-semibold text-ink-primary">Preview</h2>
                </div>
                <div className="overflow-x-auto scrollbar-thin-dark">
                  <table className="w-full text-[12px]" role="table" aria-label="Import preview">
                    <thead>
                      <tr className="bg-bg-subtle border-b border-line">
                        <th scope="col" className="px-3 py-2 text-left text-ink-secondary font-semibold">Row</th>
                        <th scope="col" className="px-3 py-2 text-left text-ink-secondary font-semibold">Status</th>
                        {CSV_COLUMNS.map((col) => (
                          <th key={col} scope="col" className="px-3 py-2 text-left text-ink-secondary font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={cn(
                            'border-b border-line last:border-0',
                            row.errors.length > 0 ? 'bg-error/5' : 'hover:bg-bg-hover',
                          )}
                        >
                          <td className="px-3 py-2 font-mono text-ink-muted">{row.rowIndex}</td>
                          <td className="px-3 py-2">
                            {row.errors.length === 0 ? (
                              <CheckCircle2 size={14} className="text-success" aria-label="Valid" />
                            ) : (
                              <div className="flex items-start gap-1">
                                <AlertCircle size={14} className="text-error shrink-0 mt-0.5" aria-label="Error" />
                                <div>
                                  {row.errors.map((err, i) => (
                                    <p key={i} className="text-[11px] text-error">{err}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          {CSV_COLUMNS.map((col) => (
                            <td key={col} className="px-3 py-2 font-mono text-ink-primary whitespace-nowrap">
                              {row.raw[col] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* IRDAI disclaimer */}
        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-[11px] text-ink-muted">
            BN Automobiles is a registered motor insurance web aggregator. Insurance is the subject matter of solicitation.
          </p>
        </div>
      </div>
    </Gate>
  );
}
