# Design surfaces

Two surfaces, one token system. Never mix.

## Customer surface — 01 Editorial Luxury + 05 Dark Premium

**Feel:** magazine, confident, quiet. Big type, generous whitespace, slow cinematic motion. Dark Premium variant for hero moments (showroom, vehicle detail, CPO program).

**Audience:** HNI buyer, family decision-maker, enthusiast browsing at night.

**Must-haves:**
- Editorial typography (Playfair Display for display; Inter for body).
- Cinematic imagery — hero with parallax; subtle grain.
- Dark-mode-first on detail pages.
- Sparse controls — the photo and the number do the work.
- Motion: 400–700ms durations, emphasize curve, respects `prefers-reduced-motion`.
- Copy: sentence case, no exclamation, no emoji.

**Never:**
- Bright saturated calls-to-action.
- Skeuomorphic drop-shadows.
- Auto-playing sound.
- Pop-ups / interstitials.

## Staff surface — 03 Modern Product Interface

**Feel:** Linear / Notion / Attio density. Fast, keyboard-first, information-dense, neutral.

**Audience:** advisor, technician, parts, finance, GM — spends 8h in this UI.

**Must-haves:**
- Inter for everything; IBM Plex Mono for numbers and codes.
- Compact tables, keyboard shortcuts, command palette (cmdk) at the core.
- Every action reachable in ≤ 3 keystrokes from a blank focus.
- Motion: 120–200ms, standard curve.
- Dark mode parity with light.

**Never:**
- Decorative imagery.
- Display serifs.
- More than 2 primary buttons on a screen.
- Animations that delay acknowledgement of user action.

## Shared

- All tokens via `@dms/tokens`.
- Iconography: `lucide-react`, 1.5px stroke.
- a11y baseline: AA body / AAA where feasible; keyboard + focus ring always.
- Content tone rules in Doc 15 §10 and `ux-writer` agent definition.

## Routing

- `[data-surface="customer"]` → customer token set.
- `[data-surface="staff"]` → staff token set.
- `[data-theme="light"|"dark"]` orthogonal.

## Responsive

- Customer: mobile-first.
- Staff: desktop-first, tablet supported; no mobile target for complex flows in v1.
