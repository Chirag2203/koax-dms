/**
 * Customization catalog — priced options for each 3D customization category.
 *
 * L78: Each option has id/name/price/description. Selection ID persisted in
 *   `customizations.{category}OptionId` on the visualizer state.
 * L79: Hood + Wing categories added (P3.3.6). Visual rendering deferred;
 *   price applies to quote regardless.
 * L82: Stock option (price: 0) always available + first in each catalog.
 * L83: Hood catalog expanded to 6 options with brand + weightSaving + material metadata.
 * L84: Wing catalog expanded to 7 options with brand + downforceKgAt200 + adjustable/active flags.
 * L85: Wheel catalog expanded to 8 options including BBS, OZ, HRE, Vossen, Anrky brands;
 *   size (20"/21"/22") + finish + tireSet flag for Michelin set.
 * L86: Tint catalog expanded to 9 options with brand (3M, LLumar, SunTek, XPel) +
 *   VLT% (visible light transmission).
 * L87: Exhaust catalog expanded to 8 options with brand depth (Akrapovic, Tubi, Capristo,
 *   iPE Innotech) + material + weightSavingKg + valvetronic flag.
 * L88: Suspension catalog expanded to 7 options including KW V3, KW Clubsport, Air Lift 3P.
 *   adjustable/raceSpec/airRide flags.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L78–L82; §37, L83–L90
 */

// ─── Shared type ──────────────────────────────────────────────────────────────

export interface CatalogOption {
  id: string;
  name: string;
  brand?: string;
  price: number; // INR, whole numbers only
  description?: string;
  material?: string;
  weightSavingKg?: number;
}

// ─── Wheel options ────────────────────────────────────────────────────────────

export interface WheelOption extends CatalogOption {
  finish: 'silver' | 'gunmetal' | 'gloss-black' | 'bronze' | 'brushed';
  size?: string;
  tireSet?: boolean;
}

export const WHEEL_OPTIONS: WheelOption[] = [
  {
    id: 'wheel-stock',
    name: 'Stock Forged',
    brand: 'Ferrari OEM',
    price: 0,
    finish: 'silver',
    size: '20"',
    description: 'Factory 5-spoke forged',
  },
  {
    id: 'wheel-gunmetal',
    name: '20" Gunmetal Forged',
    brand: 'BBS Motorsport',
    price: 145000,
    finish: 'gunmetal',
    size: '20"',
    description: 'Single-piece forged. -3.2kg per wheel.',
  },
  {
    id: 'wheel-gloss-black',
    name: '20" Gloss Black',
    brand: 'OZ Superleggera',
    price: 165000,
    finish: 'gloss-black',
    size: '20"',
    description: 'Lightweight 5-spoke. Concours-grade finish.',
  },
  {
    id: 'wheel-bronze',
    name: '21" Forged Bronze',
    brand: 'HRE P101SC',
    price: 245000,
    finish: 'bronze',
    size: '21"',
    description: 'Custom 3-piece forged. Brushed bronze face.',
  },
  {
    id: 'wheel-brushed',
    name: '20" Brushed Aluminum',
    brand: 'BBS LM',
    price: 195000,
    finish: 'brushed',
    size: '20"',
    description: 'Iconic split-spoke. Matt brushed finish.',
  },
  {
    id: 'wheel-vossen-21',
    name: '21" Vossen Forged',
    brand: 'Vossen S17-01',
    price: 285000,
    finish: 'gunmetal',
    size: '21"',
    description: 'Concave deep-dish. Polished lip.',
  },
  {
    id: 'wheel-anrky-22',
    name: '22" Anrky AN35',
    brand: 'ANRKY Wheels',
    price: 425000,
    finish: 'gloss-black',
    size: '22"',
    description: 'Bespoke 3-piece. Brushed center, polished barrel.',
  },
  {
    id: 'wheel-michelin-pilot',
    name: 'Michelin Pilot Sport 4S Set',
    brand: 'Michelin',
    price: 165000,
    finish: 'silver',
    size: '20"',
    description: 'OEM-spec performance tires. Set of 4 with TPMS.',
    tireSet: true,
  },
];

// ─── Tint options ─────────────────────────────────────────────────────────────

export interface TintOption extends CatalogOption {
  level: number; // 0–100
  color: 'smoke' | 'blue' | 'mirror' | 'amber' | 'clear';
  vlt?: number; // visible light transmission %
  includesPpf?: boolean;
}

