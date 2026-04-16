/**
 * Shared Tailwind preset.
 *
 * Both apps extend this. Surface-specific colors are exposed as CSS variables
 * scoped by [data-surface="customer"|"staff"] and [data-theme="light"|"dark"].
 * Components reference Tailwind classes that compile to var(--color-*).
 *
 * Emitting of CSS variables per surface happens in each app's globals.css.
 */

const { sharedTokens } = require('@dms/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', ...sharedTokens.fontFamily.display.split(',')],
        sans: ['var(--font-sans)', ...sharedTokens.fontFamily.sans.split(',')],
        mono: ['var(--font-mono)', ...sharedTokens.fontFamily.mono.split(',')],
      },
      fontSize: Object.fromEntries(
        Object.entries(sharedTokens.fontSize).map(([k, v]) => [k, v]),
      ),
      spacing: sharedTokens.spacing,
      borderRadius: sharedTokens.radius,
      boxShadow: {
        '1': sharedTokens.elevation['1'],
        '2': sharedTokens.elevation['2'],
        '3': sharedTokens.elevation['3'],
        '4': sharedTokens.elevation['4'],
      },
      transitionDuration: sharedTokens.duration,
      transitionTimingFunction: sharedTokens.easing,
      zIndex: Object.fromEntries(
        Object.entries(sharedTokens.zIndex).map(([k, v]) => [k, String(v)]),
      ),
      screens: sharedTokens.breakpoints,
      colors: {
        // These map to CSS variables emitted per surface.
        'bg-paper':       'rgb(var(--bg-paper) / <alpha-value>)',
        'bg-elevated':    'rgb(var(--bg-elevated) / <alpha-value>)',
        'bg-subtle':      'rgb(var(--bg-subtle) / <alpha-value>)',
        'bg-hover':       'rgb(var(--bg-hover) / <alpha-value>)',
        'bg-canvas':      'rgb(var(--bg-canvas) / <alpha-value>)',
        'bg-surface':     'rgb(var(--bg-surface) / <alpha-value>)',
        'bg-active':      'rgb(var(--bg-active) / <alpha-value>)',
        'ink-primary':    'rgb(var(--ink-primary) / <alpha-value>)',
        'ink-secondary':  'rgb(var(--ink-secondary) / <alpha-value>)',
        'ink-muted':      'rgb(var(--ink-muted) / <alpha-value>)',
        'ink-subtle':     'rgb(var(--ink-subtle) / <alpha-value>)',
        'accent':         'rgb(var(--accent) / <alpha-value>)',
        'accent-hover':   'rgb(var(--accent-hover) / <alpha-value>)',
        'accent-subtle':  'rgb(var(--accent-subtle) / <alpha-value>)',
        'line':           'rgb(var(--line) / <alpha-value>)',
        'line-strong':    'rgb(var(--line-strong) / <alpha-value>)',
        'focus-ring':     'rgb(var(--focus-ring) / <alpha-value>)',
        'success':        'rgb(var(--success) / <alpha-value>)',
        'warning':        'rgb(var(--warning) / <alpha-value>)',
        'danger':         'rgb(var(--danger) / <alpha-value>)',
      },
    },
  },
};
