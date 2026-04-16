# 04 · Sales & Inventory (Pre-Owned)

Functional blueprint for how cars enter, move through, and leave the business. This is the financial spine of the DMS — every unit is a distinct asset with its own P&L, and every workflow below either affects a VIN's landed cost or its gross margin.

---

## 1. Guiding principles

1. **Per-VIN, not per-SKU.** Each pre-owned unit is unique: different history, different refurb cost, different holding days, different margin. Retail DMS assumptions (FIFO, average cost, reorder points) do not apply. The entire sales and inventory module is built on a per-VIN cost ledger.
2. **Landed cost is sacred.** Acquisition + transport + refurb + overhead allocation + holding cost = landed cost. This number must be computed continuously, not at sale. Sales managers see it in real time; they price off floor-landed + margin target.
3. **Certification is the product.** For a luxury pre-owned business, the CPO certification is the trust anchor that justifies price premium. Treat the 180–220 point inspection as a first-class workflow with its own UI, evidence capture, approval chain, and public verification surface.
4. **Margin-scheme GST is a system property.** Every quote, invoice, and P&L report must handle the margin scheme correctly from day one. This is not an accounting afterthought. (Full treatment in Doc 06.)
5. **Reserve/hold/sold state machine is multi-outlet-aware.** A car in Mumbai can be reserved by a Bangalore sales exec; logistics, GST implications (inter-state supply), and commissions must all handle this cleanly.

---

## 2. Acquisition pipeline

### 2.1 Sources

- **Direct inbound** — "Sell Your Car" form on website, WhatsApp lead, phone call, walk-in
- **Trade-in** — customer buying from us brings a trade-in
- **Corporate fleet / lease returns** — bulk intake from fleet operators
- **Auction** — IBB Salvex, OEM wholesale auctions (manual upload v1; API if provider exposes)
- **Consignment** — owner retains title, we market for a fee (scope decision — see Doc 08)

### 2.2 Lead intake (v1.0)

Seller submits vehicle details: make, model, year, variant, KM, color, ownership count, RC soft copy upload, optional photos. System:

1. Validates RC via image OCR (manual review cycle acceptable in v1)
2. Fetches indicative valuation from **OrangeBookValue (OBV) API** — India's de facto used-car pricing reference
3. Shows seller an indicative price range (not a commitment)
4. Books inspection slot at nearest outlet (or chauffeur-pickup if v1.5+)
5. Creates acquisition lead with status `Submitted → Inspection Scheduled → Inspected → Offer Sent → Offer Accepted → Inspection Payment → RC Transfer → Inventory`

### 2.3 Inspection (acquisition-side)

Distinct from CPO certification (see §4). This is a shorter **condition assessment** (40–60 points) done by an inspector to decide whether and at what price to buy.

- Inspector tablet app (offline-capable; same app as CPO inspection, different template)
- Photo per major zone (exterior, interior, engine bay, boot, undercarriage), plus evidence on any declared damage
- OBD scan captured (fault codes), odometer verified against RC and service records
- Accident / flood / major repair flags
- Recommended buy-price range computed from OBV baseline − condition deductions

### 2.4 Offer workflow

- Offer draft by inspector → reviewed by procurement manager → sent to seller via WhatsApp + email
- Negotiation log captured (each counter-offer as an event with user + timestamp + amount)
- On acceptance: collect **token** via Razorpay link (typically 5–10% of agreed price) to lock deal
- Final payment scheduled post-RC transfer verification

### 2.5 RC transfer (v1.0 manual workflow)

Because VAHAN API integration is deferred, RC transfer is a **tracked manual workflow**:
- Seller submits original RC, NOC (if financed), Form 29/30, insurance transfer docs
- Dealer RTO agent files transfer at seller's RTO
- System tracks stages: `Docs Collected → Submitted to RTO → Ownership Transferred → RC Received`
- SLA alert if any stage exceeds configured threshold (typically 14–21 days)
- Seller final payment released only on `RC Received`

### 2.6 Consignment variant (v1.5, scope-dependent)

