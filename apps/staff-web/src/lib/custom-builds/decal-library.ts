/**
 * Decal library — V0 placeholder assets for the Ferrari 3D customizer.
 *
 * Assets are inline SVG → base64 data URIs for V0 (no external PNG files needed).
 * A designer can replace with real PNGs in P3.3.5 by swapping the `src` field
 * with `/assets/decals/{slug}.png` paths. No other code changes needed.
 *
 * L59 (locked): Decals V0 = predefined slot overlay. 6 decal choices.
 * Decal PNG format: 1024×1024, transparent background, stored at
 *   apps/staff-web/public/assets/decals/{slug}.png
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §31, L59
 */

// ─── Inline SVG → base64 helpers ─────────────────────────────────────────────

function svgToDataUri(svg: string): string {
  // btoa is not available in all Node environments but IS in Next.js runtime
  // and modern browsers. Safe for client-side use.
  if (typeof btoa === 'function') {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }
  // Node fallback (for tests)
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`;
}

// ─── Refined SVG decals (L100) ────────────────────────────────────────────────
// L100: Upgraded from basic placeholders to refined inline SVGs with gradients,
// drop shadows, bevels, and race-style typography. Still data-URIs; designer
// can swap with PNG paths in `src` field without any other code changes.

// BN Automobiles logo — crisp "BN" in a circle with gold accent + drop shadow
const BN_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#2a2a2a"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="rgba(0,0,0,0.8)"/>
    </filter>
    <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0c040"/>
      <stop offset="50%" stop-color="#c89a20"/>
      <stop offset="100%" stop-color="#f0c040"/>
    </linearGradient>
  </defs>
  <circle cx="512" cy="512" r="440" fill="url(#bgGrad)" filter="url(#shadow)"/>
  <circle cx="512" cy="512" r="440" fill="none" stroke="url(#goldRing)" stroke-width="18"/>
  <circle cx="512" cy="512" r="410" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4"/>
  <text x="512" y="575"
        font-family="Georgia,Times New Roman,serif"
        font-size="310" font-weight="bold" letter-spacing="-8"
        fill="white" text-anchor="middle"
        filter="url(#shadow)">BN</text>
  <text x="512" y="660"
        font-family="Arial,Helvetica,sans-serif"
        font-size="48" font-weight="300" letter-spacing="14"
        fill="#c8a020" text-anchor="middle">AUTOMOBILES</text>
</svg>`;

// Racing stripe — bold layered white/black/red livery bands (2048×512 side-stripe ratio)
const RACING_STRIPE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 512">
  <defs>
    <linearGradient id="fade" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="8%" stop-color="rgba(255,255,255,1)"/>
      <stop offset="92%" stop-color="rgba(255,255,255,1)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <linearGradient id="redFade" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(200,30,30,0)"/>
      <stop offset="8%" stop-color="rgba(200,30,30,1)"/>
      <stop offset="92%" stop-color="rgba(200,30,30,1)"/>
      <stop offset="100%" stop-color="rgba(200,30,30,0)"/>
    </linearGradient>
    <filter id="s" x="-5%" y="-20%" width="110%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.6)"/>
    </filter>
  </defs>
  <rect x="0" y="140" width="2048" height="90" fill="url(#redFade)" filter="url(#s)"/>
  <rect x="0" y="196" width="2048" height="120" fill="url(#fade)" filter="url(#s)"/>
  <rect x="0" y="282" width="2048" height="90" fill="url(#redFade)" filter="url(#s)"/>
  <rect x="0" y="186" width="2048" height="8" fill="rgba(0,0,0,0.5)"/>
  <rect x="0" y="318" width="2048" height="8" fill="rgba(0,0,0,0.5)"/>
</svg>`;

// Number badge — round race badge "88" with serif font, outer ring, drop shadow
const NUMBER_BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="badgeBg" cx="48%" cy="42%" r="52%">
      <stop offset="0%" stop-color="#1e1e1e"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <filter id="bs">
      <feDropShadow dx="0" dy="6" stdDeviation="16" flood-color="rgba(0,0,0,0.9)"/>
    </filter>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#aaaaaa"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <circle cx="512" cy="512" r="448" fill="url(#badgeBg)" filter="url(#bs)"/>
  <circle cx="512" cy="512" r="448" fill="none" stroke="url(#ringGrad)" stroke-width="22"/>
  <circle cx="512" cy="512" r="416" fill="none" stroke="white" stroke-width="5" opacity="0.25"/>
  <circle cx="512" cy="512" r="390" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
  <text x="512" y="610"
        font-family="Georgia,Times New Roman,serif"
        font-size="400" font-weight="bold"
        fill="white" text-anchor="middle"
        filter="url(#bs)">88</text>
</svg>`;

// Side stripe — 2048×512 long horizontal band with carbon-fiber approximation
const SIDE_STRIPE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 512">
  <defs>
    <linearGradient id="stripeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="6%" stop-color="rgba(255,255,255,0.95)"/>
      <stop offset="94%" stop-color="rgba(255,255,255,0.95)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <linearGradient id="cfApprox" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3a3a3a"/>
      <stop offset="25%" stop-color="#1a1a1a"/>
      <stop offset="50%" stop-color="#2e2e2e"/>
      <stop offset="75%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#3a3a3a"/>
    </linearGradient>
    <filter id="ss">
      <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="rgba(0,0,0,0.7)"/>
    </filter>
  </defs>
  <!-- carbon fiber body -->
  <rect x="0" y="156" width="2048" height="200" fill="url(#cfApprox)" filter="url(#ss)"/>
  <!-- diagonal hatching to suggest weave -->
  <line x1="0" y1="156" x2="2048" y2="204" stroke="rgba(80,80,80,0.3)" stroke-width="3"/>
  <line x1="0" y1="204" x2="2048" y2="252" stroke="rgba(80,80,80,0.3)" stroke-width="3"/>
  <line x1="0" y1="252" x2="2048" y2="300" stroke="rgba(80,80,80,0.3)" stroke-width="3"/>
  <line x1="0" y1="300" x2="2048" y2="348" stroke="rgba(80,80,80,0.3)" stroke-width="3"/>
  <!-- white top edge highlight -->
  <rect x="0" y="156" width="2048" height="5" fill="url(#stripeGrad)" opacity="0.7"/>
  <!-- white bottom edge highlight -->
  <rect x="0" y="351" width="2048" height="5" fill="url(#stripeGrad)" opacity="0.4"/>
</svg>`;

// Rear stripe — bold chevron with gradient depth
const REAR_STRIPE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 512">
  <defs>
    <linearGradient id="chevGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#aaaaaa"/>
    </linearGradient>
    <linearGradient id="chevRedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e82020"/>
      <stop offset="100%" stop-color="#990000"/>
    </linearGradient>
    <filter id="cs">
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="rgba(0,0,0,0.8)"/>
    </filter>
  </defs>
  <!-- red accent chevron below -->
  <polyline points="80,360 512,180 944,360" fill="none" stroke="url(#chevRedGrad)"
            stroke-width="38" stroke-linejoin="round" stroke-linecap="round"
            filter="url(#cs)" opacity="0.85"/>
  <!-- main white chevron -->
  <polyline points="80,310 512,130 944,310" fill="none" stroke="url(#chevGrad)"
            stroke-width="52" stroke-linejoin="round" stroke-linecap="round"
            filter="url(#cs)"/>
  <!-- inner accent line -->
  <polyline points="80,310 512,130 944,310" fill="none" stroke="rgba(0,0,0,0.25)"
            stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;

// Tricolor flag — Italian tricolore with gold border, drop shadow, subtle gloss
const TRICOLOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0c840"/>
      <stop offset="50%" stop-color="#c89a20"/>
      <stop offset="100%" stop-color="#f0c840"/>
    </linearGradient>
    <filter id="flagShadow">
      <feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="rgba(0,0,0,0.75)"/>
    </filter>
    <linearGradient id="gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="60%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <g filter="url(#flagShadow)">
    <rect x="92" y="192" width="280" height="640" fill="#009246" rx="6"/>
    <rect x="372" y="192" width="280" height="640" fill="#f4f4f4"/>
    <rect x="652" y="192" width="280" height="640" fill="#ce2b37" rx="6"/>
  </g>
  <!-- gold outer border -->
  <rect x="92" y="192" width="840" height="640" fill="none"
        stroke="url(#goldBorder)" stroke-width="16" rx="8"/>
  <!-- inner thin white border -->
  <rect x="100" y="200" width="824" height="624" fill="none"
        stroke="rgba(255,255,255,0.35)" stroke-width="4" rx="5"/>
  <!-- gloss overlay -->
  <rect x="92" y="192" width="840" height="320" fill="url(#gloss)" rx="8"/>
</svg>`;

// ─── Decal library ────────────────────────────────────────────────────────────

export interface DecalDefinition {
  id: string;
  name: string;
  /** Data URI (V0 inline SVG) or PNG path (V0.1+) */
  src: string;
  /** thumbnail: a compact version for the library grid */
  thumbnail: string;
  /** Price in INR per placement (L78). Billing is per-unit via DECAL_PRICE_PER_UNIT. */
  price: number;
}

export const DECAL_LIBRARY: readonly DecalDefinition[] = [
  {
    id: 'bn-logo',
    name: 'BN Automobiles Logo',
    src: svgToDataUri(BN_LOGO_SVG),
    thumbnail: svgToDataUri(BN_LOGO_SVG),
    price: 5000,
  },
  {
    id: 'racing-stripe',
    name: 'Racing Stripe',
    src: svgToDataUri(RACING_STRIPE_SVG),
    thumbnail: svgToDataUri(RACING_STRIPE_SVG),
    price: 5000,
  },
  {
    id: 'number-badge',
    name: 'Number Badge',
    src: svgToDataUri(NUMBER_BADGE_SVG),
    thumbnail: svgToDataUri(NUMBER_BADGE_SVG),
    price: 5000,
  },
  {
    id: 'side-stripe',
    name: 'Side Stripe',
    src: svgToDataUri(SIDE_STRIPE_SVG),
    thumbnail: svgToDataUri(SIDE_STRIPE_SVG),
    price: 5000,
  },
  {
    id: 'rear-stripe',
    name: 'Rear Stripe',
    src: svgToDataUri(REAR_STRIPE_SVG),
    thumbnail: svgToDataUri(REAR_STRIPE_SVG),
    price: 5000,
  },
  {
    id: 'tricolor',
    name: 'Tricolor Flag',
    src: svgToDataUri(TRICOLOR_SVG),
    thumbnail: svgToDataUri(TRICOLOR_SVG),
    price: 5000,
  },
] as const;

/** Build a quick-lookup map: decalId → src URL */
export function buildDecalSrcMap(): Record<string, string> {
  return Object.fromEntries(DECAL_LIBRARY.map((d) => [d.id, d.src]));
}