export const TINT_OPTIONS: TintOption[] = [
  {
    id: 'tint-stock',
    name: 'Clear (No Tint)',
    brand: '—',
    price: 0,
    level: 0,
    color: 'clear',
    vlt: 100,
  },
  {
    id: 'tint-light-smoke',
    name: '3M Crystalline 70',
    brand: '3M',
    price: 18000,
    level: 30,
    color: 'smoke',
    vlt: 70,
    description: 'Premium ceramic — 99% UV block, no signal interference',
  },
  {
    id: 'tint-medium-smoke',
    name: '3M Crystalline 50',
    brand: '3M',
    price: 25000,
    level: 50,
    color: 'smoke',
    vlt: 50,
    description: 'Premium ceramic — high heat rejection',
  },
  {
    id: 'tint-dark-smoke',
    name: '3M Crystalline 30',
    brand: '3M',
    price: 32000,
    level: 70,
    color: 'smoke',
    vlt: 30,
    description: 'Maximum legal tint — Karnataka VLT 70%+ on rear only',
  },
  {
    id: 'tint-llumar',
    name: 'LLumar Stratos 30',
    brand: 'LLumar',
    price: 28500,
    level: 70,
    color: 'smoke',
    vlt: 30,
    description: 'Nano-ceramic — 99% UV block, 60% heat rejection',
  },
  {
    id: 'tint-blue-30',
    name: 'SunTek Carbon Blue',
    brand: 'SunTek',
    price: 28000,
    level: 50,
    color: 'blue',
    vlt: 50,
    description: 'Subtle blue cast',
  },
  {
    id: 'tint-bronze',
    name: 'Bronze Heritage',
    brand: 'XPel Prime XR',
    price: 35000,
    level: 50,
    color: 'amber',
    vlt: 50,
    description: 'Vintage bronze tone — period-correct for classics',
  },
  {
    id: 'tint-mirror',
    name: 'Mirror Reflective',
    brand: 'XPel',
    price: 45000,
    level: 70,
    color: 'mirror',
    vlt: 30,
    description: 'Show-quality mirror finish — note: not road-legal in some states',
  },
  {
    id: 'tint-ppf-clear',
    name: 'XPel PPF + Tint Combo',
    brand: 'XPel Stealth',
    price: 65000,
    level: 50,
    color: 'smoke',
    vlt: 50,
    description: 'Paint Protection Film + ceramic tint — 10-yr warranty',
    includesPpf: true,
  },
];

// ─── Exhaust options ──────────────────────────────────────────────────────────

export interface ExhaustOption extends CatalogOption {
  tipStyle: 'stock-chrome' | 'twin-polished' | 'quad-black' | 'carbon-tipped';
  mufflerDeleted: boolean;
  valvetronic?: boolean;
}

export const EXHAUST_OPTIONS: ExhaustOption[] = [
  {
    id: 'exh-stock',
    name: 'Stock',
    brand: 'Ferrari OEM',
    price: 0,
    tipStyle: 'stock-chrome',
    mufflerDeleted: false,
    description: 'Factory exhaust',
  },
  {
    id: 'exh-twin-polished',
    name: 'Twin Polished Tips',
    brand: 'Capristo',
    price: 95000,
    tipStyle: 'twin-polished',
    mufflerDeleted: false,
    description: 'OEM-spec replacement — straight-through center',
  },
  {
    id: 'exh-quad-black',
    name: 'Quad Black-Tipped',
    brand: 'Novitec',
    price: 125000,
    tipStyle: 'quad-black',
    mufflerDeleted: false,
    description: 'Ceramic-coated quad exhaust',
  },
  {
    id: 'exh-carbon',
    name: 'Carbon Fiber Tips',
    brand: 'Capristo',
    price: 165000,
    tipStyle: 'carbon-tipped',
    mufflerDeleted: false,
    description: 'Twill carbon weave tips, titanium piping',
  },
  {
    id: 'exh-akrapovic-evolution',
    name: 'Akrapovic Evolution',
    brand: 'Akrapovic',
    price: 385000,
    tipStyle: 'twin-polished',
    mufflerDeleted: false,
    description: 'Titanium full-system. -16kg. Track-tested.',
    material: 'Titanium',
    weightSavingKg: 16,
  },
  {
    id: 'exh-akrapovic',
    name: 'Akrapovic Race + Muffler Delete',
    brand: 'Akrapovic',
    price: 485000,
    tipStyle: 'twin-polished',
    mufflerDeleted: true,
    description: 'Track-only — non-road-legal in Karnataka',
    material: 'Titanium',
    weightSavingKg: 22,
  },
  {
    id: 'exh-tubi',
    name: 'Tubi Style Stainless',
    brand: 'Tubi Style',
    price: 295000,
    tipStyle: 'twin-polished',
    mufflerDeleted: false,
    description: 'Italian craftsmanship. Distinctive Tubi soundtrack.',
    material: 'Stainless Steel',
  },
  {
    id: 'exh-iPE',
    name: 'iPE Innotech Valvetronic',
    brand: 'iPE Innotech',
    price: 225000,
    tipStyle: 'quad-black',
    mufflerDeleted: false,
    description: 'Active valve control — quiet/sport modes. Smartphone app.',
    material: 'Stainless + Carbon Tips',
    valvetronic: true,
  },
];

