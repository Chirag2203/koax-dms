---
spec_id: SPEC-SALES-001
domain: sales
title: Staff Sales Module (Kanban pipeline + lead capture + enquiry detail)
status: draft
risk_level: medium
pii_sensitivity: medium
flags: [staff.sales.v1]
owners: [planner, ux-writer, qa-planner, integrator]
depends_on:
  - SPEC-PLATFORM-001 (app shell + primitives + Dialog/AlertDialog/Toast)
  - SPEC-INVENTORY-002 (vehicle fixtures + detail deep-links)
docs_consulted:
  - Doc 02 §Sales (v1 feature list)
  - Doc 04 §Sales CRM (lead pipeline, test drive, reservation, sales order, delivery)
  - Doc 09 (Glossary — Lead, Enquiry, Deal, Reservation)
  - Doc 11 §DealStateMachine (lead → contacted → test-drive → reserved → sales-order → delivered)
  - Doc 14 §R05 Sales Associate, §R10 Sales Manager, §R19 GM
  - Design 03 Screen 5 (Sales pipeline)
  - Stitch: sales_deal_pipeline_kanban_dark, sales_deal_pipeline_kanban_drag_state, sales_deal_pipeline_list_view_dark, sales_deal_pipeline_light, sales_create_new_lead, sales_enquiry_detail
effective_date: 2026-04-17
---

# SPEC-SALES-001 — Staff Sales Module

## 1. Summary

Sales pipeline from first lead to delivered vehicle. Kanban is the default view (6 stages), list view is the alternative. Lead capture from 5 sources (website, WhatsApp, phone, walk-in, referral). Full enquiry detail page with interaction ledger + compliance/KYC sidebar.

## 2. Routes

| Route | Description |
|-------|-------------|
| `/sales` | Deal pipeline Kanban (default) |
| `/sales?view=list` | List/table view of all deals |
| `/sales/leads/new` | Lead capture form |
| `/sales/leads/[id]` | Enquiry detail with interaction ledger |
| `/sales/deals/[id]` | Deal detail (later stages, alias for leads/[id]) |

## 3. Pipeline stages (Doc 11)

```
NEW_LEAD → CONTACTED → TEST_DRIVE → RESERVED → SALES_ORDER → DELIVERED
```

- **NEW_LEAD** — just captured, not yet contacted
- **CONTACTED** — first contact made (call, WhatsApp, email)
- **TEST_DRIVE** — test drive booked or completed
- **RESERVED** — deposit received (token ₹1,00,000+)
- **SALES_ORDER** — full agreement signed, paperwork in progress
- **DELIVERED** — vehicle handed over, closed-won

Side states: `LOST` (lost to competition / dropped), `ON_HOLD` (paused).

## 4. Kanban pipeline (`/sales`)

### 4.1 Layout
Reference: Stitch `sales_deal_pipeline_kanban_dark`

- Page header: "Sales Pipeline" Inter 28/600. Right: "New Lead" primary button + filter controls
- Filter bar row: assigned-to-me toggle, outlet filter, date range, source filter
- View toggle tabs: Kanban (default) | List
- Kanban: 6 horizontal columns with horizontal scroll on smaller screens
  - Column header: title Inter 14/600 + count badge (circle) + sum of deal values (mono muted)
  - Cards stack vertically inside, `space-y-2`
- Summary footer (sticky bottom): "17 active deals · ₹8.4 Cr pipeline · 5 delivered this month"

### 4.2 Deal card (280px wide, variable height)

Per Stitch design:
- Top row: customer name Inter 14/500 + source pill (WEB/REFERRAL/WALK-IN/WHATSAPP/PHONE, mono 10px uppercase on bg-bg-subtle)
- Phone: masked `+91 98··· ··341` in mono 12px muted
- Vehicle: "2022 Porsche Macan S" Inter 13/400
- Amount: mono 15px `₹ 78,00,000`
- Bottom row: 
  - Left: icon + timestamp "2h ago" / "Yesterday" / "Today, 14:00"
  - Right (for later stages): status micro-pill "Token Paid" / "Awaiting docs"
- Priority indicator: colored dot top-left (red=high, amber=medium, none for low)
- Right-click context menu: Move to next stage, Edit, Add note, Assign to, Archive
- Click: opens enquiry detail page `/sales/leads/[id]`

### 4.3 Drag and drop
- HTML5 drag (or `@dnd-kit/core` if simpler)
- Cards draggable between columns
- Drop zone: column background lightens (`bg-accent/5`) during drag over
- On drop: card moves, optimistic update, POST `/api/staff/sales/deals/:id/move` with new stage
- Invalid drops (skip-stage forward): show toast warning but allow (sales sometimes skip stages)

