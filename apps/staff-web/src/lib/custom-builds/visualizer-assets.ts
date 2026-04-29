/**
 * Visualizer asset registry — SPEC-CUSTOM-BUILDS-001 §9 + §24
 *
 * L35 (locked): 5 base cars in P3.1 (Porsche 911, BMW M4, Audi RS5,
 *   Mercedes-AMG GT, Audi R8). All inline SVG with multi-gradient body,
 *   glass layer, glow lights, ground reflection.
 *
 * L36 (locked): Paint applied via CSS filter (hue-rotate + saturate + brightness)
 *   on base SVG. 12 named luxury colors in paint-palette.ts.
 *
 * L27 (locked): Visualizer asset approach: premium inline SVG silhouettes
 *   shipping in P3.1; production PNG renders provided by designer in P4.
 *   Asset registry at `visualizer-assets.ts` is the single point of swap.
 *
 * To swap in real PNGs: replace the `svg` data-URI strings with `/assets/...`
 * paths. The `isPlaceholder` flag drives the designer-handoff banner.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §9.2, §9.3, §24
 */

import type { AftermarketPartCategory } from '@dms/types';
import { PORSCHE_911_SVG } from './assets/base-porsche-911';
import { BMW_M4_SVG } from './assets/base-bmw-m4';
import { AUDI_RS5_SVG } from './assets/base-audi-rs5';
import { MERCEDES_AMG_GT_SVG } from './assets/base-mercedes-amg-gt';
import { AUDI_R8_SVG } from './assets/base-audi-r8';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssetLayer {
  src: string;
  zIndex: number;
  isPlaceholder: boolean;
}

// ─── Z-index order (bottom → top) ────────────────────────────────────────────
// base → paint → wrap → splitter → diffuser → side-skirts → hood → spoiler → wheels → window-tint

const Z_MAP = {
  base: 0,
  paint: 10,
  wrap: 15,
  splitter: 20,
  diffuser: 25,
  'side-skirts': 30,
  hood: 35,
  spoiler: 40,
  wheels: 45,
  'window-tint': 50,
} as const;

type ZKey = keyof typeof Z_MAP;

