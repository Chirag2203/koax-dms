# 05 · Service, Parts & Workshop

Functional blueprint for the service business: customer intake, Repair Order (RO) lifecycle, Vehicle Health Check (VHC), parts inventory, warranty, and the brand-specific tooling/certification infrastructure that multi-brand luxury service requires.

---

## 1. Guiding principles

1. **Service is the second act.** In luxury pre-owned, the sale happens once; service happens for years. Service revenue, customer retention, and brand advocacy are built here.
2. **Three inspections, three workflows.** CPO certification (Doc 04 §4), Vehicle Health Check (§4 below), and Pre-Purchase Inspection for third parties (v1.5) are distinct products with distinct UIs and reports. Do not merge.
3. **Complaint-Cause-Correction (3C) is the data model.** This is OEM industry-standard for warranty audit trails. Customer complaint ≠ root cause ≠ correction action. All three are captured.
4. **Brand certification gating is a compliance feature.** A BMW emissions job legally requires a STAR-certified tech with ISTA licensing. The DMS enforces this at assignment time; it is not a suggestion.
5. **Parts have lifetimes.** OEM parts are superseded frequently. Safety parts (airbags, seatbelts, ECUs) require batch/serial tracking for recall-readiness.
6. **Customer communication is WhatsApp-first.** Every status change, approval request, VHC report, and invoice lands on WhatsApp. Email is for records only.

---

## 2. Service booking intake

### 2.1 Channels

