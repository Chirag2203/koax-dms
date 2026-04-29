/**
 * BuildQuotePreviewView — public shareable quote preview.
 *
 * No auth required. Light-themed (customer-facing).
 * Renders only: job title, vehicle make/model/year (no VIN), parts list
 * (display name + list price), quote total, validity date.
 *
 * L93: If BuildJob.visualizerState.customizations is set, renders a static
 *   read-only 3D view of the configured car (OrbitControls disabled, fixed
 *   3/4-front camera angle). Shows customization breakdown table alongside.
 *
 * PII exclusion (L13, §9.6): customer info, bnCost, techNotes, vendor contacts,
 * internal pricing breakdown, and activity log are NEVER rendered or present
 * in this component's data path.
 *
 * 14-day TTL (L8): if quoteExpiresAt < now → QuoteExpiredState.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §9.6, L8, L13, P2, §38 L93
 */

'use client';

import dynamic from 'next/dynamic';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { PAINT_BY_KEY } from '@/src/lib/custom-builds/paint-palette';
import { get3DAsset } from '@/src/lib/custom-builds/visualizer-3d-assets';
import {
  computeCustomizationCost,
  WHEEL_OPTIONS,
  TINT_OPTIONS,
  EXHAUST_OPTIONS,
  SUSPENSION_OPTIONS,
  HOOD_OPTIONS,
  WING_OPTIONS,
} from '@/src/lib/custom-builds/customization-catalog';
import { Phone, Clock, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../shared/format-inr';

// ─── Lazy-loaded 3D canvas (ssr: false — three.js requires browser) ───────────

const Visualizer3DCanvas = dynamic(
  () =>
    import('../visualizer/visualizer-3d-canvas').then((m) => ({
      default: m.Visualizer3DCanvas,
    })),
  { ssr: false },
);

interface Props {
  token: string;
}

function QuoteExpiredState() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <Clock size={48} className="text-gray-300 mb-4" aria-hidden="true" />
      <h1 className="text-[22px] font-semibold text-gray-800 mb-2">This quote has expired</h1>
      <p className="text-[15px] text-gray-500 text-center max-w-sm">
        Quote links are valid for 14 days. Please contact BN Automobiles for a fresh quote.
      </p>
      <div className="mt-6 flex items-center gap-2 text-[14px] text-gray-600">
        <Phone size={16} aria-hidden="true" />
        <span>1800-XXX-XXXX</span>
      </div>
    </div>
  );
}

function QuoteNotFoundState() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <CheckCircle2 size={48} className="text-gray-300 mb-4" aria-hidden="true" />
      <h1 className="text-[22px] font-semibold text-gray-800 mb-2">Quote Not Found</h1>
      <p className="text-[15px] text-gray-500 text-center max-w-sm">
        This link is invalid or has been removed. Please contact BN Automobiles.
      </p>
      <div className="mt-6 flex items-center gap-2 text-[14px] text-gray-600">
        <Phone size={16} aria-hidden="true" />
        <span>1800-XXX-XXXX</span>
      </div>
    </div>
  );
}

/**
 * Derive a public-safe vehicle label (make + model + year) — NO VIN.
 * This is looked up from vehicles-store in the real app; here we use
 * the job's parts to infer make via compatibility (not PII).
 * Per PII exclusion rule: VIN is NEVER shown.
 */
function vehicleLabel(vin: string): string {
  // In P2 mock-only context we return a generic label.
  // In production this would call vehicles-store.getVehicle(vin)
  // and return `${make} ${model} (${year})` — VIN excluded.
  void vin; // intentionally unused — VIN must never appear on preview page
  return 'Vehicle details on file';
}