function z(key: ZKey): number {
  return Z_MAP[key];
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

const W = 1920;
const H = 1080;
const preamble = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
const end = `</svg>`;

// ─── Overlay SVGs ─────────────────────────────────────────────────────────────

function makeWheelSpokes(cx: number, cy: number, r: number, ir: number, stroke: string, fill: string): string {
  const spokes = 7;
  let paths = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.5"/>`;
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + ir * Math.cos(angle);
    const y1 = cy + ir * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    paths += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="6" opacity="0.8"/>`;
  }
  paths += `<circle cx="${cx}" cy="${cy}" r="${(ir * 0.35).toFixed(1)}" fill="${stroke}" opacity="0.4"/>`;
  return paths;
}

const OVERLAY_CARBON_HOOD = svgDataUri(`${preamble}
  <defs>
    <linearGradient id="ch-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0.8"/>
    </linearGradient>
    <pattern id="carbon" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="4" height="4" fill="#0f172a" opacity="0.9"/>
      <rect x="4" y="4" width="4" height="4" fill="#0f172a" opacity="0.9"/>
      <rect width="4" height="8" fill="#172033" opacity="0.4"/>
    </pattern>
  </defs>
  <g opacity="0.82">
    <path d="M480,600 L510,470 L600,415 L840,405 L1040,480 L1020,590 L680,588 Z"
          fill="url(#ch-grad)"/>
    <path d="M480,600 L510,470 L600,415 L840,405 L1040,480 L1020,590 L680,588 Z"
          fill="url(#carbon)" opacity="0.25"/>
    <!-- Carbon weave highlight -->
    <path d="M520,570 L600,435 M620,430 L1030,558 M700,548 L830,415"
          stroke="#1e3a5f" stroke-width="1" opacity="0.3"/>
    <!-- Hood crease highlight -->
    <path d="M700,416 L720,588" stroke="#334155" stroke-width="1.5" opacity="0.4"/>
    <path d="M760,412 L780,588" stroke="#334155" stroke-width="1.5" opacity="0.4"/>
  </g>
${end}`);

const OVERLAY_CARBON_SPOILER = svgDataUri(`${preamble}
  <defs>
    <pattern id="cspoiler" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3" height="3" fill="#0f172a" opacity="0.9"/>
      <rect x="3" y="3" width="3" height="3" fill="#0f172a" opacity="0.9"/>
      <rect width="3" height="6" fill="#172033" opacity="0.35"/>
    </pattern>
    <filter id="sp-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g opacity="0.88">
    <!-- GT wing main element -->
    <path d="M1250,365 L1390,365 L1408,380 L1390,395 L1250,395 L1232,380 Z"
          fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
    <path d="M1250,365 L1390,365 L1408,380 L1390,395 L1250,395 L1232,380 Z"
          fill="url(#cspoiler)" opacity="0.3"/>
    <!-- Wing top highlight strip -->
    <line x1="1236" y1="372" x2="1400" y2="372"
          stroke="#334155" stroke-width="1.5" opacity="0.5"/>
    <!-- Endplates -->
    <rect x="1230" y="362" width="24" height="68" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <rect x="1386" y="362" width="24" height="68" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <!-- Gurney flap on trailing edge -->
    <line x1="1232" y1="393" x2="1408" y2="393" stroke="#1e293b" stroke-width="3"/>
    <!-- Mounting posts -->
    <rect x="1268" y="395" width="8" height="52" rx="2" fill="#1e293b" stroke="#374151" stroke-width="1"/>
    <rect x="1364" y="395" width="8" height="52" rx="2" fill="#1e293b" stroke="#374151" stroke-width="1"/>
  </g>
${end}`);

const OVERLAY_CARBON_SPLITTER = svgDataUri(`${preamble}
  <defs>
    <pattern id="csplit" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3" height="3" fill="#0f172a" opacity="0.9"/>
      <rect x="3" y="3" width="3" height="3" fill="#0f172a" opacity="0.9"/>
      <rect width="3" height="6" fill="#172033" opacity="0.35"/>
    </pattern>
  </defs>
  <g opacity="0.85">
    <!-- Main splitter plate -->
    <path d="M272,718 L284,682 L460,666 L468,692 L468,722 Z"
          fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
    <path d="M272,718 L284,682 L460,666 L468,692 L468,722 Z"
          fill="url(#csplit)" opacity="0.3"/>
    <!-- Splitter fins (canards) -->
    <path d="M290,718 L294,686 L302,686 L298,718 Z" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <path d="M328,714 L332,678 L340,678 L336,714 Z" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <path d="M366,712 L370,676 L378,676 L374,712 Z" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <path d="M404,710 L408,674 L416,674 L412,710 Z" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <!-- Splitter edge highlight -->
    <line x1="272" y1="718" x2="468" y2="722" stroke="#334155" stroke-width="2" opacity="0.5"/>
  </g>
${end}`);

const OVERLAY_CARBON_DIFFUSER = svgDataUri(`${preamble}
  <defs>
    <pattern id="cdiff" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3" height="3" fill="#0f172a" opacity="0.9"/>
      <rect x="3" y="3" width="3" height="3" fill="#0f172a" opacity="0.9"/>
      <rect width="3" height="6" fill="#172033" opacity="0.35"/>
    </pattern>
  </defs>
  <g opacity="0.88">
    <!-- Main diffuser panel -->
    <path d="M1548,695 L1568,662 L1648,672 L1648,730 L1548,730 Z"
          fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
    <path d="M1548,695 L1568,662 L1648,672 L1648,730 L1548,730 Z"
          fill="url(#cdiff)" opacity="0.25"/>
    <!-- Diffuser channels -->
    <line x1="1568" y1="668" x2="1572" y2="730" stroke="#1e293b" stroke-width="2" opacity="0.7"/>
    <line x1="1592" y1="664" x2="1596" y2="730" stroke="#1e293b" stroke-width="2" opacity="0.7"/>
    <line x1="1616" y1="666" x2="1620" y2="730" stroke="#1e293b" stroke-width="2" opacity="0.7"/>
    <line x1="1640" y1="668" x2="1644" y2="730" stroke="#1e293b" stroke-width="2" opacity="0.7"/>
    <!-- Bottom edge highlight -->
    <line x1="1548" y1="726" x2="1648" y2="728" stroke="#334155" stroke-width="2" opacity="0.4"/>
  </g>
${end}`);

const OVERLAY_CARBON_SIDE_SKIRTS = svgDataUri(`${preamble}
  <defs>
    <pattern id="cskirt" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3" height="3" fill="#0f172a" opacity="0.9"/>
      <rect x="3" y="3" width="3" height="3" fill="#0f172a" opacity="0.9"/>
      <rect width="3" height="6" fill="#172033" opacity="0.35"/>
    </pattern>
  </defs>
  <g opacity="0.82">
    <!-- Main skirt body -->
    <path d="M555,720 L558,700 L1290,700 L1293,720 Z"
          fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
    <path d="M555,720 L558,700 L1290,700 L1293,720 Z"
          fill="url(#cskirt)" opacity="0.25"/>
    <!-- Upper taper -->
    <path d="M558,700 L580,688 L1270,688 L1290,700 Z"
          fill="#172033" opacity="0.55"/>
    <!-- Skirt lip shadow -->
    <line x1="555" y1="720" x2="1293" y2="720" stroke="#334155" stroke-width="2" opacity="0.4"/>
  </g>
${end}`);

const OVERLAY_FORGED_18_GLOSS = svgDataUri(`${preamble}
  <g>
    ${makeWheelSpokes(510, 728, 90, 58, '#60a5fa', '#1e3a5f')}
    ${makeWheelSpokes(1400, 728, 90, 58, '#60a5fa', '#1e3a5f')}
  </g>
${end}`);

const OVERLAY_FORGED_19_SATIN = svgDataUri(`${preamble}
  <g>
    ${makeWheelSpokes(510, 728, 90, 56, '#94a3b8', '#1e293b')}
    ${makeWheelSpokes(1400, 728, 90, 56, '#94a3b8', '#1e293b')}
  </g>
${end}`);

const OVERLAY_ALLOY_18_GLOSS = svgDataUri(`${preamble}
  <g>
    ${makeWheelSpokes(510, 728, 88, 52, '#d1d5db', '#374151')}
    ${makeWheelSpokes(1400, 728, 88, 52, '#d1d5db', '#374151')}
  </g>
${end}`);

const OVERLAY_ALLOY_20_BRUSHED = svgDataUri(`${preamble}
  <g>
    ${makeWheelSpokes(510, 728, 92, 60, '#b0b8c8', '#2d3748')}
    ${makeWheelSpokes(1400, 728, 92, 60, '#b0b8c8', '#2d3748')}
  </g>
${end}`);

/** Wrap overlays */
const OVERLAY_WRAP_MATTE_BLACK = svgDataUri(`${preamble}
  <defs>
    <pattern id="matte-noise" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#0a0a0a" opacity="0.6"/>
      <rect x="1" y="1" width="2" height="2" fill="#111" opacity="0.3"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="#0f172a" opacity="0.6"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#matte-noise)" opacity="0.15"/>
${end}`);

const OVERLAY_WRAP_SATIN_GOLD = svgDataUri(`${preamble}
  <defs>
    <linearGradient id="sg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b45309" stop-opacity="0.4"/>
      <stop offset="50%" stop-color="#92400e" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#78350f" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sg-grad)"/>
${end}`);

const OVERLAY_WRAP_CARBON_FIBER = svgDataUri(`${preamble}
  <defs>
    <pattern id="cf-weave" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill="#0f172a"/>
      <rect x="0" y="0" width="8" height="8" fill="#172033" opacity="0.6"/>
      <rect x="8" y="8" width="8" height="8" fill="#172033" opacity="0.6"/>
      <line x1="0" y1="8" x2="16" y2="8" stroke="#0a0a0a" stroke-width="0.5"/>
      <line x1="8" y1="0" x2="8" y2="16" stroke="#0a0a0a" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#cf-weave)" opacity="0.55"/>
${end}`);

/** Window tint overlays */
const OVERLAY_TINT_LIGHT = svgDataUri(`${preamble}
  <g opacity="0.28">
    <path d="M510,470 L600,415 L840,400 L1060,398 L1100,470 L860,495 Z" fill="#0f172a"/>
    <path d="M1180,430 L1240,490 L1220,500 L1140,440 Z" fill="#0f172a"/>
  </g>
${end}`);

const OVERLAY_TINT_MEDIUM = svgDataUri(`${preamble}
  <g opacity="0.52">
    <path d="M510,470 L600,415 L840,400 L1060,398 L1100,470 L860,495 Z" fill="#0f172a"/>
    <path d="M1180,430 L1240,490 L1220,500 L1140,440 Z" fill="#0f172a"/>
  </g>
${end}`);

const OVERLAY_TINT_DARK = svgDataUri(`${preamble}
  <g opacity="0.82">
    <path d="M510,470 L600,415 L840,400 L1060,398 L1100,470 L860,495 Z" fill="#020617"/>
    <path d="M1180,430 L1240,490 L1220,500 L1140,440 Z" fill="#020617"/>
  </g>
${end}`);

// ─── Base layer registry ──────────────────────────────────────────────────────

export interface BaseLayerRecord {
  src: string;
  modelSlug: string;
  displayName: string;
  isPlaceholder: boolean;
}

const BASE_LAYERS: Record<string, BaseLayerRecord> = {
  'porsche-911': {
    src: PORSCHE_911_SVG,
    modelSlug: 'porsche-911',
    displayName: 'Porsche 911',
    isPlaceholder: false,
  },
  'bmw-m4': {
    src: BMW_M4_SVG,
    modelSlug: 'bmw-m4',
    displayName: 'BMW M4',
    isPlaceholder: false,
  },
  'audi-rs5': {
    src: AUDI_RS5_SVG,
    modelSlug: 'audi-rs5',
    displayName: 'Audi RS5',
    isPlaceholder: false,
  },
  'mercedes-amg-gt': {
    src: MERCEDES_AMG_GT_SVG,
    modelSlug: 'mercedes-amg-gt',
    displayName: 'Mercedes-AMG GT',
    isPlaceholder: false,
  },
  'audi-r8': {
    src: AUDI_R8_SVG,
    modelSlug: 'audi-r8',
    displayName: 'Audi R8',
    isPlaceholder: false,
  },
};

/** All 5 supported demo vehicles as an array (for the vehicle selector). */
export const SUPPORTED_VEHICLES = Object.values(BASE_LAYERS);

// ─── Overlay layer registry ───────────────────────────────────────────────────

interface OverlayRecord {
  src: string;
  zIndex: number;
  isPlaceholder: boolean;
  label: string;
  listPrice: number;
  category: AftermarketPartCategory | 'paint' | 'wrap' | 'window-tint';
}

const OVERLAYS: Record<string, OverlayRecord> = {
  // Aero
  'carbon-hood': {
    src: OVERLAY_CARBON_HOOD, zIndex: z('hood'), isPlaceholder: false,
    label: 'Carbon Fibre Hood', listPrice: 95000, category: 'aero',
  },
  'carbon-spoiler': {
    src: OVERLAY_CARBON_SPOILER, zIndex: z('spoiler'), isPlaceholder: false,
    label: 'Carbon Rear Wing', listPrice: 120000, category: 'aero',
  },
  'carbon-splitter': {
    src: OVERLAY_CARBON_SPLITTER, zIndex: z('splitter'), isPlaceholder: false,
    label: 'Carbon Front Splitter', listPrice: 55000, category: 'aero',
  },
  'carbon-diffuser': {
    src: OVERLAY_CARBON_DIFFUSER, zIndex: z('diffuser'), isPlaceholder: false,
    label: 'Carbon Rear Diffuser', listPrice: 65000, category: 'aero',
  },
  'carbon-side-skirts': {
    src: OVERLAY_CARBON_SIDE_SKIRTS, zIndex: z('side-skirts'), isPlaceholder: false,
    label: 'Carbon Side Skirts', listPrice: 80000, category: 'aero',
  },
  // Wheels
  'forged-18-gloss': {
    src: OVERLAY_FORGED_18_GLOSS, zIndex: z('wheels'), isPlaceholder: false,
    label: 'Forged 18" Gloss Black', listPrice: 180000, category: 'wheels',
  },
  'forged-19-satin': {
    src: OVERLAY_FORGED_19_SATIN, zIndex: z('wheels'), isPlaceholder: false,
    label: 'Forged 19" Satin Silver', listPrice: 210000, category: 'wheels',
  },
  'alloy-18-gloss': {
    src: OVERLAY_ALLOY_18_GLOSS, zIndex: z('wheels'), isPlaceholder: false,
    label: 'Alloy 18" Gloss', listPrice: 125000, category: 'wheels',
  },
  'alloy-20-brushed': {
    src: OVERLAY_ALLOY_20_BRUSHED, zIndex: z('wheels'), isPlaceholder: false,
    label: 'Alloy 20" Brushed', listPrice: 160000, category: 'wheels',
  },
  // Wrap
  'matte-black': {
    src: OVERLAY_WRAP_MATTE_BLACK, zIndex: z('wrap'), isPlaceholder: false,
    label: 'Matte Black Wrap', listPrice: 95000, category: 'wrap',
  },
  'satin-gold': {
    src: OVERLAY_WRAP_SATIN_GOLD, zIndex: z('wrap'), isPlaceholder: false,
    label: 'Satin Gold Wrap', listPrice: 105000, category: 'wrap',
  },
  'carbon-fiber': {
    src: OVERLAY_WRAP_CARBON_FIBER, zIndex: z('wrap'), isPlaceholder: false,
    label: 'Carbon Fiber Wrap', listPrice: 120000, category: 'wrap',
  },
  // Window tint
  'tint-light': {
    src: OVERLAY_TINT_LIGHT, zIndex: z('window-tint'), isPlaceholder: false,
    label: 'Light Tint (35%)', listPrice: 18000, category: 'window-tint',
  },
  'tint-medium': {
    src: OVERLAY_TINT_MEDIUM, zIndex: z('window-tint'), isPlaceholder: false,
    label: 'Medium Tint (20%)', listPrice: 22000, category: 'window-tint',
  },
  'tint-dark': {
    src: OVERLAY_TINT_DARK, zIndex: z('window-tint'), isPlaceholder: false,
    label: 'Dark Tint (5%)', listPrice: 28000, category: 'window-tint',
  },
};

// ─── Exported access functions ────────────────────────────────────────────────

/**
 * Resolve a base silhouette for a vehicle.
 *
 * Returns supported=false + placeholder for unrecognised makes/models.
 * @param modelSlug  e.g. 'porsche-911', 'bmw-m4', 'audi-rs5', 'mercedes-amg-gt', 'audi-r8'
 */
export function getBaseLayer(modelSlug: string): BaseLayerRecord & { supported: boolean } {
  const record = BASE_LAYERS[modelSlug];
  if (record) {
    return { ...record, supported: true };
  }
  return {
    src: svgDataUri(`${preamble}
      <rect x="200" y="500" width="1520" height="280" rx="12" fill="#1e293b" opacity="0.5"/>
      <text x="960" y="660" text-anchor="middle" font-family="system-ui,sans-serif"
            font-size="36" fill="#6b7280">Car silhouette — coming soon</text>
    ${end}`),
    modelSlug,
    displayName: modelSlug,
    isPlaceholder: true,
    supported: false,
  };
}

/** Resolve an overlay layer for a given renderAssetKey. */
export function getOverlayLayer(renderAssetKey: string): AssetLayer | undefined {
  const record = OVERLAYS[renderAssetKey];
  if (!record) return undefined;
  return {
    src: record.src,
    zIndex: record.zIndex,
    isPlaceholder: record.isPlaceholder,
  };
}

/** All overlay entries — used by the part picker rail. */
export function getAllOverlays(): Array<{ key: string } & OverlayRecord> {
  return Object.entries(OVERLAYS).map(([key, val]) => ({ key, ...val }));
}

/**
 * Map a vehicle make + model to its modelSlug.
 * Best-effort; falls back to a slug-ified version of make+model.
 */
export function vehicleToModelSlug(make: string, model: string): string {
  const makeL = make.toLowerCase();
  const modelL = model.toLowerCase();

  // Ferrari comes first — the only 3D-supported make in v0 (L57)
  if (makeL.includes('ferrari')) return 'ferrari';

  if (makeL === 'porsche' && modelL.includes('911')) return 'porsche-911';
  if (makeL === 'bmw' && (modelL.includes('m4') || modelL.includes('m 4'))) return 'bmw-m4';
  if (makeL === 'audi' && (modelL.includes('rs5') || modelL.includes('rs 5'))) return 'audi-rs5';
  if ((makeL === 'mercedes' || makeL === 'mercedes-benz') && (modelL.includes('amg gt') || modelL.includes('amg-gt'))) return 'mercedes-amg-gt';
  if (makeL === 'audi' && (modelL.includes('r8'))) return 'audi-r8';

  return `${makeL.replace(/\s+/g, '-')}-${modelL.replace(/\s+/g, '-')}`;
}

/** Category display order for the picker rail. */
export const CATEGORY_ORDER: Array<AftermarketPartCategory | 'paint' | 'wrap' | 'window-tint'> = [
  'aero', 'wheels', 'wrap', 'window-tint', 'suspension', 'exhaust', 'interior', 'ecu', 'lighting',
];

/** Human-readable category labels. */
export const CATEGORY_LABELS: Record<string, string> = {
  aero: 'Aero',
  wheels: 'Wheels',
  paint: 'Paint',
  wrap: 'Wrap',
  'window-tint': 'Window Tint',
  suspension: 'Suspension',
  exhaust: 'Exhaust',
  interior: 'Interior',
  ecu: 'ECU Tune',
  lighting: 'Lighting',
};

/** Category icons (lucide names) for the tab bar */
export const CATEGORY_ICONS: Record<string, string> = {
  aero: 'Wind',
  wheels: 'CircleDot',
  paint: 'Paintbrush',
  wrap: 'Layers',
  'window-tint': 'SunDim',
  suspension: 'ArrowUpDown',
  exhaust: 'Flame',
  interior: 'Armchair',
  ecu: 'Cpu',
  lighting: 'Lightbulb',
};
