# Staff Surface — Component Patterns (authoritative)

Use these exact patterns for every staff-web component. The inventory detail page is the reference implementation. Any deviation is a bug.

---

## 1. Card / Panel

The canonical card is what you see on the vehicle detail page spec grid, cost ledger, and financial snapshot:

```
className="rounded-md border border-line bg-bg-surface p-4"
```

Variants by content density:
- **Compact** (small panels, list items): `p-3`
- **Standard** (most cards, spec groups): `p-4`
- **Spacious** (hero panels, primary content): `p-6`

### Card header
```tsx
<div className="flex items-center justify-between border-b border-line px-4 py-3">
  <h2 className="text-[18px] font-semibold leading-[1.4] text-ink-primary">{title}</h2>
  <Link href={actionHref} className="text-xs text-accent hover:text-accent-hover">
    View all →
  </Link>
</div>
```

### Card body
```tsx
<div className="p-4">{children}</div>
```

### Card footer (optional)
```tsx
<div className="border-t border-line px-4 py-3 flex items-center justify-between">
  {...}
</div>
```

### NEVER
- Do NOT use `bg-bg-subtle` as a card background (that's for hover/subtle-panel accents)
- Do NOT use `bg-bg-canvas` — cards must stand out on canvas bg
- Do NOT use hardcoded hex or `var(--color-*)` — use Tailwind token classes
- Do NOT vary padding arbitrarily — pick `p-3` | `p-4` | `p-6` and stick to it

---

## 2. Tabs (canonical — from vehicle-detail-view.tsx)

Tabs sit below a page header with an underline indicator. Do NOT use boxed/pill tabs.

```tsx
<div className="mt-6 flex items-end gap-0 border-b border-line" role="tablist" aria-label="...">
  {TABS.map((tab) => (
    <button
      key={tab.id}
      type="button"
      role="tab"
      id={`tab-${tab.id}`}
      aria-controls={`panel-${tab.id}`}
      aria-selected={activeTab === tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        'relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        activeTab === tab.id
          ? 'text-ink-primary'
          : 'text-ink-muted hover:text-ink-secondary',
      )}
    >
      {tab.label}
      {activeTab === tab.id && (
        <span
          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-sm bg-accent"
          aria-hidden="true"
        />
      )}
    </button>
  ))}
</div>
```

Panel wrapper:
```tsx
<div
  role="tabpanel"
  id={`panel-${tab.id}`}
  aria-labelledby={`tab-${tab.id}`}
  hidden={activeTab !== tab.id}
>
  {activeTab === tab.id && <TabContent ... />}
</div>
```

### Rules
- Tab container: `border-b border-line`
- Tab button padding: `px-4 py-2.5`
- Tab text: `text-sm font-medium`
- Active tab: `text-ink-primary` + 2px accent underline via `absolute` pseudo bar
- Inactive: `text-ink-muted hover:text-ink-secondary`
- NO pill/boxed backgrounds
- NO rounded corners on tabs themselves (only on the underline via `rounded-t-sm`)

---

## 3. Kanban board layout

Kanban is **horizontal flow of vertical columns**. Cards stack vertically inside each column.

```tsx
<div className="grid grid-flow-col auto-cols-[300px] gap-3 overflow-x-auto pb-4">
  {stages.map(stage => (
    <KanbanColumn key={stage.id} stage={stage} deals={filtered} />
  ))}
</div>
```

Each column:
```tsx
<div className="flex flex-col min-h-[500px] rounded-md border border-line bg-bg-subtle p-3">
  {/* Column header */}
  <div className="flex items-center justify-between mb-3 pb-3 border-b border-line">
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
      <span className="bg-bg-hover rounded-full px-2 py-0.5 text-[11px] font-mono text-ink-muted">
        {count}
      </span>
    </div>
    <span className="font-mono text-[11px] text-ink-muted tabular-nums">₹ {total}</span>
  </div>
  {/* Cards stacked vertically */}
  <div className="flex-1 space-y-2 overflow-y-auto">
    {deals.map(d => <DealCard key={d.id} deal={d} />)}
  </div>
</div>
```

### Rules
- Container `grid grid-flow-col auto-cols-[W]` — NOT flex (flex can cause cards to wrap wrong)
- Each column is `flex flex-col` so cards stack vertically
- Cards use `space-y-2` inside column
- Column width fixed at 300-320px (Stitch used 300px)
- Overall container has `overflow-x-auto` to allow scroll when columns exceed viewport

### NEVER
- Do NOT make cards `flex-row` or `inline-block` inside a column — they must stack vertically
- Do NOT make the column itself scroll horizontally — only the outer container

---

## 4. Forms + inputs

```tsx
<label className="text-xs uppercase tracking-wide text-ink-muted mb-1.5 block">
  Field label
</label>
<input
  className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary
             focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
/>
```

### Monetary / numeric
```tsx
<input
  type="text"
  className="...base... font-mono tabular-nums text-right"
/>
```

### Required fields
Add a subtle asterisk in `text-ink-muted` — never red.

### Error state
```tsx
<p className="text-xs text-state-danger mt-1">{error}</p>
```

---

## 5. Buttons

### Primary
```tsx
className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white
           text-sm font-medium hover:bg-accent-hover transition-colors
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
```

### Secondary / Ghost
```tsx
className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line
           bg-bg-surface text-sm font-medium text-ink-primary
           hover:bg-bg-subtle transition-colors
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
```

### Icon-only
```tsx
className="inline-flex items-center justify-center h-8 w-8 rounded-md
           text-ink-muted hover:text-ink-primary hover:bg-bg-hover
           focus-visible:ring-2 focus-visible:ring-accent"
```

Icon-only buttons MUST have `aria-label` or a tooltip.

### Destructive
```tsx
className="...base... bg-state-danger text-white hover:bg-state-danger/90"
```

---

## 6. Chips / Badges

Uses the `StateChip` primitive for all state. Do NOT invent chip styles.

Source pills (inline, not StateChip):
```tsx
className="font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded"
```

---

## 7. Spacing rhythm

- Page sections: `px-6 py-5` (matches dashboard)
- Page header: `px-6 py-5 border-b border-line`
- Main content max-width: `max-w-7xl mx-auto` (dashboards), or full-bleed for lists
- Form columns max-width: `max-w-[720px] mx-auto` (wizard) or `max-w-[900px]` (single-page form)

---

## 8. Typography scale (Inter, no serif)

```
Page title:       text-[28px] font-semibold leading-[1.25]   (h1)
Section heading:  text-[22px] font-semibold leading-[1.3]    (h2)
Subsection:       text-[18px] font-semibold leading-[1.4]    (h3)
Card heading:     text-[16px] font-semibold leading-[1.4]    (h4)
Body default:     text-[15px] leading-[1.55]
Secondary body:   text-[13px] leading-[1.5]
Meta / captions:  text-[12px] leading-[1.45]
Form labels:      text-[14px] font-medium (or text-xs uppercase tracking-wide for eyebrow)
Table headers:    text-[12px] font-medium uppercase tracking-[0.06em]
Eyebrow / kicker: text-[11px] font-medium uppercase tracking-[0.14em]
Mono (VIN/amts):  text-[13px] font-mono
Mono small:       text-[11px] font-mono
```

---

## 9. Code review checklist

Every staff-web PR must be checked against this document. Rejected if:
- [ ] Card uses non-standard padding (must be p-3 | p-4 | p-6)
- [ ] Card uses non-token color (`bg-[#...]`, `var(--color-...)`)
- [ ] Tabs use boxed/pill style instead of underline
- [ ] Tabs missing `role="tablist" / "tab" / "tabpanel"` + `aria-selected` + `aria-controls`
- [ ] Kanban columns flow vertically (should be horizontal container, vertical column content)
- [ ] Cards within Kanban column don't stack vertically via `space-y-2`
- [ ] Primary button doesn't match the pattern in §5
- [ ] Inputs not h-10 / rounded-md / bg-bg-subtle
- [ ] Form labels not uppercase tracking-wide muted
- [ ] Any hardcoded hex color (outside of design tokens)
- [ ] Typography deviates from §8 scale

---

## 10. Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | Initial extraction from vehicle-detail-view.tsx canonical patterns |
