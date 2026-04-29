/**
 * paint-palette — 12 named luxury paint colors for the visualizer.
 *
 * L36 (locked): Paint applied via CSS filter (hue-rotate + saturate + brightness)
 *   on the SVG body element. 12 named luxury colors hardcoded here.
 *   Colors are domain data, not design tokens — hex allowed per §10.
 *
 * The `cssFilter` string is applied as `style={{ filter: cssFilter }}`
 * on the base car `<img>` element in VisualizerCanvas when a paint is active.
 * The base SVG body uses neutral greys so the filter shifts it to the target hue.
 *
 * Filter approach: `hue-rotate(Xdeg) saturate(Y) brightness(Z)`.
 * Fine-tuned for dark grey base SVGs (body mid-tone ~#4b5563).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §24.2
 */

export interface PaintColor {
  /** Canonical identifier — used as `selectedPaint` in visualizer state */
  key: string;
  /** Display name shown in the paint picker */
  name: string;
  /** Brand/origin label (for tooltip, e.g. "Porsche", "BMW Individual") */
  brand: string;
  /** Actual hex color of the swatch circle */
  hex: string;
  /**
   * CSS filter string applied to the base SVG to approximate this paint.
   * Targets the neutral grey body; transparent areas are unaffected.
   * Formula: hue-rotate shifts hue; saturate controls richness; brightness
   * lightens/darkens for metallic vs. matte vs. frozen distinction.
   */
  cssFilter: string;
  /** Approx. list price premium for this paint (₹) */
  listPrice: number;
}

/**
 * All 12 luxury paint colors.
 *
 * Filter calibration notes (base = neutral grey ~#4b5563):
 *  - Pure blacks/whites: desaturate + brightness adjust only
 *  - Reds: hue-rotate(0–15deg) + high saturation
 *  - Blues: hue-rotate(200–220deg) + high saturation
 *  - Greens: hue-rotate(100–130deg) + saturation
 *  - Greys/silvers: saturate(0.2–0.5) + slight brightness
 */
export const PAINT_PALETTE: PaintColor[] = [
  {
    key: 'guards-red',
    name: 'Guards Red',
    brand: 'Porsche',
    hex: '#cc0000',
    cssFilter: 'hue-rotate(0deg) saturate(4) brightness(0.85)',
    listPrice: 48000,
  },
  {
    key: 'crayon',
    name: 'Crayon',
    brand: 'Porsche',
    hex: '#ff6900',
    cssFilter: 'hue-rotate(22deg) saturate(4.5) brightness(1.05)',
    listPrice: 52000,
  },
  {
    key: 'lapis-blue',
    name: 'Lapis Blue',
    brand: 'BMW Individual',
    hex: '#1a3c7a',
    cssFilter: 'hue-rotate(210deg) saturate(3.5) brightness(0.7)',
    listPrice: 55000,
  },
  {
    key: 'carrara-white',
    name: 'Carrara White',
    brand: 'Porsche',
    hex: '#f0ede8',
    cssFilter: 'saturate(0.1) brightness(2.8)',
    listPrice: 45000,
  },
  {
    key: 'nardo-gray',
    name: 'Nardo Gray',
    brand: 'Audi Individual',
    hex: '#8e8e8e',
    cssFilter: 'saturate(0.15) brightness(1.5)',
    listPrice: 46000,
  },
  {
    key: 'frozen-black',
    name: 'Frozen Black',
    brand: 'BMW Individual',
    hex: '#1a1a1a',
    cssFilter: 'saturate(0.05) brightness(0.3)',
    listPrice: 42000,
  },
  {
    key: 'verdant-green',
    name: 'Verdant Green',
    brand: 'Mercedes-AMG',
    hex: '#2d6a4f',
    cssFilter: 'hue-rotate(128deg) saturate(2.8) brightness(0.75)',
    listPrice: 54000,
  },
  {
    key: 'brewster-green',
    name: 'Brewster Green',
    brand: 'Porsche',
    hex: '#1b3a2e',
    cssFilter: 'hue-rotate(138deg) saturate(2.2) brightness(0.55)',
    listPrice: 56000,
  },
  {
    key: 'riviera-blue',
    name: 'Riviera Blue',
    brand: 'BMW Individual',
    hex: '#0057a8',
    cssFilter: 'hue-rotate(205deg) saturate(4.2) brightness(0.9)',
    listPrice: 50000,
  },
  {
    key: 'sunburst-orange',
    name: 'Sunburst Orange',
    brand: 'Audi Individual',
    hex: '#e85c00',
    cssFilter: 'hue-rotate(18deg) saturate(5) brightness(0.95)',
    listPrice: 52000,
  },
  {
    key: 'mamba-green',
    name: 'Mamba Green',
    brand: 'Mercedes-AMG',
    hex: '#3d8c40',
    cssFilter: 'hue-rotate(116deg) saturate(3.2) brightness(0.85)',
    listPrice: 58000,
  },
  {
    key: 'gt-silver',
    name: 'GT Silver',
    brand: 'Mercedes-AMG',
    hex: '#c0c0c0',
    cssFilter: 'saturate(0.25) brightness(2.1)',
    listPrice: 44000,
  },
];

/** Quick lookup by key */
export const PAINT_BY_KEY: Record<string, PaintColor> = Object.fromEntries(
  PAINT_PALETTE.map((p) => [p.key, p]),
);

/**
 * Build the CSS filter string for a given paint key.
 * Returns undefined if key is not found (no paint selected).
 */
export function getPaintFilter(paintKey: string | null | undefined): string | undefined {
  if (!paintKey) return undefined;
  return PAINT_BY_KEY[paintKey]?.cssFilter;
}
