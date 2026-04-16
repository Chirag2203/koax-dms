/**
 * Design tokens — authoritative source.
 *
 * Exports:
 *   - sharedTokens: surface-agnostic primitives (spacing, type scale, motion, radius, elevation)
 *   - customerTokens: light (Editorial Luxury) + dark (Dark Premium) for customer surface
 *   - staffTokens: light + dark for staff surface (Modern Product Interface)
 *
 * Changes here must be reflected in dms/design/01_design_system.md in the same PR.
 * Tailwind preset + CSS-var emitter consume this file.
 */

export const fontFamily = {
  display: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"IBM Plex Mono", "SF Mono", Menlo, monospace',
} as const;

export const fontSize = {
  'display-2xl':  ['96px',  { lineHeight: '0.96', letterSpacing: '-0.02em', fontWeight: '400' }],
  'display-xl':   ['72px',  { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '400' }],
  'display-lg':   ['56px',  { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '400' }],
  'display-md':   ['40px',  { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '400' }],
  'display-sm':   ['32px',  { lineHeight: '1.2',  letterSpacing: '-0.01em', fontWeight: '400' }],
  'heading-xl':   ['28px',  { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
  'heading-lg':   ['22px',  { lineHeight: '1.3',  letterSpacing: '-0.005em', fontWeight: '600' }],
  'heading-md':   ['18px',  { lineHeight: '1.4',  letterSpacing: '0',       fontWeight: '600' }],
  'heading-sm':   ['16px',  { lineHeight: '1.4',  letterSpacing: '0',       fontWeight: '600' }],
  'body-lg':      ['18px',  { lineHeight: '1.55', letterSpacing: '0',       fontWeight: '400' }],
  'body-md':      ['15px',  { lineHeight: '1.55', letterSpacing: '0',       fontWeight: '400' }],
  'body-sm':      ['13px',  { lineHeight: '1.5',  letterSpacing: '0',       fontWeight: '400' }],
  'body-xs':      ['12px',  { lineHeight: '1.45', letterSpacing: '0',       fontWeight: '400' }],
  'label-lg':     ['14px',  { lineHeight: '1.2',  letterSpacing: '0.02em',  fontWeight: '500' }],
  'label-md':     ['12px',  { lineHeight: '1.2',  letterSpacing: '0.04em',  fontWeight: '500' }],
  'label-sm':     ['11px',  { lineHeight: '1.2',  letterSpacing: '0.14em',  fontWeight: '500' }],
  'mono-md':      ['13px',  { lineHeight: '1.4',  letterSpacing: '0',       fontWeight: '400' }],
  'mono-sm':      ['11px',  { lineHeight: '1.35', letterSpacing: '0',       fontWeight: '400' }],
} as const;

export const spacing = {
  '0':   '0px',
  '1':   '4px',
  '2':   '8px',
  '3':   '12px',
  '4':   '16px',
  '5':   '20px',
  '6':   '24px',
  '8':   '32px',
  '10':  '40px',
  '12':  '48px',
  '16':  '64px',
  '20':  '80px',
  '24':  '96px',
  '32':  '128px',
  '40':  '160px',
  '48':  '192px',
} as const;

export const radius = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '12px',
  xl: '20px',
  full: '9999px',
} as const;

export const elevation = {
  '0': 'none',
  '1': '0 1px 2px rgba(10, 10, 10, 0.04)',
  '2': '0 2px 8px rgba(10, 10, 10, 0.06), 0 1px 2px rgba(10, 10, 10, 0.04)',
  '3': '0 8px 24px rgba(10, 10, 10, 0.08), 0 2px 4px rgba(10, 10, 10, 0.04)',
  '4': '0 16px 48px rgba(10, 10, 10, 0.12), 0 4px 8px rgba(10, 10, 10, 0.06)',
} as const;

export const duration = {
  instant: '0ms',
  fast: '120ms',
  quick: '160ms',
  medium: '240ms',
  slow: '400ms',
  deliberate: '640ms',
  cinematic: '1000ms',
} as const;

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  emphasize: 'cubic-bezier(0.2, 0, 0, 1.1)',
  spring: 'cubic-bezier(0.5, 1.8, 0.5, 1)',
} as const;

export const zIndex = {
  base: 0,
  sticky: 10,
  dropdown: 100,
  overlay: 1000,
  modal: 1100,
  popover: 1200,
  toast: 1300,
  tooltip: 1400,
} as const;