// ─── Suspension options ───────────────────────────────────────────────────────

export interface SuspensionOption extends CatalogOption {
  loweringMm: number;
  adjustable?: boolean;
  raceSpec?: boolean;
  airRide?: boolean;
}

export const SUSPENSION_OPTIONS: SuspensionOption[] = [
  {
    id: 'susp-stock',
    name: 'Stock Magnetic Ride',
    brand: 'Ferrari OEM',
    price: 0,
    loweringMm: 0,
    description: 'Factory MagnaRide adaptive damping',
  },
  {
    id: 'susp-eibach-15',
    name: 'Eibach Pro-Kit -15mm',
    brand: 'Eibach',
    price: 65000,
    loweringMm: 15,
    description: 'Progressive-rate springs. Retains MagnaRide.',
  },
  {
    id: 'susp-eibach-30',
    name: 'Eibach Sportline -30mm',
    brand: 'Eibach',
    price: 95000,
    loweringMm: 30,
    description: 'Aggressive lowering springs. Retains MagnaRide.',
  },
  {
    id: 'susp-novitec',
    name: 'Novitec Lowering Module -25mm',
    brand: 'Novitec',
    price: 145000,
    loweringMm: 25,
    description: 'Electronic ride-height controller. Retains adaptive.',
  },
  {
    id: 'susp-coilovers-40',
    name: 'KW V3 Coilovers -40mm',
    brand: 'KW Suspensions',
    price: 285000,
    loweringMm: 40,
    description: '16-way adjustable damping. Track-day capable.',
    adjustable: true,
  },
  {
    id: 'susp-coilovers-clubsport',
    name: 'KW Clubsport 2-Way -45mm',
    brand: 'KW Suspensions',
    price: 425000,
    loweringMm: 45,
    description: 'Race-spec dual adjustable. FIA-approved.',
    adjustable: true,
    raceSpec: true,
  },
  {
    id: 'susp-airride',
    name: 'Air Lift Performance 3P',
    brand: 'Air Lift',
    price: 525000,
    loweringMm: 50,
    description: 'Air ride with bluetooth presets. Adjustable on-the-fly.',
    adjustable: true,
    airRide: true,
  },
];

// ─── Hood options (P3.3.6 — L83) ─────────────────────────────────────────────

export interface HoodOption extends CatalogOption {
  // No separate visualizer property — visual deferred to v0.1 (L79)
}

export const HOOD_OPTIONS: HoodOption[] = [
  {
    id: 'hood-stock',
    name: 'Stock Bonnet',
    brand: 'Ferrari OEM',
    price: 0,
    description: 'Factory aluminum bonnet — original Ferrari spec',
  },
  {
    id: 'hood-carbon-twill',
    name: 'Twill Carbon Bonnet',
    brand: 'Capristo',
    price: 285000,
    description: '2x2 twill weave, lacquer-finished. -8.5kg vs OEM. Track-tested.',
    weightSavingKg: 8.5,
    material: 'Carbon Fiber Twill',
  },
  {
    id: 'hood-gt-vented',
    name: 'GT Vented Carbon Bonnet',
    brand: 'Novitec',
    price: 385000,
    description: 'Twin functional vents for engine bay airflow. -10kg. Wind-tunnel optimized.',
    weightSavingKg: 10,
    material: 'Carbon Fiber + Aluminum Vents',
  },
  {
    id: 'hood-forged-carbon',
    name: 'Forged Carbon Bonnet',
    brand: 'Mansory',
    price: 525000,
    description: 'Forged carbon composite — exclusive marbled finish. -11kg.',
    weightSavingKg: 11,
    material: 'Forged Carbon',
  },
  {
    id: 'hood-cf-vented-pro',
    name: 'Pro Race Vented Bonnet',
    brand: 'Capristo',
    price: 645000,
    description: 'Triple-vent race spec, FIA-approved cooling. Track-day ready.',
    weightSavingKg: 12,
    material: 'Pre-preg Carbon Fiber',
  },
  {
    id: 'hood-glasswire',
    name: 'Glass-Inset Display Bonnet',
    brand: 'Mansory',
    price: 825000,
    description: 'Tempered glass insert showcasing engine bay. Showroom-grade.',
    weightSavingKg: 6,
    material: 'Carbon Fiber + Tempered Glass',
  },
];

// ─── Wing options (P3.3.6 — L84) ─────────────────────────────────────────────

export interface WingOption extends CatalogOption {
  downforceKgAt200?: number;
  adjustable?: boolean;
  active?: boolean;
  raceSpec?: boolean;
}