If consignment is confirmed:
- No acquisition payment; owner agreement signed instead
- Separate title status `Consignment` vs `Owned`
- Marketing fee tier configured (typically 7–15% of sale price)
- Escrow flow on sale: buyer pays us → we deduct fee + reimbursables → remit balance to consignor
- GST treatment differs from margin scheme — requires tax counsel sign-off (see Doc 06 and 08)

---

## 3. Refurbishment pipeline

### 3.1 Intake and cost ceiling

On arrival at workshop, each VIN gets a **refurb plan**:
- Technician walks the car with service advisor and procurement manager
- Line items added: mechanical (engine, suspension, brakes), electrical/electronics, bodywork, detailing, consumables (tires, battery, fluids)
- Each line item estimated (labor hours + parts cost)
- **Cost ceiling** set per car (typically 5–10% of expected sale price) — overrun requires procurement manager approval

### 3.2 Workshop handoff

- Refurb RO created (distinct from customer service RO; same engine, different type)
- Tech assignments driven by brand certification gating (see Doc 05)
- Parts requisitioned against VIN (moves parts cost into the VIN cost ledger, not into service revenue)
- Bodywork and paint routed to in-house body shop or approved partner (partner flag on line item)

### 3.3 Ready-for-sale gate

Before a car can be listed publicly, it must pass:
1. All refurb line items `Complete` or `Waived (with note)`
2. CPO certification (§4) `Approved` with certificate PDF generated
3. Professional photography session logged (8–12 exterior + 4–6 interior + 360° + optional video)
4. Listing copy written (model, variant, USPs, provenance notes, standout features)
5. Pricing set by sales manager (§5)
6. Listing Manager approval click

System enforces this gate; a car cannot transition from `Refurb Complete` to `Listed` without all six.

---

## 4. CPO Certification — the 180–220 point inspection

### 4.1 Why this is its own module

This is the inspection that the customer sees. It anchors warranty coverage, price premium, and trust. Mixing it with acquisition-side inspection (§2.3) or service VHC (Doc 05) breaks the data model and the customer promise.

### 4.2 Inspector tablet app

- **Offline-capable** — inspectors work in outdoor yards / basement parking with patchy connectivity
- **Template-driven** — admin can edit the inspection template per program (e.g., "Brand Assured Luxury" vs "Brand Assured Standard")
- **180–220 checkpoints** across: exterior body, paint, wheels/tires, lights, glass, interior trim, seats, electronics/infotainment, HVAC, engine, transmission, suspension, brakes, exhaust/emissions, ADAS, under-chassis, fluids, documents
- Each checkpoint: **Pass / Fail / Note**, mandatory photo for fail, optional photo for pass, free-text note
- Structured findings: severity (cosmetic / functional / safety), recommended action, estimated repair cost
- Digital signature by inspector at end
- Sync to server on network availability; conflict-free replicated data structure

### 4.3 Certificate generation

- On `Approved` status, system auto-generates PDF:
  - Cover page: car photo, VIN, make/model/year, certification program name, date, validity
  - Summary page: aggregate scores by zone, any noted items with explanations
  - Full checklist with pass/fail + key photos embedded
  - Warranty coverage page (if any)
  - Inspector name + signature, countersigning manager
  - **QR code linking to public verification page** — `dealer.com/verify/{cert-id}` showing the same certificate without requiring login
- Certificate revision history tracked (if re-inspected after rework)

### 4.4 Warranty coupling

Each program has a warranty policy attached (term, powertrain coverage, comprehensive cover, transferability). On sale, warranty is linked to customer + VIN, starts from delivery date. See Doc 05 for warranty lifecycle.

---

## 5. Pricing engine

### 5.1 Landed cost computation (continuous)

```
landed_cost(VIN) =
    acquisition_cost
  + transport_cost
  + refurb_cost (sum of approved line items)
  + certification_cost (fixed program fee)
  + allocated_overhead (daily rate × days held)
  + holding_cost (working-capital interest × days held)
```

All five components update in real time. Displayed on every relevant screen for sales-authorized roles.

### 5.2 Floor and list price