### 4.4 List view (toggle)
Reference: Stitch `sales_deal_pipeline_list_view_dark`
- Same data in DataTable with columns: Customer | Phone | Vehicle | Stage | Amount | Source | Assigned | Days in Stage | Priority | Actions
- Uses existing DataTable primitive from S0
- Stage column uses StateChip with stage-specific colors

## 5. Lead capture (`/sales/leads/new`)

Reference: Stitch `sales_create_new_lead`

Full-page form (modal would be too small for this much content).

**Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Client Name | Text | Yes | 2-80 chars |
| Phone Number | Text (+91 prefix) | Yes | 10 digits after +91 |
| Email Address | Email | No | valid email if provided |
| Lead Source | Select | Yes | WEB / REFERRAL / WALK-IN / WHATSAPP / PHONE |
| Target Vehicle | Combobox (VIN or Make/Model lookup) | No | fuzzy match against inventory fixtures |
| Expected Budget Range | Min/Max number (₹) | No | max ≥ min |
| Operational Notes | Textarea | No | max 1000 |

**Layout:**
- Breadcrumb: SALES / LEADS (mono 10px uppercase)
- Title: "New Lead Registration" Inter 28/600 + auto-gen ID badge right side "ID: AUTO-GEN" mono
- Two-column form (Client Name + Phone on row 1, Email + Source on row 2)
- Full-width sections: Target Vehicle Lookup (shows helper "Press ⌘K to search global"), Budget Range (2-col), Notes
- Hairline separators between groups
- Bottom right: Cancel + Save as Draft (ghost) + Create Lead (primary, with → arrow)

**Behavior:**
- VIN lookup integrates with command palette pattern — typing searches existing inventory
- On submit: POST `/api/staff/sales/leads`, returns `{id}`, redirects to `/sales/leads/[id]`
- Save as Draft: stores in lead list as NEW_LEAD with draft flag

## 6. Enquiry detail (`/sales/leads/[id]`)

Reference: Stitch `sales_enquiry_detail`

**Header:**
- Breadcrumb: "Leads & Enquiries" + status pill "Active Negotiating"
- Customer name large Inter 32/600: "Vikram Malhotra"
- Subtitle: city + source + "opened 2 days ago"
- Right actions (in this order, only Schedule Test Drive is accent-colored):
  - Assign Lead (ghost)
  - Update Lead (ghost) — opens Update modal (edit name/email/vehicle/budget/priority/notes)
  - Add Note (ghost) — opens Add Note modal (title/body/visibility)
  - Log Call (ghost) — opens Log Call modal (manual call log — direction/duration/notes)
  - **WhatsApp** (ghost with green WhatsApp icon) — opens `wa.me/91{phone}?text={prefilled}` in new tab
  - **AI Call** (ghost with sparkle icon) — opens AI Call dialog (see §6.3)
  - Schedule Test Drive (accent primary)

**Two-column layout:**

**Left (60%) — Interaction Ledger:**
- Timeline of all interactions
- Each entry: icon (message/call/note) + action title + body + timestamp + added by
- Filter bar at top: filter by type (All / Messages / Calls / Notes / System events)
- Example entries from Stitch:
  - "WhatsApp Message Sent — Sent the updated valuation structure and high-res interior gallery for the Autobiography trim..." with template ID
  - "Inbound Call — Customer enquired about financing options via HDFC. Connecting them with our finance partner." duration
  - "Enquiry Created — Walk-in customer looking for premium SUV. High intent, ready to close within 14 days if vehicle condition meets expectations."

**Right (40%) — Sidebar panels:**

**Panel 0 — Contact Details** (new, shown at top of sidebar):
- Card: `rounded-md border border-line bg-bg-surface p-4`
- Title "Contact Details" Inter 14/600 + eye toggle top-right (Show/Hide PII button — reveals masked fields for R19+, masks for others by default)
- Phone row: mono text + 3 inline icon buttons on right:
  - Copy icon (copies to clipboard, toast)
  - Phone icon (opens `tel:+91XXXXXXXXXX` — triggers native dialer)
  - WhatsApp icon (green, opens `https://wa.me/91XXXXXXXXXX?text={prefilled}`)
- Email row: text + copy + mail icon (opens `mailto:{email}`)
- City / Outlet row: show city, outlet code
- Preferred contact time (if available): mono muted text
- Mask phone for R05 by default (show last 4 only). R10+ can click eye icon to reveal full.

