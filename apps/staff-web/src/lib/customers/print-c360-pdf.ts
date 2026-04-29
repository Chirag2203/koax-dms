/**
 * printC360Pdf — client-side PDF export for Customer 360.
 *
 * Renders an HTML template into a hidden iframe and calls window.print().
 * Cleans up the iframe on afterprint or after a fallback timeout.
 *
 * Spec: SPEC-CUSTOMERS-001 §5.4 (B-6 fix — replaces alert() stub)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface C360PdfData {
  customerName: string;
  customerPhone: string; // pass masked if viewer is below R09
  customerId: string;
  preferredCity: string;
  memberSince: string;
  lifecycleStage?: string;
  segment?: string;
  vinRows: Array<{
    vin: string;
    state: string;
    kmAtOpen: number;
  }>;
  consentSummary: Array<{
    purpose: string;
    active: boolean;
    capturedAt: string;
  }>;
  actorName: string;
  actorRole: string;
}

// ─── HTML template builder ────────────────────────────────────────────────────

function buildHtml(data: C360PdfData): string {
  const generatedAt = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const vinTableRows = data.vinRows.length > 0
    ? data.vinRows
        .map(
          (r) =>
            `<tr>
              <td style="padding:6px 10px;border:1px solid #ccc;font-family:monospace;font-size:12px">${r.vin}</td>
              <td style="padding:6px 10px;border:1px solid #ccc;font-size:12px">${r.state}</td>
              <td style="padding:6px 10px;border:1px solid #ccc;font-size:12px;text-align:right">${r.kmAtOpen.toLocaleString('en-IN')} km</td>
            </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" style="padding:10px;border:1px solid #ccc;text-align:center;color:#888;font-size:12px">No vehicles on record</td></tr>`;

  const consentRows = data.consentSummary.length > 0
    ? data.consentSummary
        .map(
          (c) =>
            `<tr>
              <td style="padding:6px 10px;border:1px solid #ccc;font-size:12px">${c.purpose.replace(/_/g, ' ')}</td>
              <td style="padding:6px 10px;border:1px solid #ccc;font-size:12px;color:${c.active ? '#16a34a' : '#dc2626'}">${c.active ? 'Active' : 'Revoked'}</td>
              <td style="padding:6px 10px;border:1px solid #ccc;font-size:12px;font-family:monospace">${new Date(c.capturedAt).toLocaleDateString('en-IN')}</td>
            </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" style="padding:10px;border:1px solid #ccc;text-align:center;color:#888;font-size:12px">No consents on record</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Customer 360 — ${data.customerName}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 48px;
      font-weight: 700;
      color: rgba(0,0,0,0.05);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 2px;
    }
    .content { position: relative; z-index: 1; }
    .header { border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #666; margin-bottom: 4px; }
    .doc-title { font-size: 22px; font-weight: 700; }
    .customer-name { font-size: 18px; font-weight: 600; margin-top: 8px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .meta-item dt { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
    .meta-item dd { font-size: 13px; font-weight: 500; margin-top: 2px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #444; font-weight: 600; margin-bottom: 10px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 8px 10px; border: 1px solid #ccc; background: #f5f5f5; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e5e5; padding-top: 12px; font-size: 11px; color: #888; }
  </style>
</head>
<body>
  <div class="watermark" aria-hidden="true">BN AUTOMOBILES — CONFIDENTIAL</div>
  <div class="content">
    <div class="header">
      <div class="brand">BN Automobiles — Internal Record</div>
      <div class="doc-title">Customer 360 Profile</div>
      <div class="customer-name">${data.customerName}</div>
    </div>

    <div class="meta-grid">
      <dl class="meta-item">
        <dt>Customer ID</dt>
        <dd>${data.customerId}</dd>
      </dl>
      <dl class="meta-item">
        <dt>Phone</dt>
        <dd>${data.customerPhone}</dd>
      </dl>
      <dl class="meta-item">
        <dt>Preferred City</dt>
        <dd style="text-transform:capitalize">${data.preferredCity}</dd>
      </dl>
      <dl class="meta-item">
        <dt>Member Since</dt>
        <dd>${new Date(data.memberSince).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</dd>
      </dl>
      ${data.lifecycleStage ? `<dl class="meta-item"><dt>Lifecycle</dt><dd>${data.lifecycleStage}</dd></dl>` : ''}
      ${data.segment ? `<dl class="meta-item"><dt>Segment</dt><dd>${data.segment.replace('_', ' ')}</dd></dl>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Vehicles</div>
      <table>
        <thead><tr>
          <th>VIN</th>
          <th>State</th>
          <th style="text-align:right">Odometer at Open</th>
        </tr></thead>
        <tbody>${vinTableRows}</tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Consent Summary (DPDP Act 2023)</div>
      <table>
        <thead><tr>
          <th>Purpose</th>
          <th>Status</th>
          <th>Captured On</th>
        </tr></thead>
        <tbody>${consentRows}</tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by <strong>${data.actorName}</strong> (${data.actorRole}) on ${generatedAt}</p>
      <p style="margin-top:4px">This document is strictly confidential. Unauthorized disclosure is prohibited under DPDP Act 2023.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders the C360 PDF template in a hidden iframe and calls print().
 *
 * Returns a cleanup function (in case caller needs to force-cleanup early).
 * Handles popup-blocker scenario: if contentWindow is null after insertion,
 * calls onPopupBlocked() so the UI can show a toast.
 */
export function printC360Pdf(data: C360PdfData, onPopupBlocked?: () => void): () => void {
  if (typeof document === 'undefined') return () => undefined;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:800px;height:1px;border:none;opacity:0;';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'PDF print frame');
  document.body.appendChild(iframe);

  function cleanup() {
    try {
      document.body.removeChild(iframe);
    } catch {
      // Already removed — ignore
    }
  }

  if (!iframe.contentWindow) {
    cleanup();
    onPopupBlocked?.();
    return () => undefined;
  }

  // Write HTML into iframe
  const html = buildHtml(data);
  iframe.contentDocument?.open();
  iframe.contentDocument?.write(html);
  iframe.contentDocument?.close();

  // Trigger print after a short delay to allow styles to apply
  const printTimer = setTimeout(() => {
    if (!iframe.contentWindow) {
      cleanup();
      onPopupBlocked?.();
      return;
    }
    try {
      iframe.contentWindow.print();
    } catch {
      // print() blocked by browser
      cleanup();
      onPopupBlocked?.();
      return;
    }

    // Remove on afterprint; fallback timeout if afterprint never fires
    const afterPrintHandler = () => {
      clearTimeout(fallbackTimer);
      cleanup();
    };
    iframe.contentWindow.addEventListener('afterprint', afterPrintHandler, { once: true });

    // Fallback: remove after 30s (print dialog closed without printing)
    const fallbackTimer = setTimeout(cleanup, 30_000);
  }, 50);

  return () => {
    clearTimeout(printTimer);
    cleanup();
  };
}