- **Floor price** = landed cost + configured buffer (typically 2–4% to cover sale-side expenses)
- **List price** = floor price + target margin (typically 6–10% for luxury pre-owned; tune per brand/segment)
- **Minimum discount** = list → floor headroom; sales exec sees it on the negotiation screen
- Discretionary discount below floor requires **Sales Manager override** with reason code

### 5.3 Stale-stock auto-price-drop

Configurable rules per segment:
- Day 30: suggest 1.5% price drop (manager approval required)
- Day 45: suggest 3% drop + flag for inter-outlet transfer
- Day 60: flag for auction/wholesale
- Day 90: mandatory re-appraisal + executive review

Rules run nightly; sales manager sees a queue of recommended actions rather than automated drops (luxury segment prefers manager discretion over automation).

### 5.4 Competitor price monitoring (v1.5)

- Scheduled scraping of CarWale, CarDekho, Spinny for same make/model/year/variant/km-band
- Dashboard shows competitor median, our list, and delta
- Alert when our listing is > 5% above segment median for 7+ days

---

## 6. Listing and multi-outlet visibility

### 6.1 Listing states

```
Acquired → In Refurb → Certified → Ready → Listed → 
  (Reserved | Hold | Sold) → Delivered → Delivered+Handover
```

Every transition is audit-logged with user, timestamp, and (where applicable) reason.

### 6.2 Inter-outlet transfer

- Any outlet can see inventory of any other outlet (with permission)
- Sales exec can reserve a car at another outlet for their customer
- System creates a transfer task: logistics coordinator arranges movement, updates ETA
- GST inter-state-supply flag auto-applied if source and destination are different states (IGST, not CGST+SGST)
- Transfer cost adds to landed cost of that VIN

### 6.3 Reserve / hold / sold state machine

- **Reserve** — car held for a specific lead; 24–72 hour default TTL; extendable with manager approval
- **Hold** — car held off-market for internal reasons (reinspection, dispute, photography); invisible to storefront
- **Sold** — final; invoice generated; triggers commission accrual

State transitions are single-writer; optimistic locking prevents two execs reserving the same VIN simultaneously.

---

## 7. Sales CRM

### 7.1 Lead capture

Sources (all ingested into a single lead queue with source tag):
- Website forms (Book Test Drive, Request Callback, Trade-in, Sell Your Car, VDP contact)
- WhatsApp inbound (BSP webhook → lead)
- Phone call (call-center agent logs as lead)
- Walk-in (receptionist creates in kiosk or tablet)
- Referral (existing customer, with referral-program credit attached — see Doc 03)
- Lead aggregators: CarWale, CarDekho feeds (one-way inbound v1)
- Corporate referrals / partnerships

### 7.2 Lead routing

Configurable strategy per outlet:
- **Round-robin** within outlet among active sales execs
- **Brand-specialist** — BMW leads to BMW-trained execs
- **Budget-tier** — above ₹75L routes to senior execs
- **Skill-based** — language match for regional-language buyers
- **Location-based** — nearest outlet to customer pincode

Fallback: if no exec available within SLA (default 15 min for hot leads), auto-escalate to sales manager.

### 7.3 Deal pipeline (8-stage)

1. **New** — fresh lead, awaiting first contact
2. **Qualified** — exec has spoken with lead, budget + interest confirmed
3. **Test Drive** — test drive scheduled or completed
4. **Negotiation** — price discussion in progress
5. **Token** — booking amount received (at least ₹25K typically, via Razorpay/UPI)
6. **Paperwork** — KYC, finance sanction, insurance, RTO prep
7. **Delivery** — scheduled delivery window
8. **Delivered** — customer has taken possession, handover checklist signed

Each stage has required activities, SLA timers, and exit criteria. Stage-skipping requires override + reason.

### 7.4 Test drive management

- DL verification: photo upload + DigiLocker pull (optional) + manual verification by exec
- **Insurance rider** attached — dealership's commercial policy covers demo drives; rider activation logged per drive
- Return condition checklist: fuel level, damage, odometer, photos
- Chauffeur-at-home test drive (v1.5) adds pickup/drop scheduling and route tracking