export const WING_OPTIONS: WingOption[] = [
  {
    id: 'wing-stock',
    name: 'No Spoiler',
    brand: 'Ferrari OEM',
    price: 0,
    description: 'Stock rear deck — clean profile',
  },
  {
    id: 'wing-lip',
    name: 'Carbon Lip Spoiler',
    brand: 'Capristo',
    price: 65000,
    description: 'Subtle aerodynamic lip — adds 4kg downforce at 200km/h',
    downforceKgAt200: 4,
    material: 'Carbon Fiber Lip',
  },
  {
    id: 'wing-ducktail',
    name: 'Ducktail Spoiler',
    brand: 'Novitec',
    price: 125000,
    description: 'Classic 911-inspired ducktail. 6kg downforce.',
    downforceKgAt200: 6,
    material: 'Carbon Fiber',
  },
  {
    id: 'wing-gt3-replica',
    name: 'GT3-Style Adjustable Wing',
    brand: 'Misha Designs',
    price: 285000,
    description: '3-position angle adjustment. 18kg downforce at race angle.',
    downforceKgAt200: 18,
    material: 'Carbon Fiber + Aluminum Brackets',
    adjustable: true,
  },
  {
    id: 'wing-fxx-replica',
    name: 'FXX-K Race Wing',
    brand: 'Mansory',
    price: 485000,
    description: 'Inspired by Ferrari FXX. 28kg downforce. Aggressive race-spec.',
    downforceKgAt200: 28,
    material: 'Pre-preg Carbon Fiber',
    adjustable: true,
  },
  {
    id: 'wing-active',
    name: 'Active Aero Spoiler',
    brand: 'Capristo',
    price: 685000,
    description: 'Speed-deploying active aero — automatic at >120km/h.',
    downforceKgAt200: 22,
    material: 'Carbon Fiber + Servo Motors',
    active: true,
  },
  {
    id: 'wing-swan-neck',
    name: 'Swan-Neck GT Wing',
    brand: 'APR Performance',
    price: 425000,
    description: 'Inverted-mount design — clean underwing airflow. 35kg downforce.',
    downforceKgAt200: 35,
    material: 'Pre-preg Carbon Fiber + Titanium Stanchions',
    adjustable: true,
    raceSpec: true,
  },
];

// ─── Decal price map ──────────────────────────────────────────────────────────

/** Price per decal placement (flat rate per active decal) */
export const DECAL_PRICE_PER_UNIT = 5000;

// ─── Cost computation ─────────────────────────────────────────────────────────

export interface CustomizationCostBreakdown {
  paintPrice: number;
  wheelPrice: number;
  tintPrice: number;
  exhaustPrice: number;
  suspensionPrice: number;
  hoodPrice: number;
  wingPrice: number;
  decalPrice: number;
  subtotal: number;
  gst: number;
  total: number;
}

const GST_RATE = 0.18;

/**
 * Compute customization cost breakdown from selected option IDs + decal count + paint price.
 * L81: Customization total adds to existing build-job parts cost in main estimate.
 * GST 18% additive per L25.
 */
export function computeCustomizationCost(params: {
  paintPrice?: number;
  wheelOptionId?: string;
  tintOptionId?: string;
  exhaustOptionId?: string;
  suspensionOptionId?: string;
  hoodOptionId?: string;
  wingOptionId?: string;
  decalCount?: number;
}): CustomizationCostBreakdown {
  const paintPrice = params.paintPrice ?? 0;
  const wheelPrice = WHEEL_OPTIONS.find((o) => o.id === params.wheelOptionId)?.price ?? 0;
  const tintPrice = TINT_OPTIONS.find((o) => o.id === params.tintOptionId)?.price ?? 0;
  const exhaustPrice = EXHAUST_OPTIONS.find((o) => o.id === params.exhaustOptionId)?.price ?? 0;
  const suspensionPrice = SUSPENSION_OPTIONS.find((o) => o.id === params.suspensionOptionId)?.price ?? 0;
  const hoodPrice = HOOD_OPTIONS.find((o) => o.id === params.hoodOptionId)?.price ?? 0;
  const wingPrice = WING_OPTIONS.find((o) => o.id === params.wingOptionId)?.price ?? 0;
  const decalPrice = (params.decalCount ?? 0) * DECAL_PRICE_PER_UNIT;

  const subtotal =
    paintPrice +
    wheelPrice +
    tintPrice +
    exhaustPrice +
    suspensionPrice +
    hoodPrice +
    wingPrice +
    decalPrice;

  const gst = Math.round(subtotal * GST_RATE);
  const total = subtotal + gst;

  return {
    paintPrice,
    wheelPrice,
    tintPrice,
    exhaustPrice,
    suspensionPrice,
    hoodPrice,
    wingPrice,
    decalPrice,
    subtotal,
    gst,
    total,
  };
}
