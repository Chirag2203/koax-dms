# Google Stitch prompt — Staff surface (03 Modern Product Interface)

Paste the **Global brief** first, then run each **Screen prompt** individually. Stitch handles one screen per run best. After the global brief, screens are organized by module.

---

## Global brief (paste once, before any screen)

We are designing the staff-facing internal tool of a luxury pre-owned car platform operating across three cities in India (Bangalore, Mumbai, Chennai). The audience is dealership staff who spend 8 hours daily in this UI — sales associates, service advisors, workshop technicians, parts managers, finance controllers, general managers, and C-level executives. The design direction is **Modern Product Interface** — think Linear, Stripe Dashboard, Notion, Superhuman, Raycast density.

This is not a CRM. This is not Salesforce. This is a precision instrument for people who know their job.

**Brand primitives — Staff surface**

- **Primary type:** Inter, weights 400, 500, 600. Every heading, label, body, and control uses Inter.
- **Mono type:** IBM Plex Mono, weights 400, 500. For VINs, invoice numbers, registration numbers, amounts in tables, keyboard shortcut labels, IDs, timestamps.
- **No serif.** Never use Playfair Display or any serif on the staff surface.
- **Type scale:**
  - Page title: Inter 28px/1.25 weight 600
  - Section heading: Inter 22px/1.3 weight 600
  - Subsection: Inter 18px/1.4 weight 600
  - Card heading: Inter 16px/1.4 weight 600
  - Default body: Inter 15px/1.55 weight 400
  - Secondary text: Inter 13px/1.5 weight 400
  - Meta/captions: Inter 12px/1.45 weight 400
  - Form labels: Inter 14px/1.2 weight 500
  - Table headers: Inter 12px/1.2 weight 500, uppercase, letter-spacing +0.06em
  - Eyebrow/kicker: Inter 11px/1.2 weight 500, uppercase, letter-spacing +0.14em
  - Mono (VIN/amounts): IBM Plex Mono 13px/1.4 weight 400
  - Mono small (shortcuts): IBM Plex Mono 11px/1.35 weight 400

- **Color palette — dark (default, ship dark-first):**
  - Canvas: #0A0A0A (app background)
  - Surface: #141414 (cards, tables, panels)
  - Subtle: #1A1A1A (alternating rows, subtle panels)
  - Hover: #222222
  - Active/selected: #2A2A2A
  - Ink primary: #EDEDED
  - Ink secondary: #A3A3A3
  - Ink muted: #737373
  - Ink subtle/placeholder: #525252
  - Accent: #3B82F6 (action blue)
  - Accent hover: #60A5FA
  - Accent subtle bg: #172554
  - Line: #262626 (row dividers)
  - Line strong: #404040 (panel borders)
  - Focus ring: #3B82F6

- **Color palette — light (user-switchable):**
  - Canvas: #FBFBFA
  - Surface: #FFFFFF
  - Subtle: #F4F4F3
  - Hover: #ECECEA
  - Active/selected: #E0E0DD
  - Ink primary: #0A0A0A
  - Ink secondary: #4A4A4A
  - Ink muted: #6B7280
  - Ink subtle: #9CA3AF
  - Accent: #2563EB
  - Accent hover: #1D4ED8
  - Accent subtle: #EFF6FF
  - Line: #ECECEA
  - Line strong: #D4D4D0
  - Focus ring: #2563EB

- **State colors (chips/badges):**
  - Listed/Active: #10B981 on #ECFDF5 (light) / #10B981/20% on canvas (dark)
  - Reserved: #B45309 on #FFFBEB / same logic for dark
  - In Refurb: #1E40AF on #EFF6FF
  - Stale: #4B5563 on #F3F4F6
  - Sold: #7C3AED on #FAF5FF
  - Draft: #6B7280 on #F3F4F6
  - Overdue: #DC2626 on #FEF2F2
  - CPO: #059669 on #ECFDF5
  - Pending: #D97706 on #FFFBEB

- **Spacing:** 4px base grid. Staff UI lives in the 4–16px range. Layout gaps at 8, 12, 16, 24, 32. Page margins at 24–32px. Card padding at 16–20px. Table cell padding at 8px vertical, 12px horizontal.

- **Radius:** 
  - Inputs, buttons: 6px
  - Cards, panels: 6px
  - Chips, badges: 4px
  - Avatars: 9999px (round)
  - Modals: 12px
  - No large radius elements on the staff surface