### 7.5 Quote & invoice generation

A quote on a VIN for a customer produces a line-item breakdown that is **margin-scheme-aware**:

```
Ex-showroom price (list or negotiated)
  + Accessories
  + Extended warranty (if opted)
  + Insurance premium (if we originate the policy)
  + RTO + Road Tax (state-specific)
  + GST on margin [(sale_price − landed_cost) × 18% or 12%]
  + TCS 1% (if sale > ₹10L)
  − Trade-in allowance (if any)
  − Loyalty / referral discount (if any)
  = On-road price
```

GST shown as a distinct line with a footnote explaining margin-scheme treatment — buyers should not be confused into thinking 18% is applied on the full price. This is a disclosure feature (differentiator) and a legal-correctness requirement simultaneously.

Quotes are versioned (each revision is a new version with parent reference). Customer sees the current version; audit trail shows all.

### 7.6 Commission engine

- **Per-deal base commission** — % of gross margin or flat ₹ per unit, configured per role
- **Slab bonuses** — hit X units in a month → bonus tier; hit Y gross margin → bonus tier
- **Clawback** — if deal is canceled or unwound within N days, commission is reversed
- **Accrual in real-time** — sales exec sees live "earned this month" dashboard; accounts sees monthly payout total
- **Split-commission** — if two execs worked a lead (e.g., lead gen exec + closing exec), split configured per deal

### 7.7 Finance partner integration (v1 light, v1.5 fuller)

- v1.0: present list of partner NBFCs/banks with contact form; finance exec reaches out to partner, manually updates sanction status
- v1.5: soft-pull pre-approval with 1–2 partners (recommended HDFC and Bajaj Finserv for volume + luxury-friendly NBFC)
- v2+: multi-partner aggregation with parallel soft-pulls and side-by-side rate comparison

### 7.8 Delivery handover

Required checklist before `Delivered`:
- All documents: RC transfer complete, insurance policy copy, warranty card, owner's manual, service book
- Keys count (primary + spare), remote fobs
- All accessories mentioned in invoice
- Fuel level as agreed
- Demo of key features (infotainment, ADAS, connected services)
- Customer signature on handover form
- Group photo with customer (optional, for social content with consent)
- Handover kit: welcome booklet, service schedule card, contact card for SA

---

## 8. Reporting

Standard reports (built in; accessible per role):

- **Inventory aging** — days on lot, by outlet, by brand, by price band
- **Days-to-sell** — distribution; p50, p90 benchmarks
- **Gross margin per VIN** — realized margin vs target; outliers
- **Margin by brand / age / price tier** — portfolio view
- **Salesperson performance** — leads, conversions, avg margin, cycle time
- **Source attribution** — lead source → conversion → ROI per source
- **Reserve → sale conversion** — how many reservations close vs expire
- **Stale stock aging buckets** — 0–30, 30–60, 60–90, 90+
- **Inter-outlet transfer efficacy** — does a transfer actually sell the car?
- **Quote-to-close rate** — quotes sent, closed, avg revision count
- **Commission accrual vs payout reconciliation**

---

## 9. Integration points

- **OBV API** — acquisition valuation (Orange Book Value)
- **Razorpay** — token, final payment
- **WhatsApp BSP** — all customer comms (offer, test drive, reminders, handover prep)
- **DigiLocker** — DL / RC / PAN pull with consent
- **IRP (e-invoicing)** — invoice generation with IRN + QR
- **Tally** — daily sync of sales, margin, commission accruals
- **OEM warranty portals** (where applicable) — when we sell a car still under OEM warranty, we record coverage; no API integration required, just data capture

---

## 10. Open decisions affecting this vertical

See Doc 08 for full list; sales & inventory-specific blockers:

1. Consignment in scope or not — large surface-area implication
2. VAHAN integration now or later — v1 assumes manual RC tracking
3. Finance partner list for v1 — drives UI complexity
4. Target ASP and margin — drives pricing engine sophistication
5. Body-shop in-house or partner — affects refurb pipeline routing