Panel A — Vehicle of Interest:
- Photo 200×120
- "IN STOCK" pill
- "Interest Category: SUV"
- Vehicle name Inter 16/600: "2023 Land Rover Range Rover"
- Variant: "3.0 LWB Autobiography"
- Asset identifier: VIN mono
- Price mono 28/600: "₹ 2,45,00,000"

Panel B — Compliance & KYC:
- Identity Verification (Aadhaar): "Verified" green check
- Financial Records (PAN): "Verified" green check
- Bank Statement Shared: "Pending" amber
- Each row: lucide icon + label + status badge

## 6.3 WhatsApp Quick Action

Clicking WhatsApp button in header opens a compact Dialog (sm 480px) BEFORE firing the deeplink — gives staff chance to pick a message template.

**Dialog: "Send WhatsApp"**
- Customer info (read-only): name + masked phone
- Message template select (pre-approved DLT templates per Doc 13):
  - "Greeting & Introduction" (default)
  - "Share Vehicle Details"
  - "Pricing Quote"
  - "Test Drive Follow-up"
  - "Document Request"
  - "Custom Message"
- Template preview (read-only text area, shows the template body with variables like {name}, {vehicleName} interpolated from the deal)
- If "Custom Message" selected: free-text textarea instead of preview
- Primary CTA: "Open WhatsApp" (green, like WhatsApp brand #25D366 — exception to token rule as it's a 3rd-party brand button)
- On click: opens `https://wa.me/91{phone-digits-only}?text={encoded-message}` in new tab + logs an interaction with type `whatsapp-sent`, body = the message template name + preview, toast "Message sent on WhatsApp"

## 6.4 AI Call Dialog

New feature. When "AI Call" button clicked, opens Dialog (md 560px) with 2-stage flow:

**Stage 1 — Call Setup:**
- Title "AI Call Setup" + sparkle icon (lucide `Sparkles`)
- Subtitle: "Configure the purpose of this call. Our AI agent will handle it and log the summary."
- Fields:
  - **Call Intent** — select with presets + "Custom":
    - "Introduce BN Automobiles"
    - "Share vehicle details and pricing"
    - "Book a test drive appointment"
    - "Follow up on previous interaction"
    - "Request KYC documents"
    - "Gather feedback post-delivery"
    - "Custom"
  - **Additional Context** — textarea, optional, max 500 chars. Placeholder: "Any specific points to cover, customer's recent concerns, or key terms to mention..."
  - **Expected Outcome** — select: "Schedule test drive" / "Collect information" / "Send docs" / "Close sale" / "General update"
  - Language: English / Hindi (default Hindi for non-Bangalore customers, English otherwise)
- Info banner: `bg-accent-subtle border border-accent/30` with text "AI calls are recorded and summarized. The customer will be informed at the start of the call."
- CTAs: Cancel + "Initiate AI Call" (primary accent with Sparkles icon, ⌘Enter)

**Stage 2 — Call In Progress (transient, replaces Stage 1 after click):**
- Animated avatar (pulsing circle with Phone icon, bg-accent/20, scales 1.0→1.1 every 1.5s)
- "Calling {customer name}..." Inter 18/600
- "AI Agent: BN Sales Assistant" mono muted
- Live transcript panel (simulated) — reveals 3-4 scripted lines over 4 seconds:
  - "Hello, is this Vikram?"
  - "Yes, speaking."
  - "I'm calling from BN Automobiles regarding your interest in the Range Rover..."
  - "Would you be available for a test drive this weekend?"
- Cancel button to end call early

**Stage 3 — Call Summary (after 6-8 seconds auto-transitions from Stage 2):**
- Title: "Call Completed"
- Duration: "3m 24s"
- Sentiment badge: Positive / Neutral / Needs Follow-up
- AI-generated summary (mocked, varies by intent):
  - "Customer confirmed interest in the Range Rover Autobiography. Booked a test drive for Saturday 10am at Bangalore outlet. Requested brochure copy and EMI options."
- Action items (bullets, auto-extracted):
  - "Schedule test drive: Saturday 10am BLR outlet"
  - "Share brochure (PDF)"
  - "Prepare EMI options: 48-60 months at 9-10% APR"
- Save button: logs interaction with type `call-ai`, body = full summary, durationSeconds = 204, adds action items as a note
- After save: closes dialog, toast "AI call logged"

**Fixtures:**
Add pre-written mock summaries per intent so the dialog feels alive. Store in a constant `AI_CALL_TEMPLATES` in the component or a separate file `apps/staff-web/src/lib/ai-call-templates.ts`.

## 6.5 New interaction type

Add `call-ai` to `InteractionTypeEnum` in `packages/types/src/domain/sales.ts`:
```typescript
export const InteractionTypeEnum = z.enum([
  'whatsapp-sent','whatsapp-received','call-inbound','call-outbound','call-ai',
  'email-sent','email-received','note','enquiry-created','stage-changed',
  'assigned','test-drive-scheduled','payment-received',
]);
```

The interaction card in the ledger renders with:
- Icon: `Sparkles` (different from regular Phone icon)
- Title: "AI Call — {intent label}"
- Body: the generated summary
- Metadata pills: duration + sentiment + language

## 7. Data model

```typescript
// packages/types/src/domain/sales.ts
export const DealStageEnum = z.enum([
  'new-lead','contacted','test-drive','reserved','sales-order','delivered','lost','on-hold',
]);

export const LeadSourceEnum = z.enum([
  'web','referral','walk-in','whatsapp','phone',
]);

export const DealPriorityEnum = z.enum(['low','medium','high']);

export const DealSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string().optional(),
  vehicleVin: z.string().optional(),
  vehicleName: z.string().optional(),
  vehicleImage: z.string().optional(),
  amount: z.number(),
  stage: DealStageEnum,
  source: LeadSourceEnum,
  priority: DealPriorityEnum,
  city: z.string(),
  outlet: z.string(),
  assignedTo: z.string().optional(), // staff id
  assignedToName: z.string().optional(),
  createdAt: z.string(),
  lastActivityAt: z.string(),
  daysInStage: z.number(),
  microStatus: z.string().optional(), // "Token Paid", "Awaiting docs"
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  notes: z.string().optional(),
});

export const InteractionTypeEnum = z.enum([
  'whatsapp-sent','whatsapp-received','call-inbound','call-outbound','email-sent','email-received',
  'note','enquiry-created','stage-changed','assigned','test-drive-scheduled','payment-received',
]);

export const InteractionSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  type: InteractionTypeEnum,
  title: z.string(),
  body: z.string().optional(),
  templateId: z.string().optional(), // for WhatsApp templates
  durationSeconds: z.number().optional(), // for calls
  createdAt: z.string(),
  addedByName: z.string(),
});

export const KycStatusEnum = z.enum(['verified','pending','rejected','not-started']);
export const KycSchema = z.object({
  dealId: z.string(),
  aadhaar: KycStatusEnum,
  pan: KycStatusEnum,
  bankStatement: KycStatusEnum,
});
```

## 8. Fixtures

- **deals.ts**: 17 deals across 6 stages (3 new-lead, 4 contacted, 4 test-drive, 3 reserved, 2 sales-order, 1 delivered). Realistic Indian names (Arjun Mehta, Vikram Desai, Neha Gupta, Priya Sharma, Sanjay Patel, etc.), masked phones, each linked to a vehicle from existing fixtures.
- **interactions.ts**: ~8 interactions per deal on average (~140 total). Mix of WhatsApp, calls, notes, stage changes.
- **kycStatuses.ts**: one per deal, various progress levels.

## 9. MSW handlers

```
GET /api/staff/sales/deals (with filters: stage, assignedTo, outlet, source, date range)
GET /api/staff/sales/deals/:id
POST /api/staff/sales/leads (create)
POST /api/staff/sales/deals/:id/move (change stage)
GET /api/staff/sales/deals/:id/interactions
POST /api/staff/sales/deals/:id/interactions (add note/call log)
GET /api/staff/sales/deals/:id/kyc
```

## 10. Build phases

- **S3a**: Types + fixtures + MSW handlers
- **S3b**: Kanban pipeline page + deal card + drag-drop + list view toggle
- **S3c**: Lead capture form + Enquiry detail page + interaction ledger

## 11. Non-functional requirements

- Kanban drag: ≤ 120ms visual feedback on drop
- List view toggle preserves filters via URL searchParams
- Drag uses `@dnd-kit/core` if complex drag needed; fall back to HTML5 drag if simpler

## 12. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-17 | 0.1 | Claude (integrator) | Initial spec for staff Sales Phase S3 |
| 2026-04-17 | 0.2 | Claude (integrator) | Phase S3 shipped (Kanban + list + lead capture + enquiry detail + 2 modals). All consistency fixes applied (card patterns, tab patterns, design doc 04). Added Update Lead + Add Note modals to enquiry detail header. |
| 2026-04-17 | 0.3 | Claude (integrator) | Added §6.0 Contact Details sidebar panel, §6.3 WhatsApp quick action with template picker, §6.4 AI Call dialog (3-stage: setup → calling → summary), §6.5 new interaction type `call-ai`. |