- **Elevation:**
  - Level 0: none (default for most surfaces — use borders instead)
  - Level 1: 0 1px 2px rgba(10,10,10,0.04) — subtle lift for floating elements
  - Level 2: 0 2px 8px rgba(10,10,10,0.06) — dropdowns, popovers
  - Level 3: 0 8px 24px rgba(10,10,10,0.08) — modals, command palette
  - Dark mode: shadows become lighter borders (#262626 to #404040) instead of drop shadows

- **Motion:**
  - Hover/focus/active: 120ms ease-standard
  - Confirmations (toast, success): 160ms
  - Panel slide-in: 160ms ease-standard
  - Table row insert/delete: 120ms fade
  - Success pulse: 240ms once
  - **No** scroll-tied animations
  - **No** animations longer than 240ms
  - Respect `prefers-reduced-motion: reduce`

- **Iconography:** Lucide React icons, 1.5px stroke, sizes 16/20/24px. Icon-only buttons always have a tooltip. Custom domain icons for: CPO badge, VIN, Aadhaar, PAN, GSTIN, DigiLocker — designed on same Lucide grid.

- **Layout architecture:**
  - **Sidebar** — 220px wide, collapsible to 56px (icon-only). Dark surface (#141414). Logo at top, nav groups in the middle, user/settings at the bottom.
  - **Top bar** — 48px height. Contains: breadcrumbs (left), command palette trigger ⌘K (center), notifications bell + outlet selector + user avatar (right).
  - **Command palette** — ⌘K overlay, centered, 560px wide, search-as-you-type, fuzzy matching across all entities (vehicles, customers, job cards, invoices, parts). Think Raycast / Linear command menu.
  - **Main canvas** — fills remaining space. Scroll is contained here, not on body.
  - **Detail panels** — slide in from right at 40–60% viewport width. Used for record detail instead of full-page navigation where possible.
  - **Desktop-first:** reference width 1440px, min-width 1024px. Tablet (768–1024px) supported with collapsed sidebar. No mobile target for complex flows.

- **Tables are first-class citizens:**
  - Every list view is a data table, not a card grid.
  - Column config: drag to reorder, toggle visibility, resize.
  - Saved views: user can save filter + sort + column sets as named views.
  - Keyboard: ↑↓ to navigate rows, Enter to open, Space to select, Esc to deselect all.
  - Row actions: right-click context menu or inline action buttons on hover.
  - Alternating row shading on subtle background.
  - Sticky headers on scroll.
  - Selection column (checkbox) on the left. Bulk actions bar appears when ≥1 row selected.
  - Pagination: "Showing 1–50 of 342" with prev/next + page size selector.
  - Mono numbers for VINs, amounts, dates in tables.

- **Forms:**
  - Compact forms. Label above input, not inline.
  - Required fields marked with a subtle asterisk (ink-muted), no red star.
  - Validation errors in 13px danger-red below the field.
  - Form sections with horizontal hairline separators.
  - Auto-save drafts every 30s — show "Saved just now" in muted text.
  - Submit button at bottom-right, secondary "Cancel" or "Save as draft" to its left.

- **Keyboard-first:**
  - ⌘K: command palette
  - ⌘/: focus search
  - G then I: go to Inventory
  - G then S: go to Sales
  - G then V: go to Service
  - Escape: close any panel/modal
  - Arrow keys: table navigation
  - Every action reachable within 3 keystrokes of a blank focus state

- **Copy tone (staff):**
  - Direct, precise, operator-friendly.
  - Title case on buttons: "Create Job Card", "Approve Refund".
  - Sentence case on body, descriptions, tooltips.
  - Error messages include error code: "Photo count below minimum (G-LST-02)".
  - No emoji. No exclamation marks.
  - Monetary: `₹ 1,28,50,000` with Indian grouping and non-breaking space.
  - Dates: "14 Mar 2026" or ISO `2026-03-14` in table cells.
  - Time: "14:30 IST" — always 24-hour.

- **RBAC visual language:**
  - Disabled controls are visually present but muted (not hidden). Tooltip explains why: "You need Sales Manager role to publish listings".
  - Cross-outlet content shows an outlet badge pill at the top of every record.
  - Sensitive actions (refund > ₹25k, price override, manual GL) show a confirmation dialog with "This requires co-approval" language and a co-approver picker.

- **Do not:**
  - Do not use serif type anywhere on staff surface.
  - Do not use decorative imagery, illustrations, or hero banners.
  - Do not use more than 2 primary (filled blue) buttons on any single screen.
  - Do not use animations longer than 240ms.
  - Do not use rounded-corner card farms or Kanban as default (only where explicitly specified: deal pipeline, service bay board).
  - Do not use bright saturated backgrounds for section headers.
  - Do not reference Salesforce, SAP, Dynamics, or any Indian ERP visual language.

**Accessibility:**
- WCAG 2.1 AA minimum. AAA for body text.
- Visible focus rings on every interactive element (#3B82F6, 2px offset).
- Keyboard operable without mouse.
- Screen-reader labels on all icon-only buttons.
- Color is never the sole indicator — state chips always have text labels.
- Touch targets ≥ 44×44px on tablet views.

---

## Screen 1 — App shell (master layout)

**Purpose:** the container for every staff screen. Sidebar + top bar + main canvas + command palette.

**Structure:**

### 1a. Sidebar (left, 220px, dark surface #141414)

- **Top:** logo monogram 28px + wordmark "DMS" in Inter 16/600 at top-left, separated from nav by 24px.
- **Nav groups** (stacked vertically, 8px gap between items, 20px gap between groups):
  - *Group 1: Core*
    - Dashboard (lucide: `LayoutDashboard`)
    - Inventory (lucide: `Car`) — with a count badge "42" for active vehicles
    - Sales (lucide: `Receipt`)
    - Service (lucide: `Wrench`)
    - Parts (lucide: `Boxes`)
  - *Group 2: Operations*
    - Customers (lucide: `Users`)
    - Finance (lucide: `IndianRupee`)
    - Reports (lucide: `BarChart3`)
  - *Group 3: System*
    - Notifications (lucide: `Bell`) — with unread count dot
    - Settings (lucide: `Settings`)
    - Audit Log (lucide: `Shield`)

- Each nav item: 40px height, 12px left padding, icon 20px + label Inter 14/500, ink-secondary default. On hover: bg-hover + ink-primary. Active/current: bg-active + ink-primary + 2px accent-blue left border indicator.
- **Collapsed state (56px):** icon only, centered; tooltip on hover with the label name. Group separators become 1px hairlines.
- **Bottom:** 
  - Outlet selector: pill showing "BLR" / "MUM" / "CHE". Click to switch. Blue dot on current.
  - User avatar (32px round) + name Inter 13/500 + role badge mono 11px ("Sales Manager"). Clicking opens a dropdown with: Profile, Preferences, Theme toggle (☀/🌙), Sign out.
  - Sidebar collapse/expand toggle icon at the very bottom.

### 1b. Top bar (48px height, sticky, full width minus sidebar)

- **Left zone:** Breadcrumb trail in Inter 13/400 with `/` separator: `Inventory / Vehicles / WP0ZZZ97•••1234`. Active segment in ink-primary, prior segments as accent-blue links.
- **Center zone:** Command palette trigger — a rounded input-shaped element 320px wide: icon (lucide: `Search` 16px) + "Search or jump to..." in ink-muted + keyboard shortcut badge `⌘K` in mono 11px on bg-subtle pill. Clicking opens the command palette overlay.
- **Right zone:** 
  - Notification bell (lucide: `Bell` 20px) with red unread dot.
  - Outlet pill: "Bangalore" in Inter 12/500 on subtle bg.
  - User avatar 28px round.
  - All items spaced 16px apart.

### 1c. Command palette (overlay, centered, 560px wide, elevation-3)

- Appears on ⌘K. Semi-transparent backdrop (#0A0A0A at 60% opacity).
- Container: #141414, 12px radius, 1px border line-strong.
- **Top:** full-width search input, Inter 16/400, no border, no bg, just text. Placeholder: "Type a command or search…". Auto-focuses on open.
- **Results area:** scrollable list of results, max-height 400px.
  - Each result row: 40px height, icon 20px + primary text Inter 14/400 + secondary text Inter 12/400 ink-muted + optional keyboard shortcut badge on the right.
  - Categories with dividers: "Recent", "Vehicles", "Customers", "Job Cards", "Invoices", "Actions".
  - Highlighted result: bg-hover. Arrow keys navigate, Enter selects.
  - Actions start with a verb: "Create new vehicle", "Open job card JC-2341", "Go to Finance".
- **Bottom:** helper bar Inter 11/400 ink-muted: "↑↓ Navigate · ↵ Open · ⎋ Close"

### 1d. Main canvas

- Starts at 48px from top (under top bar), fills to bottom.
- Internal padding: 24px on all sides (32px on ≥1440px).
- All page scroll is inside the canvas, not the body.
- Background: bg-canvas.

**Variant outputs:**
1. Shell with sidebar expanded, dark theme — 1440px desktop.
2. Shell with sidebar collapsed, dark theme — 1280px.
3. Shell light theme variant — 1440px.
4. Tablet view (1024px) with sidebar collapsed.

---

## Screen 2 — Dashboard (home after login)

**Purpose:** operational overview at a glance. Role-adaptive — GM sees everything, Sales Manager sees their domain, Service Advisor sees theirs.

**Layout:** the main canvas with a page title + 4 stat rows + 3 main panels.

**Structure:**

1. **Page header** — Inter 28/600: "Dashboard". Right side: outlet label "Bangalore" + date "Thursday, 17 April 2026" in Inter 13/400 ink-muted.

2. **Stat strip** — 4 stat cards in a horizontal row, filling the width:
   - *Vehicles in stock:* large number "42" in Inter 40/600, delta "+3 this week" in success-green 13px, subtitle "Active listings" in ink-muted 12px.
   - *Open deals:* "17" — subtitle "₹4.2 Cr pipeline"
   - *Active job cards:* "8" — subtitle "3 urgent (>2 days)"
   - *Revenue MTD:* "₹2,38,50,000" in mono 22px — subtitle "vs ₹2,10,00,000 target" with a mini inline sparkline

   Each stat card: bg-surface, 1px border line, 16px padding, 6px radius. Delta up in success green, down in danger red. If a stat is clickable, show a subtle → on hover.

3. **Main panel row (3 columns, equal width):**

   **Panel A: Inventory snapshot (left)**
   - Header: "Inventory" Inter 18/600 + "View all →" accent link.
   - Mini table with 5 rows:
     | Vehicle | Status | Days | Price |
     — Rows show: 64px photo thumb, VIN masked mono, make + model Inter 14, status chip, days-in-status number, price in mono.
   - Below the table: bar chart showing inventory ageing distribution (0–30d, 30–60d, 60–90d, 90d+) as a small horizontal stacked bar.

   **Panel B: Sales pipeline (center)**
   - Header: "Sales" + "View all →"
   - Vertical funnel/list:
     - "New leads" → 12
     - "Test drive booked" → 6
     - "Reserved" → 4
     - "Sales order" → 3
     - "Delivered this month" → 5
   - Each row: label Inter 14 + count Inter 16/600 on the right + subtle horizontal bar width proportional to count.
   - Bottom: "Top deal: Porsche Panamera 4 · ₹1,28,50,000 · Reserved" in 13px.

   **Panel C: Service bay (right)**
   - Header: "Service" + "View all →"
   - Mini bay grid: 8 bays displayed as small squares in a 4x2 grid:
     - Occupied bay: filled with a vehicle mono abbreviation (e.g., "PAN" for Panamera), status color border.
     - Empty bay: dashed border, "Empty" in ink-muted.
   - Below: list of 3 upcoming appointments:
     - "10:00 — Annual service — Audi RS e-tron GT · Arjun M."
     - "11:30 — Pre-delivery inspection — Range Rover · Priya K."
     - "14:00 — Body shop — BMW 7 Series · Walk-in"

4. **Secondary row (2 panels, below main):**

   **Panel D: Recent activity (left, 60% width)**
   - Timeline feed. Each item: avatar 24px + "Rahul posted an appraisal for WP0ZZZ97•••1234" + timestamp "2 min ago". Subtle hairline between items. Last 10 items.

   **Panel E: Alerts & tasks (right, 40% width)**
   - "3 vehicles aged >90 days" — warning chip
   - "TCS filing due 7 May" — warning chip
   - "2 GRNs pending approval" — info chip
   - "Floor-plan interest allocation due" — info chip
   - Each: icon 16px + text Inter 13 + chip, click navigates to the relevant module.

**Motion:** stat numbers count up from 0 on first load (160ms). Panel contents stagger-reveal at 80ms intervals.

**Responsive:** on 1024px tablet, stat strip wraps to 2×2. Panels stack vertically.

---

## Screen 3 — Inventory: Vehicle list

**Purpose:** the primary inventory view. A dense, filterable, sortable data table of all vehicles.

**Structure:**

1. **Page header** — "Vehicles" Inter 28/600. Right side: primary button "Add Vehicle" (blue filled, lucide `Plus` icon). Secondary button "Import" (ghost).

2. **Filter bar** — directly below header, single row:
   - Saved view tabs: "All" (active/underlined), "Listed", "In Refurb", "Stale (>60d)", "My Listings". Each is a clickable tab in Inter 13/500.
   - Right side: filter icon + "Filter" text button (opens filter dropdown), column config icon (lucide: `SlidersHorizontal`), density toggle (compact/default/relaxed), search input 240px.

3. **Bulk action bar** — appears when ≥1 row is checkbox-selected. Sticks above the table: "3 selected" + "Export" + "Update Status" + "Assign Outlet" buttons.

4. **Data table:**

   | | Photo | VIN | Year | Make & Model | Outlet | Status | Days | Ask Price | Landed Cost | Margin | CPO | Actions |
   
   - **Checkbox column:** 40px, centered checkbox.
   - **Photo:** 48×36px thumbnail, 4px radius. Placeholder if no photo: grey bg with car icon.
   - **VIN:** mono 13px, masked (WP0ZZZ97•••1234). Click to copy full VIN — toast confirms.
   - **Year:** Inter 13. 
   - **Make & Model:** Inter 14/500 primary line, trim in 12px ink-muted second line.
   - **Outlet:** pill badge "BLR" / "MUM" / "CHE" in 11px uppercase.
   - **Status:** state chip with colored dot + label: "Published", "Draft", "In Refurb", "Reserved", "Sold", "Unpublished". 
   - **Days:** ageing number. Green <30, amber 30–60, red >60. Mono 13px.
   - **Ask Price:** mono 13px right-aligned. `₹ 1,28,50,000`.
   - **Landed Cost:** mono 13px ink-muted right-aligned. `₹ 98,40,000`.
   - **Margin:** mono 13px. Positive in success green, negative in danger red. `₹ 30,10,000` or `24.3%` toggle.
   - **CPO:** badge "CPO" in success-green pill, or empty cell.
   - **Actions:** icon button row (visible on hover): eye (view), pencil (edit), ellipsis (more menu with: Publish, Unpublish, Transfer, Archive).

   - Row height: 56px (default density), 44px (compact), 68px (relaxed).
   - Alternating row shading (subtle/surface alternation).
   - Sticky header row.
   - Sortable columns: click header to sort (arrow indicator). Shift-click for multi-sort.
   - Row click opens detail panel (right slide-in) or full page (user preference toggle).

5. **Pagination bar** — bottom: "Showing 1–50 of 342 vehicles" left, "Rows per page: [25] [50] [100]" center, prev/next + page number buttons right.

6. **Empty state** (when no results): centered content block with car icon 48px muted, "No vehicles match your filters." + "Clear filters" accent link.

**Variant outputs:**
1. Full table with 8+ rows, dark theme, 1440px.
2. Same table with filter dropdown open showing: Make (multi-select), Outlet, Status, Price range, Age.
3. Row hover state with action icons revealed.
4. Table with 3 rows selected and bulk action bar visible.
5. Empty state.
6. Light theme variant.

---

## Screen 4 — Inventory: Vehicle detail (slide-in panel + full page)

**Purpose:** everything about one vehicle in one place. Used by sales, service, finance, GM.

### 4a. Slide-in panel (50% viewport width, from right)

**Structure:**

1. **Panel header:** 
   - Close button (X) top-right.
   - Photo hero: 16:9 primary photo, 240px tall, 6px radius. Below: 6 thumbnail dots (click to switch).
   - Below photo: status chip large ("Published" in green) + outlet pill "BLR".

2. **Title block:**
   - Inter 22/600: "2022 Porsche Panamera 4"
   - Mono 13px VIN: `WP0ZZZ97ZNS123456` (full, with copy icon).
   - Inter 13 ink-muted: "Platinum Edition · Crayon · Black Interior · 18,420 km"

3. **Quick stats grid (2×3):**
   | Ask Price | ₹ 1,28,50,000 |
   | Landed Cost | ₹ 98,40,000 |
   | Margin | ₹ 30,10,000 (30.6%) |
   | Days Listed | 14 |
   | Views | 342 |
   | Enquiries | 8 |
   Labels in 11px mono uppercase, values in Inter 16/600. Price values in mono.

4. **Tabs:**
   - **Overview** — provenance, specs, seller info, ownership state (consignment badge or outright badge).
   - **Cost Ledger** — table of all cost entries: acquisition, refurb parts, refurb labour, transport, detailing, photography, floor-plan interest. Running total at bottom.
   - **Photos** — grid of 20+ thumbnails with kind labels (EXTERIOR_FRONT, INTERIOR, etc.). Upload + reorder actions.
   - **Appraisal** — grade badge (A/A-/B/B+...), 210-point checklist status, inspector name, date.
   - **Timeline** — activity log: "Created by Rahul K. on 2 Apr 2026", "Submitted for review on 4 Apr", "Published by Sunita M. on 5 Apr". Each entry has avatar 20px + text + timestamp.
   - **Documents** — RC, insurance, Tally export, appraisal PDF.

5. **Action footer (sticky bottom of panel):**
   - Primary CTA matching status: "Publish Listing" (if draft), "Unpublish" (if published), "View on Storefront" (if published, ghost button).
   - Secondary: "Edit" pencil icon button, "More" ellipsis dropdown.

### 4b. Full-page variant (accessed via "Open full page" in panel header)

Same content but uses the full main canvas. Photo hero becomes larger (400px tall), tabs are horizontal across the page at 720px content width, with a right sidebar (320px) for the quick stats + actions.

**Variant outputs:**
1. Slide-in panel, dark theme, "Published" vehicle with full content.
2. Slide-in panel, "Draft" vehicle with "Publish" CTA disabled and guard tooltip.
3. Full-page view, "Cost Ledger" tab active.
4. Full-page view, "Timeline" tab active.

---

## Screen 5 — Sales: Deal pipeline

**Purpose:** sales pipeline from lead to delivery. The one screen where Kanban is appropriate.

**Structure:**

1. **Page header:** "Sales Pipeline" Inter 28/600. Right: "New Lead" primary button + filter row (assigned to me / all, outlet, date range).

2. **Kanban board** — 6 columns, horizontally scrollable:

   | New Lead | Contacted | Test Drive | Reserved | Sales Order | Delivered |
   
   Each column:
   - Header: title Inter 14/600 + count badge (circle, mono 11px) + sum of deal value in mono 12px ink-muted.
   - Cards stack vertically inside.

   **Deal card (280px wide, variable height):**
   - Top: customer name Inter 14/500 + phone icon (masked: `+91 •• •••• 1234`).
   - Vehicle: Make Model in Inter 13, outlet pill.
   - Amount: mono 15px `₹ 1,28,50,000`.
   - Bottom row: assigned avatar 20px + days-in-stage mono 11px + priority dot (high=red, medium=amber, low=none).
   - Right-click context menu: "Move to next stage", "Edit", "Add note", "Assign to", "Archive".

   Drag-and-drop between columns. Drop zone highlighted with accent-subtle bg when dragging.

3. **List view toggle** — a tab at the top to switch to table view (same data, table format like inventory list).

4. **Summary bar (bottom, sticky):** "17 active deals · ₹8.4 Cr pipeline · 5 delivered this month (₹2.38 Cr)"

**Motion:** card drag uses 120ms scale(1.02) + elevation-2 lift. Column count badge pulses once on change (200ms).

**Variant outputs:**
1. Kanban with 3+ cards per column, dark theme.
2. One card being dragged between "Test Drive" and "Reserved" columns.
3. List/table view of the same data.

---

## Screen 6 — Service: Job card board & detail

**Purpose:** service advisor and workshop technician view. Bay scheduling, job card lifecycle.

### 6a. Service bay board

**Structure:**

1. **Page header:** "Service" Inter 28/600. Right: "New Appointment" primary button.

2. **Tabs:** "Bay Board" (active), "Appointments", "Job Cards", "Warranty Claims".

3. **Bay grid** — visual representation of 8 bays (4 per row):
   
   Each bay: 280×200px card.
   - **Occupied:** bg-surface with top border in status color (green=in progress, amber=waiting parts, blue=QC, grey=scheduled).
     - Bay number: mono 14px "BAY 3".
     - Vehicle: Inter 14/500 "2022 Porsche Panamera 4".
     - VIN: mono 11px masked.
     - Job: Inter 13 "Annual service + brake pad replacement".
     - Technician: avatar 20px + name 13px.
     - Time: mono 12px "Started 09:30 · Est. complete 14:00" with a thin progress bar below.
     - Status chip: "In Progress" / "Waiting Parts" / "QC".
   - **Empty:** dashed 1px border line-strong, "Available" in ink-muted centered, Inter 14.

4. **Upcoming appointments list (below bay grid):**
   Table: Time, Customer, Vehicle, Service Type, Advisor, Status. Today's appointments with time slots.

### 6b. Job card detail (full page)

**Structure:**

1. **Header bar:**
   - Left: Job card number in mono 16px "JC-2026-0341", status chip large, bay badge "BAY 3".
   - Right: "Print Job Card" ghost button, "Complete Job" primary button (or "Start QC" depending on state).

2. **Vehicle + customer summary (horizontal card, 120px height):**
   - Left: vehicle photo 80×60, Inter 16/600 make model, mono VIN, outlet pill.
   - Right: customer name Inter 16/500, phone masked, last service date.

3. **Tabs:** Overview, Labour, Parts, Inspection, Timeline, Invoice Preview.

4. **Overview tab:**
   - **Service items** — table of line items. Each row: description, type (scheduled/unscheduled/customer-requested), estimated hours mono, actual hours mono, rate/hr mono, amount mono. Add row button at bottom.
   - **Parts required** — table: part number mono, description, quantity, unit price, availability chip (In Stock / On Order / Shortage), amount.
   - **Estimated total** — card at bottom-right: Labour ₹XX, Parts ₹XX, GST ₹XX (broken out CGST/SGST or IGST), Grand Total in mono 18px bold.

5. **Progress stepper** (horizontal, below header):
   `Received → Diagnosed → In Progress → QC → Ready for Delivery`
   Current step: filled circle in accent blue + bold label. Past steps: success green check. Future: outline circle + muted label. Thin connecting line.

6. **Advisor notes** — a timeline on the right sidebar (280px): most recent note at top, "Add note" textarea at top, each note has avatar + text + timestamp.

**Variant outputs:**
1. Bay board with 5 occupied, 3 empty bays, dark theme.
2. Job card detail, "In Progress" state, Overview tab, with 4 labour lines and 6 parts lines.
3. Job card detail, progress stepper at "QC" step.
4. Job card detail, "Invoice Preview" tab showing GST breakdown.

---

## Screen 7 — Parts: Stock & GRN

**Purpose:** parts inventory, purchase orders, goods receipt.

### 7a. Parts stock list

1. **Page header:** "Parts" Inter 28/600. Right: "New PO" primary button + "GRN" secondary button.
2. **Tabs:** "Stock" (active), "Purchase Orders", "GRN", "Suppliers", "Transfers".
3. **Filter bar:** search by part number/description, outlet filter, category dropdown (engine, body, electrical, consumable, tyre), stock status (in stock / low / out of stock / on order).
4. **Table:**

   | Part # | Description | Category | Outlet | Qty On Hand | Reorder Level | Unit Price | Last GRN | Status |
   
   - Part #: mono 13px.
   - Qty vs Reorder: when qty ≤ reorder, row gets a subtle danger-red left border and status chip "Low Stock".
   - Out-of-stock rows: status chip "Out of Stock" in danger red.

### 7b. GRN detail

1. **Header:** "GRN-2026-0089" mono 16px + status "Pending Approval" / "Approved" / "Rejected".
2. **Supplier info card:** name, GSTIN, PO reference, delivery date, received by.
3. **Line items table:** part #, description, PO qty, received qty (editable if pending), unit price, total. Discrepancy column highlights mismatches in amber.
4. **Approval footer:** "Approve GRN" primary, "Reject" destructive button, "Add Note" text link. Dual-control indicator if amount > threshold.

**Variant outputs:**
1. Stock list with 3 low-stock rows highlighted, dark theme.
2. GRN detail pending approval with one discrepancy highlighted.

---

## Screen 8 — Finance: Invoice & GST

**Purpose:** invoice generation with margin-scheme GST, TCS, and e-invoicing status.

### 8a. Invoice list

1. **Page header:** "Invoices" + "Create Invoice" primary button.
2. **Tabs:** "All", "Draft", "Pending E-Invoice", "Filed", "Cancelled".
3. **Table:**

   | Invoice # | Date | Customer | Vehicle | Type | Amount | GST | TCS | IRN Status | Actions |
   
   - Invoice #: mono, clickable.
   - Type chip: "Vehicle Sale" / "Service" / "Parts" / "Refund".
   - Amount + GST + TCS: mono, right-aligned.
   - IRN Status: "Filed ✓" green, "Pending" amber, "Failed ✗" red with retry action, "N/A" muted (B2C below threshold).

### 8b. Invoice detail / generator

1. **Header:** "INV-2026-0234" mono + status chip.
2. **Two-column layout:**
   - **Left (60%):** invoice form.
     - From (outlet address, GSTIN) and To (customer, GSTIN if B2B, PAN, address).
     - Line items table: description, HSN/SAC, qty, rate, taxable value, GST rate, GST amount, total.
     - **GST breakdown panel:** prominently displayed.
       - Margin scheme: "Taxable value (margin): ₹30,10,000" → CGST 9%: ₹2,70,900 / SGST 9%: ₹2,70,900 → Total GST: ₹5,41,800.
       - OR IGST 18% for inter-state.
       - TCS line (if >₹10L): "TCS @ 1%: ₹1,28,500".
     - Grand total in mono 24px.
   - **Right (40%):** metadata panel.
     - E-invoice status card: IRN number mono, QR code rendered, filed timestamp, Ack number.
     - Payment status: paid / partial / unpaid. If partial, show collection history table.
     - Actions: "File E-Invoice" primary (if pending), "Download PDF", "Send to Customer" (WhatsApp + email), "Cancel Invoice" destructive.

3. **Margin scheme callout:** a small info banner below line items: "This invoice uses the GST margin scheme for second-hand goods. GST is computed on the margin (sale price – acquisition cost), not the full sale value."

**Variant outputs:**
1. Invoice list with mixed IRN statuses, dark theme.
2. Invoice detail for a vehicle sale showing margin-scheme GST + TCS, dark theme.
3. Invoice detail showing the e-invoice panel with QR code and IRN.
4. Invoice detail light theme variant.

---

## Screen 9 — Customers: Profile & history

**Purpose:** 360° customer view. All interactions, vehicles, service, purchases.

1. **Header:** Customer name Inter 28/600 + role tags (e.g., "Buyer · Consignor"). Right: "Edit" button, "Add Note" button.

2. **Profile card (horizontal, top):**
   - Avatar 64px round with initials if no photo.
   - Name, phone (masked: `+91 •• •••• 1234`, click to reveal for authorized roles), email (masked), PAN (masked `ABCDE••••F`).
   - Outlet: "Bangalore" pill. Member since: mono date.
   - KYC status: "Aadhaar ✓ · PAN ✓ · DigiLocker connected" with green checks.
   - Communication preference badges: "WhatsApp ✓ · SMS ✓ · Email ✓".

3. **Tabs:** Overview, Vehicles, Service History, Transactions, Communications, Documents.

4. **Overview tab:**
   - **Lifetime value card:** "₹2,56,00,000 across 2 purchases and 7 services" mono + Inter.
   - **Owned vehicles:** compact cards (photo 64px + make model + VIN masked + status).
   - **Recent activity timeline:** last 10 interactions across all modules.

5. **Transactions tab:**
   - Table: date, type (purchase/service/refund), vehicle, amount, payment method, status. All amounts in mono.

6. **Communications tab:**
   - Timeline: WhatsApp messages (with template name), SMS, emails, in-app notifications. Each with timestamp and delivery status (sent/delivered/read/failed).

**Variant outputs:**
1. Full profile page, dark theme, Overview tab.
2. Profile with PII masked (default view for R09).
3. Profile with PII revealed (R19+ view).
4. Transactions tab with 5+ entries.

---

## Screen 10 — Reports: Operations dashboard

**Purpose:** GM / CFO / CEO level. Multi-outlet overview.

1. **Header:** "Operations Dashboard" + outlet selector (All / Bangalore / Mumbai / Chennai) + date range picker.

2. **KPI strip (6 cards horizontal):**
   - Total inventory value: mono `₹12.4 Cr`
   - Average days to sell: `34` with trend arrow
   - Monthly revenue: `₹2.38 Cr` vs target `₹2.5 Cr` (progress bar)
   - Service bay utilization: `78%` with a mini donut
   - Gross margin: `22.4%`
   - Active deals: `17`

3. **Charts row (2 charts side by side):**
   - Left: "Revenue trend" — line chart, last 6 months, per outlet (3 colored lines). Tooltip on hover showing exact values in mono.
   - Right: "Inventory composition" — horizontal stacked bar: by status (published, in refurb, reserved, sold this month), per outlet.

4. **Tables section:**
   - "Stale inventory (>60 days)" — table of vehicles with ageing, ask price, landed cost, suggested action.
   - "Upcoming TCS filings" — next filing date, amount, PAN count.

5. **Access control:** KPI cards that the current role cannot see are replaced with a locked state: grey bg + lock icon + "Requires CFO access" tooltip.

**Variant outputs:**
1. Dashboard with "All outlets" selected, dark theme, full data.
2. Dashboard with one KPI card locked (role-restricted).
3. Chart tooltips visible on hover.

---

## Screen 11 — Settings & platform

**Purpose:** outlet management, feature flags, user management, org settings.

### 11a. Settings shell

1. **Left nav (within main canvas):** vertical list of settings pages:
   - Organization, Outlets, Users & Roles, Feature Flags, Integrations, Notifications, Audit, Appearance.
2. **Right content area:** the selected settings page.

### 11b. Users & Roles page

1. **Header:** "Users & Roles" + "Invite User" primary button.
2. **Table:**

   | Name | Email | Role | Outlet | Status | Last Active | Actions |
   
   - Role: badge with role code + name (e.g., "R10 · Sales Manager").
   - Status chip: "Active" green, "Invited" amber, "Disabled" grey.
   - Actions: Edit, Disable, Reset password.

3. **Role detail drawer (on clicking a role):** shows all permissions for that role as a checklist matrix: module × action (read/write/approve/admin). Checkmarks in accent blue, denied as grey X.

### 11c. Feature Flags page

1. **Table:**

   | Flag | Module | Status | Enabled For | Last Changed |
   
   - Status: toggle switch (on/off).
   - Enabled For: "All outlets" or specific outlet pills.
   - Click row to expand details: description, created date, linked spec ID.

**Variant outputs:**
1. Users & Roles table, dark theme.
2. Role detail drawer open showing permission matrix.
3. Feature Flags table with 2 flags on, 3 off.

---

## Screen 12 — Notification center & in-app inbox

**Purpose:** staff notification inbox + template management.

### 12a. Notification inbox (triggered from bell icon)

- Slide-down panel from bell icon, 380px wide, max-height 480px.
- Header: "Notifications" + "Mark all read" text link.
- List of notification items:
  - Each: icon 20px (type-coded: car for inventory, wrench for service, rupee for finance) + title Inter 14 + body Inter 13 ink-muted + timestamp mono 11px.
  - Unread: bg-subtle left border accent blue.
  - Click navigates to the relevant record.
- Footer: "View all notifications →" accent link.

### 12b. Notification templates (settings page)

- Table of WhatsApp + SMS + email templates.
  | Name | Channel | DLT/BSP ID | Status | Last Used | Actions |
  - Channel chip: "WhatsApp" blue, "SMS" green, "Email" purple.
  - Status: "Active" / "Pending DLT" / "Pending BSP" / "Disabled".
  - Click to view template preview with variable placeholders highlighted.

**Variant outputs:**
1. Notification inbox slide-down with 5 items (2 unread), dark theme.
2. Template management table.

---

## Screen 13 — Component specimen page

**Purpose:** a reference sheet showing every staff UI component variant, labeled. Use this to establish the design vocabulary for all subsequent screens.

1. **Buttons:** primary, secondary, ghost, destructive, link — each in default, hover, active, disabled, loading states. Show with and without icon.

2. **Inputs:** text, number (with ₹ prefix), search, date picker, select dropdown, multi-select, combobox, textarea, phone input (+91), PAN input, GSTIN input. Each in default, focus, filled, error, disabled states.

3. **Chips/Badges:** all state chips from the palette (Listed, Reserved, In Refurb, Stale, Sold, Draft, Overdue, CPO, Pending). Outlet pills (BLR, MUM, CHE). Role badges (R09, R10, R19).

4. **Table specimens:** 
   - Default density row, compact row, relaxed row.
   - Header with sort arrows.
   - Selected row highlight.
   - Alternating row shading.
   - Inline actions on hover.

5. **Cards:** stat card, vehicle card (staff variant), deal card, job card, notification card, empty state card.

6. **Modals:** confirmation dialog (destructive action), form modal, information modal.

7. **Navigation:** sidebar item (default, hover, active, collapsed), breadcrumb, tab bar, command palette.

8. **Feedback:** toast (success, error, info, warning), inline alert, progress stepper, skeleton loading.

9. **Domain components:** VIN badge with copy, price display with GST breakdown, role badge, outlet pill, CPO badge, IRN status badge.

**Variant outputs for every section:**
1. Dark theme.
2. Light theme.
3. Focus states visible (for a11y review).

---

## Additional output requests

For each screen, please also output:

1. A **dark theme** version (default, always produce this first).
2. A **light theme** variant.
3. A **labeled layout frame** showing the 12-column grid overlay and spacing values.
4. For Screens 3, 5, 6, 7, 8: a **zoomed-in table specimen** at 2x showing cell padding, row height, and type sizing.

## Quality bar

- Typography must use Inter and IBM Plex Mono only — never any serif face.
- No decorative imagery anywhere. The data is the visual.
- Monetary values in Indian grouping (₹1,28,50,000) — never US grouping.
- VINs and phone numbers masked by default.
- Tables must look dense and professional — not airy card-based layouts.
- Dark mode is the primary theme; light mode is secondary.
- Chips and badges always have text labels, never color-only.
- When in doubt, reference Linear or Stripe Dashboard, never Salesforce or SAP.