export function BuildQuotePreviewView({ token }: Props) {
  const jobs = useCustomBuildsStore((s) => s.jobs);
  const vendors = useCustomBuildsStore((s) => s.vendors);

  // Find job by quoteToken — do NOT expose job ID in URL params beyond token
  const job = jobs.find((j) => j.quoteToken === token);

  if (!job) {
    return <QuoteNotFoundState />;
  }

  // 14-day TTL check (L8)
  if (job.quoteExpiresAt && new Date(job.quoteExpiresAt) < new Date()) {
    return <QuoteExpiredState />;
  }

  const vendor = vendors.find((v) => v.id === job.vendorId);

  // Parts shown on public preview: display name + list price only.
  // bnCost is NEVER shown here (PII exclusion §9.6).
  // We use the parts catalog to look up listPrice via sku matching.
  const parts = useCustomBuildsStore.getState().parts;
  const publicParts = job.parts.map((line) => {
    const catalogPart = parts.find((p) => p.sku === line.partSku);
    return {
      name: line.partName,
      listPrice: catalogPart?.listPrice ?? line.unitCost, // fallback; bnCost not used here
      qty: line.qty,
    };
  });

  const validUntil = job.quoteExpiresAt
    ? new Date(job.quoteExpiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* BN Branding Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900">BN Automobiles</h1>
            <p className="text-[12px] text-gray-500">Custom Builds &amp; Modifications</p>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-gray-600">
            <Phone size={15} aria-hidden="true" />
            <span>1800-XXX-XXXX</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Job title + validity */}
        <div>
          <h2 className="text-[22px] font-semibold text-gray-800">{job.title}</h2>
          <p className="text-[13px] text-gray-500 mt-1">
            {vehicleLabel(job.vin)}
            {vendor && (
              <span className="ml-2 text-gray-400">· Fitted by {vendor.city} specialist</span>
            )}
          </p>
          {validUntil && (
            <p className="text-[12px] text-amber-600 mt-1 flex items-center gap-1">
              <Clock size={12} aria-hidden="true" />
              Quote valid until {validUntil}
            </p>
          )}
        </div>

        {/* L93: 3D car render — if visualizer state with customizations is saved */}
        {job.visualizerState?.customizations && (() => {
          const vizState = job.visualizerState!;
          const customizations = vizState.customizations!;
          const modelSlug = vizState.modelSlug ?? 'ferrari';
          const asset3D = get3DAsset(modelSlug);
          // Paint from saved paintKey (stored on vizState as open-shape field)
          const paintKey = (vizState as { paintKey?: string }).paintKey;
          const paintHex = paintKey ? PAINT_BY_KEY[paintKey]?.hex : undefined;
          const paintName = paintKey ? PAINT_BY_KEY[paintKey]?.name : null;
          const paintPrice = paintKey ? (PAINT_BY_KEY[paintKey]?.listPrice ?? 0) : 0;

          // Customization line items for the breakdown table
          const breakdown = computeCustomizationCost({
            paintPrice,
            wheelOptionId: customizations.wheelOptionId,
            tintOptionId: customizations.tintOptionId,
            exhaustOptionId: customizations.exhaustOptionId,
            suspensionOptionId: customizations.suspensionOptionId,
            hoodOptionId: customizations.hoodOptionId,
            wingOptionId: customizations.wingOptionId,
          });

          const customizationLines: { label: string; value: string; price: number }[] = [];
          if (paintName && paintPrice > 0) {
            customizationLines.push({ label: 'Paint', value: paintName, price: paintPrice });
          }
          const wheelOpt = WHEEL_OPTIONS.find((o) => o.id === customizations.wheelOptionId);
          if (wheelOpt && wheelOpt.price > 0) {
            customizationLines.push({ label: 'Wheels', value: wheelOpt.name, price: wheelOpt.price });
          }
          const tintOpt = TINT_OPTIONS.find((o) => o.id === customizations.tintOptionId);
          if (tintOpt && tintOpt.price > 0) {
            customizationLines.push({ label: 'Tint', value: tintOpt.name, price: tintOpt.price });
          }
          const exhOpt = EXHAUST_OPTIONS.find((o) => o.id === customizations.exhaustOptionId);
          if (exhOpt && exhOpt.price > 0) {
            customizationLines.push({ label: 'Exhaust', value: exhOpt.name, price: exhOpt.price });
          }
          const suspOpt = SUSPENSION_OPTIONS.find((o) => o.id === customizations.suspensionOptionId);
          if (suspOpt && suspOpt.price > 0) {
            customizationLines.push({ label: 'Suspension', value: suspOpt.name, price: suspOpt.price });
          }
          const hoodOpt = HOOD_OPTIONS.find((o) => o.id === customizations.hoodOptionId);
          if (hoodOpt && hoodOpt.price > 0) {
            customizationLines.push({ label: 'Hood', value: hoodOpt.name, price: hoodOpt.price });
          }
          const wingOpt = WING_OPTIONS.find((o) => o.id === customizations.wingOptionId);
          if (wingOpt && wingOpt.price > 0) {
            customizationLines.push({ label: 'Wing', value: wingOpt.name, price: wingOpt.price });
          }

          return (
            <section aria-label="3D vehicle configuration preview">
              <h3 className="text-[13px] font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Configuration Preview
              </h3>

              {asset3D.supported ? (
                <div
                  className="rounded-xl overflow-hidden mb-4 bg-[#0a0f1a]"
                  style={{ height: 280 }}
                  aria-label="3D render of configured vehicle"
                >
                  <Visualizer3DCanvas
                    asset={asset3D}
                    paintColor={paintHex}
                    wheelSize={vizState.fineControls?.wheelSize}
                    customizations={customizations}
                    readOnly
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-4" style={{ height: 160 }}>
                  <p className="text-[13px] text-gray-400">3D preview not available for this model</p>
                </div>
              )}

              {customizationLines.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-2">
                  <table className="w-full text-[13px]" role="table" aria-label="Customization options">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th scope="col" className="text-left px-4 py-2.5 font-semibold text-gray-700">Category</th>
                        <th scope="col" className="text-left px-4 py-2.5 font-semibold text-gray-700">Option</th>
                        <th scope="col" className="text-right px-4 py-2.5 font-semibold text-gray-700">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customizationLines.map((line) => (
                        <tr key={line.label} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2.5 text-gray-500">{line.label}</td>
                          <td className="px-4 py-2.5 text-gray-800">{line.value}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-800">{formatINR(line.price)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td colSpan={2} className="px-4 py-2.5 font-semibold text-gray-700">Customizations subtotal (excl. GST)</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">{formatINR(breakdown.subtotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })()}

        {/* Parts list — display name + list price only (no bnCost) */}
        <section aria-label="Parts and modifications included">
          <h3 className="text-[13px] font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Included Modifications
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table
              className="w-full text-[13px]"
              role="table"
              aria-label="Parts and modifications"
            >
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-gray-700">
                    Modification
                  </th>
                  <th scope="col" className="text-center px-4 py-3 font-semibold text-gray-700">
                    Qty
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-semibold text-gray-700">
                    List Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {publicParts.map((p, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-mono">{p.qty}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-800">
                      {formatINR(p.listPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quote total */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-[13px] text-gray-500">Estimated Quote Total</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Including fitment, margin, and applicable GST</p>
          </div>
          <p
            className="text-[26px] font-bold text-gray-900 font-mono tabular-nums"
            aria-label={`Quote total ${formatINR(job.quoteTotal ?? 0)}`}
          >
            {formatINR(job.quoteTotal ?? 0)}
          </p>
        </div>

        {/* CTA */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-blue-800">Ready to proceed?</p>
            <p className="text-[12px] text-blue-600 mt-0.5">
              Contact your BN Automobiles advisor to confirm and book your build.
            </p>
          </div>
          <div className="flex items-center gap-2 text-blue-700 font-medium text-[13px]">
            <Phone size={16} aria-hidden="true" />
            <span>1800-XXX-XXXX</span>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 px-6 py-4 bg-white mt-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] text-gray-400">
            This quote is indicative and subject to final inspection. Prices include parts and
            fitment. GST and regulatory levies apply as per prevailing rates. Quote valid for 14
            days from issue date. BN Automobiles reserves the right to revise pricing based on
            part availability.
          </p>
        </div>
      </footer>
    </div>
  );
}