export const breakpoints = {
  xs: '375px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const sharedTokens = {
  fontFamily,
  fontSize,
  spacing,
  radius,
  elevation,
  duration,
  easing,
  zIndex,
  breakpoints,
};

// -------------------------- Customer surface --------------------------

export const customerTokens = {
  light: {
    'bg-paper':       '#faf7f0',
    'bg-elevated':    '#ffffff',
    'bg-subtle':      '#f2ede2',
    'bg-hover':       '#ede7d7',
    'ink-primary':    '#0e0d0b',
    'ink-secondary':  '#4a463d',
    'ink-muted':      '#78705f',
    'ink-subtle':     '#a19882',
    'accent':         '#8a6a3d',
    'accent-hover':   '#725730',
    'accent-subtle':  '#e8dcc2',
    'line':           '#e6dfd0',
    'line-strong':    '#c8bfa8',
    'focus-ring':     '#8a6a3d',
    'success':        '#4a7a3d',
    'warning':        '#a87a28',
    'danger':         '#8a3d3d',
  },
  dark: {
    'bg-paper':       '#0c0c0d',
    'bg-elevated':    '#15151a',
    'bg-subtle':      '#1a1a1f',
    'bg-hover':       '#222228',
    'ink-primary':    '#ede5d4',
    'ink-secondary':  '#b9b0a0',
    'ink-muted':      '#8a8272',
    'ink-subtle':     '#5a5448',
    'accent':         '#c89b5a',
    'accent-hover':   '#d8ae74',
    'accent-subtle':  '#3a2f1e',
    'line':           '#2a2927',
    'line-strong':    '#3f3d38',
    'focus-ring':     '#c89b5a',
    'success':        '#6a9a4d',
    'warning':        '#c89b5a',
    'danger':         '#c86a6a',
  },
} as const;

// ---------------------------- Staff surface ----------------------------

export const staffTokens = {
  light: {
    'bg-canvas':      '#fbfbfa',
    'bg-surface':     '#ffffff',
    'bg-subtle':      '#f4f4f3',
    'bg-hover':       '#ececea',
    'bg-active':      '#e0e0dd',
    'ink-primary':    '#0a0a0a',
    'ink-secondary':  '#4a4a4a',
    'ink-muted':      '#6b7280',
    'ink-subtle':     '#9ca3af',
    'accent':         '#2563eb',
    'accent-hover':   '#1d4ed8',
    'accent-subtle':  '#eff6ff',
    'line':           '#ececea',
    'line-strong':    '#d4d4d0',
    'focus-ring':     '#2563eb',
    'state-listed':       '#10b981',
    'state-listed-bg':    '#ecfdf5',
    'state-reserved':     '#b45309',
    'state-reserved-bg':  '#fffbeb',
    'state-refurb':       '#1e40af',
    'state-refurb-bg':    '#eff6ff',
    'state-stale':        '#4b5563',
    'state-stale-bg':     '#f3f4f6',
    'state-sold':         '#7c3aed',
    'state-sold-bg':      '#faf5ff',
    'state-danger':       '#dc2626',
    'state-danger-bg':    '#fef2f2',
  },
  dark: {
    'bg-canvas':      '#0a0a0a',
    'bg-surface':     '#141414',
    'bg-subtle':      '#1a1a1a',
    'bg-hover':       '#222222',
    'bg-active':      '#2a2a2a',
    'ink-primary':    '#ededed',
    'ink-secondary':  '#a3a3a3',
    'ink-muted':      '#737373',
    'ink-subtle':     '#525252',
    'accent':         '#3b82f6',
    'accent-hover':   '#60a5fa',
    'accent-subtle':  '#172554',
    'line':           '#262626',
    'line-strong':    '#404040',
    'focus-ring':     '#3b82f6',
    'state-listed':       '#34d399',
    'state-listed-bg':    '#022c22',
    'state-reserved':     '#fbbf24',
    'state-reserved-bg':  '#451a03',
    'state-refurb':       '#60a5fa',
    'state-refurb-bg':    '#1e3a8a',
    'state-stale':        '#9ca3af',
    'state-stale-bg':     '#1f2937',
    'state-sold':         '#a78bfa',
    'state-sold-bg':      '#2e1065',
    'state-danger':       '#f87171',
    'state-danger-bg':    '#450a0a',
  },
} as const;

export type CustomerTheme = 'light' | 'dark';
export type StaffTheme = 'light' | 'dark';
export type Surface = 'customer' | 'staff';