- Customer portal (primary; full form with vehicle picker, slot selector, concern list)
- WhatsApp inbound (BSP webhook → booking request)
- Phone (SA creates booking on customer's behalf)
- Walk-in (reception creates; same UI as portal)
- Reminder-driven (customer clicks WhatsApp reminder link → pre-filled booking)
- Marketplace integrations (later)

### 2.2 Booking form data

- Customer + vehicle (auto-loaded from customer account)
- Service type: periodic maintenance / complaint-driven / recall / accident / body shop / PPI
- Concerns (free text + optional pre-set complaint tags: brake noise, AC weak, warning light, etc.)
- Preferred date/time window; preferred outlet
- Drop-off mode: self drop, pickup-drop service (fleet), chauffeur pickup
- Courtesy car needed (if eligible)
- Estimated budget (optional — helps SA frame the estimate)

### 2.3 Slot availability engine

- Slot inventory per bay per technician per day
- Booking consumes slot based on estimated job duration from job-code library
- Overbooking protection: new booking blocked if bay utilization already > 95% for window
- Reserved slots for same-day/walk-in (typically 20–30% of capacity)

### 2.4 Confirmation and pre-arrival

- Booking confirmation via WhatsApp with slot, outlet address, estimated duration
- Pre-arrival checklist sent 24h prior: documents needed, fuel level recommendation, personal items reminder
- Reschedule / cancel link (with reason capture)

---

## 3. Service Advisor console

The **Customer 360** is the single screen an SA uses to start any visit. From one customer lookup, the SA sees:

- All vehicles owned / serviced by this customer
- Full service history per vehicle (RO timeline with summaries)
- Open recalls (OEM-published recalls matched against VIN)
- Warranty status (in-house + OEM, with remaining months/km)
- AMC / prepaid service contract balance (if applicable)
- Outstanding AR (if customer owes anything)
- Prior notes from SAs (non-financial, CX-relevant — e.g., "prefers morning pickup", "allergic to strong detailers")
- Preferred technician (if customer requested continuity)
- NPS score from last visit

The 360 is read-only here; all actions (create RO, add note, take payment) happen in downstream screens.

---

## 4. Vehicle Health Check (VHC) — the upsell engine

### 4.1 What it is

A **40-point multi-point inspection done on every service visit**, regardless of what the customer brought the car in for. Traffic-light report (Red / Amber / Green per item) delivered to customer on WhatsApp with photos and short video evidence.

### 4.2 Why it matters

VHC is the single highest-leverage service workflow. Industry data shows 20–40% of service revenue uplift comes from VHC-driven additional work, because:

1. Customer doesn't know there's a brake pad wear issue until the VHC surfaces it
2. Photo/video evidence converts customer trust into authorization
3. WhatsApp-delivered report gets same-day response; phone-follow-up has much lower conversion

### 4.3 Workflow

1. Car enters bay; technician opens VHC in the workshop app
2. Works through 40 points (brake pads, tire wear, fluid levels, belts, lights, suspension bushings, underbody corrosion, battery load test, etc.)
3. Each item: Red / Amber / Green; photo mandatory for Red, optional for Amber, not required for Green
4. Optional short video (30s) for complex findings (e.g., "watch this wobble at 60 km/h" — done on road test)
5. Tech submits; SA reviews; SA generates WhatsApp report with recommended line items and estimates
6. Customer sees report in WhatsApp with inline photos; approval buttons for each recommended item (approve / decline / call me)
7. Approved items flow into the RO as additional work (see §5)

### 4.4 Template management

- Different VHC templates per vehicle class (sedan, SUV, sports, EV)
- Admin-editable; version-controlled (active version stamped on each completed VHC)

---

## 5. Repair Order (RO) lifecycle

### 5.1 The 3C model

Every RO line item has three fields:

- **Complaint** — what the customer reported ("engine rough at idle")
- **Cause** — what the diagnosis found ("coil pack #3 failure, P0303 misfire")
- **Correction** — what was done ("replaced coil pack, cleared codes, road-tested")

This structure is OEM-industry standard, warranty-auditable, and forces technicians to document diagnosis rather than just action.

### 5.2 RO state machine

```
Created → Awaiting Estimate Approval → Scheduled → 
  In-Progress → (Additional Work Requested → Approved) → 
  QC → Ready for Delivery → Delivered → Invoiced
```

Branches:
- **Rework** — after delivery, if customer returns with same complaint, RO reopens as rework (tracked for QC analytics; reworks are technician-performance indicator)
- **Cancellation** — at any pre-In-Progress state, cancellable with reason
- **Hold** — awaiting part availability; time stops on SLA clock

### 5.3 Estimate generation and approval

- Estimate built from job-code library (labor hours × labor rate) + parts (current price) + consumables
- Margin-scheme-aware GST (parts typically 28% IGST/CGST+SGST; labor 18%)
- Sent to customer via WhatsApp with itemized breakdown
- Customer approves via **OTP + link click**; legally defensible audit trail
- Approval creates binding commitment; changes require new approval

### 5.4 Additional work mid-job

Very common in service: car comes in for brake service, tech discovers leaking steering rack. Workflow:
- Tech flags finding in RO with photo
- SA reviews, converts to customer-facing recommendation
- WhatsApp button approval: Approve / Decline / Call me
- On approval, added to RO; bay time re-estimated; customer notified of new completion time

### 5.5 Bay and technician assignment

Assignment engine considers:
- Technician skill profile (engine, electrical, body, detailing, EV)
- **Brand certification** (BMW STAR, Audi Academy, Porsche PIWIS, Bosch ECS, OEM-specific programs) — certain jobs (emissions, ADAS, airbag, warranty) can only be done by certified techs
- Tool availability (ADAS calibration rig, ISTA/ODIS/PIWIS terminal, alignment machine)
- Bay availability with right lift capacity and tooling
- Current workload (balance across techs)

Violation attempt (e.g., non-certified tech on emissions job) returns a blocking error with explanation.

### 5.6 Technician clock-in and time tracking

- Tech clocks in on RO when starting, out when finishing
- Pauses (parts wait, coffee, break) tracked but not billed
- Labor time used for: warranty claim substantiation, productivity analytics, flat-rate vs actual comparison

### 5.7 Road test checklist and QC gate

Before `Ready for Delivery`, required:
- Road test form (for relevant jobs): duration, KM, observations, warning lights status
- QC walkaround (different tech from one who did the job): no fluid leaks, panels aligned, electronics functional
- Wash / detail status
- Interior cleanliness check
- Customer's stuff preserved (phone holder, sunglasses, invoices — anything found inside car tagged and retained)

---

## 6. Parts inventory and supply chain

### 6.1 Parts master

- OEM part number (primary key)
- Supersession chain — part A replaced by B replaced by C; DMS auto-suggests current version
- Aftermarket cross-references (with brand: Bosch, Mahle, Sachs, etc.)
- Brand, category (mechanical, electrical, trim, consumable), UoM
- Criticality (routine / common / critical / safety)
- Storage location (rack / bin)
- Handling notes (ESD-sensitive, hazardous fluids, temperature)

### 6.2 Multi-location stock

- Per-outlet stock levels
- Min-max configured per outlet per part
- ABC classification (by movement value) — A = top 10% by value, stricter control
- VED classification (Vital / Essential / Desirable) — Vital items never stock out
- Stock transfer workflow between outlets
- Reorder suggestion engine (daily run; manager approves suggested POs)

### 6.3 Goods Receipt Note (GRN)

- 3-way match: PO ↔ receipt ↔ invoice
- Quantity and quality check at receipt; discrepancy workflow
- Batch/serial tracking for **safety-critical parts** (airbags, ECUs, seatbelt pre-tensioners, high-voltage EV components)
- Landed cost computed on receipt — includes customs (for imports), freight, handling, customs broker fees
- GST input credit claimed at receipt for parts where scheme permits

### 6.4 Imports workflow

For CBU / CKD parts from EU OEM distributors:
- PO raised on OEM distributor (e.g., BMW India, Audi India, Porsche India parts distributor)
- Import documents: commercial invoice, packing list, AWB/BL, BoE (Bill of Entry)
- Customs clearance tracking (dates, duty paid)
- **Landed cost** = purchase + freight + insurance + customs duty + IGST + clearing/forwarding + misc
- Received into specific bin; visible to service techs

### 6.5 Parts requisition from RO

- Tech raises requisition from RO screen
- Stores picks, issues against VIN + RO
- Unused parts return workflow: return window (typically 24h) with re-stocking
- Back-order handling: if part not in local stock, check other outlets; if none, raise PO with promise date; RO state shifts to `Hold (Awaiting Part)`

---

## 7. Warranty

### 7.1 In-house dealer warranty

For cars sold with our CPO program, we (the dealer) are the underwriter. Design elements:
- **Coverage matrix** — what components are covered, what are excluded, per-program (Luxury / Standard)
- **Claim workflow** — customer reports issue → SA opens RO → warranty flag applied → repair done → claim processed against reserve fund
- **Reserve fund accounting** — a portion of sale price is accrued as warranty reserve (actuarial model; start with 1.5–3% of sale price; refine with claims data)
- **Claim audit** — every warranty claim retains 3C documentation + photos for audit; finance reviews monthly

### 7.2 OEM warranty (when still active)

When we sell a car that still has OEM warranty remaining, we record it and file claims against OEM:
- OEM warranty master data per VIN: start date, end date, KM limit, coverage type
- Claim filing — OEM-specific portals / email workflows (manual v1; automation v2 where APIs exist)
- Approval tracking with SLA timer
- Reimbursement audit trail: claim filed → OEM response → OEM reimbursement → finance booking

### 7.3 Extended warranty (v1.5)

Integration with providers: OneAssist, Dr. Warranty, or OEM extended programs. Workflow same as OEM warranty but with provider-specific claim portals.

---

## 8. Technician certification and tooling

### 8.1 Technician profile

Each tech has:
- Personal details, employee ID
- Skill profile (breadth + depth per zone)
- **Certifications** with expiry dates:
  - BMW STAR program (levels: Apprentice → Senior → Master)
  - Audi Academy (variant equivalents)
  - Porsche PIWIS-certified tech
  - Bosch ECS (emissions) — independent tool certification
  - ASE (optional, US/international)
- Training history (courses, dates, outcomes)
- Performance metrics (productivity, rework rate, customer NPS)

Certification expiry triggers alerts 90/60/30 days before expiry. Assignment engine refuses brand-locked jobs to expired certs.

### 8.2 Diagnostic tool licensing

Per-terminal licenses, significant opex item:
- **BMW ISTA** — ~€3–5K/year/terminal
- **Audi/VW ODIS** — similar range
- **Porsche PIWIS 3** — ~€10K/year/terminal (hardware included)
- **Bosch ECS / Launch / Autel** — multi-brand fallback tools

DMS tracks:
- License holder, expiry date, terminal serial number
- Renewal workflow (alerts 90/60/30 days out)
- Utilization (which RO used which terminal — useful for ROI analysis when deciding to add a 2nd terminal)

### 8.3 Special tools register

- Torque wrenches with calibration schedule (typically annual)
- Alignment rigs
- ADAS calibration kit (increasingly mandatory for post-collision and windshield replacement jobs)
- EV battery safety gear (insulated tools, PPE, fire suppression)
- Timing tools (brand-specific)

Each tool has: location, calibration due date, calibration certificate on file, responsible technician.

---

## 9. Recall management (v1.5)

- Pull OEM recall database periodically (manual CSV upload v1.5; API v2 where OEM allows)
- Match recalls against VINs in our customer base (sold by us + serviced by us)
- Surface matched recalls in customer 360 and customer portal
- Proactive outreach: WhatsApp + email to affected customers with booking link
- Claim reimbursement workflow via OEM

---

## 10. Pre-Purchase Inspection (PPI) — revenue line (v1.5)

Third party (not our customer) brings a car they're considering buying; we inspect it for a fee.

- Booking flow (online or phone)
- Distinct inspection template (simpler than CPO; focused on go/no-go decision, not certification)
- PDF report delivered to requesting party
- No warranty implication (we're not certifying the car)
- Pricing: fixed fee per inspection, tiered by brand/class

Revenue line tracked separately in P&L.

---

## 11. Courtesy car fleet (v1.5)

- Fleet of loaner vehicles (typically 5–10 for a luxury pre-owned shop)
- Pool view: which cars free, which out, expected return
- Assignment workflow: tied to a specific RO; driver named, KM and fuel level at handover
- Return workflow: KM, fuel, damage check, photos
- Insurance rider tracking (commercial loaner policy)
- Utilization reporting

---

## 12. Body shop workflow (v1.5, scope-dependent)

If body shop is in scope:
- Accident intake workflow with police report upload, photos, insurance info
- Insurance claim coordination (surveyor appointment, estimate approval)
- Dual-sign-off on estimate (body shop manager + insurance surveyor)
- Extended RO timeline; hold states for insurance approval, parts order
- Panel-by-panel labor tracking
- Paint booth scheduling
- Post-repair QC with photos for customer + insurance

---

## 13. Post-service follow-up

- Post-service NPS sent 24–48h after delivery via WhatsApp
- Attribution: NPS tied to SA, technician, outlet
- Feedback loop: low NPS triggers SA follow-up + optional manager escalation
- Review solicitation: high NPS customers nudged to leave Google / brand-site review

---

## 14. Reporting

- Bay utilization by outlet
- Technician productivity (earned vs actual hours)
- First-time fix rate (tracked via rework frequency)
- Revenue per RO, average ticket size
- VHC conversion rate (recommendations → approvals)
- Additional-work conversion rate
- Warranty claim frequency + cost per VIN model
- Parts stock turnover
- Back-order frequency (supply chain issue indicator)
- Customer retention rate (did they come back for next service?)
- NPS by SA, tech, outlet
- Recall coverage (notified vs scheduled vs completed)

---

## 15. Integration points

- WhatsApp BSP (primary channel for all customer service comms)
- Razorpay (service invoice payment)
- IRP (e-invoicing for service invoices)
- Tally (daily service revenue, parts COGS, warranty accrual)
- OEM warranty portals (manual workflows v1)
- OEM parts distributor systems (PO / order status — manual v1)
- Recall databases (CSV import v1.5)
- ADAS/calibration tool APIs (where OEM exposes)
- SMS via MSG91 (DLT-registered) — fallback for customers without WhatsApp
- Email via SES/SendGrid — records channel

---

## 16. Open decisions affecting this vertical

See Doc 08 for the full list; service-specific blockers:

1. Body shop in scope v1 or v1.5?
2. Courtesy car fleet size and capex plan
3. Tool licensing budget per outlet (which brands, how many terminals)
4. Technician certification roster needed at go-live (which brands require certified tech presence from day one)
5. Extended warranty provider partnership
6. AMC / prepaid service contract product design
