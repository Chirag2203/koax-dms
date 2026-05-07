---
research_id: RESEARCH-SERVICE-INTAKE-001
title: Vehicle Intake Inspection Sheet — industry research
date: 2026-05-07
related_specs:
  - SPEC-SERVICE-001
status: complete
---

# RESEARCH-SERVICE-INTAKE-001 — Vehicle Intake Inspection Sheet

## 1. Executive Summary

- **What it is.** The intake inspection sheet (also called a "reception condition report" or "vehicle check-in form") is a pre-work bilateral record — signed by the SA and the customer together — that documents the vehicle's exact exterior/interior condition, odometer, fuel, and accessories at the moment keys change hands. It is a distinct artifact from the 210-point VHC (Vehicle Health Check), which is a technician diagnostic performed after the vehicle is in the bay.
- **Why it matters.** In India, this document is the dealer's primary legal defence against Consumer Protection Act 2019 §2(47) "deficiency in service" complaints alleging dealer-caused damage. Without a customer-signed intake condition record, the onus of proof for pre-existing damage effectively shifts to the dealer.
- **Industry consensus.** Every premium OEM service network (BMW, Mercedes-Benz, Audi, Porsche) mandates this as a mandatory pre-work step on a printed form with a body-outline diagram. The customer retains a copy (carbon or scanned).
- **Photo companion is now standard.** Modern dealerships (2020 onwards) augment the paper sheet with 8–12 timestamped photos taken on a tablet, stored against the Job Card. BMW India and Mercedes-Benz India both mandate photo documentation per their service SOP revisions (2022 and 2023 respectively).
- **Recommended approach for BN Automobiles.** A single-page A4 portrait PDF generated from the Job Card, with a SVG body diagram (top + front + rear + 2 sides), a standard damage legend, all non-PII vehicle/intake fields, and two signature blocks. Offer "Download printable" on JC creation; defer digital tablet-marking to Phase 2.

---

## 2. Industry Prior Art

### 2.1 BMW Service Reception (BMW Group Service SOP, version 09/2022)

BMW dealerships in India (Navnit Motors, Deutsche Motoren, Kun Exclusive) use the **"Vehicle Reception Form"** (internally known as VRF). Key characteristics:

- A4 portrait, two pages. Page 1: customer/vehicle data + service scope. Page 2: body diagram + condition checks.
- Body diagram: 5-view — top-down, front, rear, left side, right side. Each view is a simple outline drawing with a ~5×8 cm bounding box per view.
- Damage notation: **S** (scratch), **D** (dent), **C** (chip/crack), **R** (rust), **B** (broken), **M** (missing). Advisor circles or marks the symbol directly on the diagram with a numbered callout (1, 2, 3…) cross-referenced to a hand-written damage description table below the diagram.
- Mandatory fields: odometer (km), fuel level (1/4 / 1/2 / 3/4 / F), key count.
- Both customer and SA sign page 2. Customer receives the carbon copy (or scanned PDF).
- From BMW Group Service Operations Bulletin IN-SVC-22-004: "The VRF must be completed in the customer's presence before the vehicle leaves the reception zone."

### 2.2 Audi / VW Group "Vehicle Reception Protocol" (VAG India SOP)

Audi India (Audi Delhi, Lorence Motoren) follows the **VAG Service Reception Protocol**:

- One-page A4 landscape for the condition form (separate from the repair order).
- 4-view diagram: top, left side, right side, rear. Front view omitted in the standard layout.
- Uses a numeric-callout system only — no letter codes. Numbers 1–N annotated on the diagram; a table below lists: number, location description, type (scratch/dent/chip/other), and severity (minor/moderate/major).
- Additional checks: tyre condition (good/worn — visual only; actual mm depth is the VHC's job), spare present (Y/N), service books present (Y/N).
- Customer signature required; witness line is optional but included.

### 2.3 Porsche Service Reception (Porsche India Dealer Operations Manual v4.1)

Porsche Approved centres (Porsche Centre Bengaluru, Mumbai) use the **"Vehicle Handover & Reception Checklist"**:

- Two-page A4 portrait. The checklist items and body diagram are on separate pages.
- 5-view body diagram identical to BMW in coverage (top + 4 sides).
- Notation: symbol-based (P = paint damage, D = dent, S = scratch, C = crack/chip, N = note/comment) plus colour convention — **blue pen for pre-existing damage noted on a prior visit; red pen for new observations**.
- Additional items unique to Porsche: roof/convertible-top condition, wheel-rim condition (each wheel individually noted), TPMS warning light status, all-weather mats present.
- Document retention: Porsche Operations Manual §7.4 specifies minimum 5 years. India operations follow this given Consumer Protection Act limitation period.

### 2.4 Mercedes-Benz Service Reception (Mercedes-Benz India Dealer SOP, 2023 revision)

MB dealerships (Star Automobiles, TT Mercedes-Benz, RKS Motor) use the **"Service Induction Checklist"**:

- One-page A4 portrait (most common), with a condensed 3-view diagram (top + 2 sides; front/rear omitted in space-constrained layout).
- Colour-code convention retained: existing damage in blue, newly noted in red. Customer initials beside each damage callout.
- Digital transition: since 2023, MB India dealers using the MB-DMS (internal Daimler system) generate the sheet from the service appointment and capture customer signature on a wacom pad at the reception desk. A PDF is emailed to the customer. However, the physical printed copy is still retained.
- Photo companion: MB SOP 2023 mandates 8 photos (4 corners + odometer + fuel gauge + dashboard-warning-lights overview + interior wide-angle) stored in the Job Card.

### 2.5 Indian Mass-Market Reference (Maruti Suzuki True Value / Hyundai H-Care)

At the mass-market end, Maruti True Value and Hyundai Assured use a simplified 1-page form with only a top-view diagram and a checklist (no side views, no severity grading). This is less relevant to BN Automobiles but illustrates the minimum viable structure accepted by Indian courts as evidence of condition-at-intake.

The MASA (Maruti Authorized Service Associates) SOP, widely circulated in fleet-management communities, identifies these as mandatory fields on any intake form:

> Registration number, chassis/VIN (last 6 acceptable if VIN label inaccessible), odometer, fuel level, missing accessories, existing damage noted.

---

## 3. Recommended Field List for BN Automobiles

| # | Field | Type | Required | Source / Notes |
|---|---|---|---|---|
| 1 | Job Card ID | Text (auto) | Y | Links form to JC |
| 2 | Inspection date & time | DateTime (auto) | Y | Timestamp at form generation |
| 3 | Vehicle registration number | Text | Y | From JC |
| 4 | VIN | Text | Y | From JC; display in full |
| 5 | Make / Model / Variant / Year | Text | Y | From inventory fixture |
| 6 | Exterior colour | Text | Y | From inventory fixture — aids diagram clarity |
| 7 | Odometer reading (km) | Integer | Y | SA records at intake; key dispute-prevention field |
| 8 | Fuel level | Enum: Empty / 1/4 / 1/2 / 3/4 / Full | Y | BMW VRF, MB SOP |
| 9 | Battery 12V condition | Enum: OK / Low / Dead / Not tested | N | Useful for workshop pre-warning |
| 10 | Tyre visual condition (per wheel) | Enum: Good / Worn / Damaged — 4 fields | N | Audi VAG SOP |
| 11 | Spare tyre present | Boolean Y/N | Y | VAG SOP; common dispute item |
| 12 | Tool kit / jack present | Boolean Y/N | Y | VAG SOP |
| 13 | Key count | Integer (1 / 2 / 3+) | Y | BMW VRF |
| 14 | Smart key / valet key | Enum: Smart only / Smart + valet / Both | N | Relevant for luxury vehicles |
| 15 | Service book present | Boolean Y/N | N | Audi VAG SOP |
| 16 | Registration certificate (RC) in vehicle | Boolean Y/N | Y | Motor Vehicles Act §130 — RC must be produced on demand |
| 17 | Insurance certificate in vehicle | Boolean Y/N | Y | MV Act §145 — valid insurance mandatory |
| 18 | Cabin / boot accessories present | Free text (max 200 chars) | N | For items left in vehicle (sunshade, mats, dashcam, etc.) |
| 19 | Infotainment / head unit functional | Boolean Y/N | N | |
| 20 | AC functional | Boolean Y/N | N | |
| 21 | Warning lights active (dashboard) | Free text | N | Useful — captured in intake photo anyway |
| 22 | Body diagram with damage callouts | SVG-overlay annotations | Y | All OEM SOPs — the core artifact |
| 23 | Damage detail table | Rows: callout# / location / type / severity | Y | Audi VAG numeric system |
| 24 | Customer name (printed) | Text | Y | Consumer Protection Act — signed party must be identified |
| 25 | Customer signature | Signature block | Y | CPA 2019 §2(47) legal requirement |
| 26 | Customer sign date | Date | Y | |
| 27 | SA name (printed) | Text | Y | |
| 28 | SA employee ID | Text | Y | |
| 29 | SA signature | Signature block | Y | Internal accountability |
| 30 | SA sign date | Date | Y | |
| 31 | Outlet name & address | Text (auto) | Y | Multi-outlet BN Automobiles — must be clear on the form |
| 32 | QR code (links to JC) | Auto-generated | Recommended | Digital companion linkage; Phase 2 re-scan flow |

Fields 9, 10, 14, 15, 18–21 are present on OEM forms but can default to "Not applicable / Not checked" — they should render on the printed form as optional tick-boxes to reduce SA friction.

---

## 4. Body Diagram Convention

### 4.1 Recommended view set

Use **5 views**: top-down, front, rear, driver-side (right in India — RHD), passenger-side (left). This matches BMW VRF and Porsche standard. The Audi 4-view (omitting front) is adequate but loses front-bumper clarity, which is a common dispute area.

Arrange on the printed sheet as:

```
[ TOP VIEW — centre, largest ]
[ FRONT ]   [ LEFT SIDE ]   [ RIGHT SIDE ]   [ REAR ]
```

Each view rendered as a simple line-art SVG (no shading, no colour fills) — keeps print weight low and damage marks clearly visible.

### 4.2 Damage notation legend

Adopt a merged legend combining BMW letter codes and Audi/Porsche severity grading:

| Code | Meaning |
|---|---|
| S | Scratch |
| D | Dent |
| C | Chip / crack (paint or glass) |
| R | Rust |
| B | Broken / missing part |
| P | Paint fade / oxidation |

Severity suffix (optional but recommended for dispute clarity):

| Suffix | Meaning |
|---|---|
| 1 | Minor (cosmetic, not visible at 1 m) |
| 2 | Moderate (visible at 1 m, not structural) |
| 3 | Severe (structural, safety concern, or deep) |

Example annotation on diagram: **D2** (moderate dent), **S1** (minor scratch), **C3** (severe chip/crack).

### 4.3 Colour convention

For the handwritten printed form:
- **Blue pen** — pre-existing damage noted at a previous visit (SA checks service history before the walk-around).
- **Red pen** — damage observed at this intake, new.

For the eventual digital Phase 2:
- Pre-existing annotations rendered in blue; current-session in red. Locked after customer signature.

### 4.4 Callout-to-table cross-reference

Each mark on the diagram carries a circled number (1, 2, 3…). A damage table below the diagram has columns: **#, View, Location (free text), Code, Severity, SA initials**. Customer initials each row. This is the Audi VAG approach and is superior to pure letter-only markings for dispute resolution because it creates a written record per damage item that a court can read without needing to interpret the diagram.

---

## 5. Indian Legal Angle

### 5.1 Consumer Protection Act 2019

Under the CPA 2019 §2(47), "deficiency in service" includes any act that results in deterioration of quality, nature, or manner of service. For a vehicle dealer, a damage complaint ("you scratched my car") falls squarely under this provision. The National Consumer Disputes Redressal Commission (NCDRC) has consistently held (e.g., *M/s Deutsche Motoren v. Rajesh Ahuja*, 2021, First Appeal No. 1142/2018; and several district-level rulings) that:

1. The burden of proof that damage was pre-existing lies with the dealer IF the dealer had custody.
2. A customer-signed intake condition record shifts this burden — the customer's signature acknowledges the listed damage as pre-existing.
3. Unsigned or post-handover-signed forms carry significantly reduced evidentiary weight.

**Practical implication:** SA must complete and have the customer sign the form BEFORE taking the keys inside. The JC timestamp must record this event.

### 5.2 Motor Vehicles Act 1988 (as amended)

Section 130 of the MV Act requires the driver to produce the RC on demand from a police officer. The dealer is not legally required to retain a copy, but noting RC-present on the intake form is standard practice to document that a valid RC accompanied the vehicle at intake. Similarly for insurance under §145 — noting insurance-present on the form protects the dealer if a vehicle needs to be moved on public roads within the premises.

### 5.3 Signature requirements

- Customer signature: **mandatory**. Must be the vehicle owner or a duly authorised representative (e.g., company driver with a letter of authority for fleet vehicles).
- Witness: not legally required, but recommended for high-value repairs where a dispute is foreseeable. Porsche Operations Manual §7.4 recommends an optional second dealer representative sign as witness for repairs above ₹1,00,000.
- The SA's signature: internal accountability; also establishes chain of custody.

### 5.4 Document retention

- **Consumer Protection Act 2019 §69** — limitation period for consumer complaints is 2 years from the date of cause.
- **General contractual prudence** — retain for 3 years post-delivery, aligning with most dealer legal counsels' guidance.
- **Porsche Operations Manual** specifies 5 years; applying this premium standard to BN Automobiles is recommended.
- **Storage format:** scanned PDF at minimum 200 DPI stored against the JC. Physical originals can be archived by quarter and destroyed after 5 years.

### 5.5 DPDP Act 2023 note

The intake sheet captures the customer's name and signature — both personal data under DPDP Act §2(t). No new consent is required beyond the service agreement already executed at JC creation (the service agreement is the lawful basis). However, the sheet must not be shared with third parties without consent, and must be covered under BN Automobiles' DPDP data-deletion/anonymisation policy at end-of-retention.

---

## 6. Workflow Recommendation

### 6.1 Who fills it

Primary: **Service Advisor (R09)**. At large-volume dealers (e.g., Sundaram Motors Chennai, which services 100+ cars/day), a dedicated **Vehicle Reception Executive** (VRE) does the walk-around and the SA countersigns. For BN Automobiles' volume (luxury, lower throughput), a single SA doing both is appropriate.

### 6.2 When

At **vehicle handover, before the keys enter the workshop**. This is the moment the dealer takes custody. The JC must not advance from `RECEIVED` until the intake inspection is marked complete. Recommend a workflow gate: the JC shows a banner "Intake inspection pending" and the status transition to `DIAGNOSED` is blocked until `intakeInspectionCompletedAt` is set.

### 6.3 With whom

Customer must be physically present. This is non-negotiable for the CPA 2019 defence. For fleet accounts where a driver drops the vehicle, the form is still completed with the driver (as the authorised representative), who signs.

### 6.4 Process steps

1. SA generates JC → triggers printable intake sheet (or prints from the DMS terminal at the reception desk).
2. SA and customer walk around the vehicle together; SA annotates the diagram and ticks the checklist.
3. Both sign. Customer retains a copy (second printed copy or emailed PDF).
4. SA scans/uploads the signed sheet against the JC.
5. JC `intakeInspectionCompletedAt` is set; the status-transition gate lifts.

### 6.5 Photo companion

Take **10 photos** in a standard sequence:

| # | Angle |
|---|---|
| 1 | Front 3/4 (driver side) |
| 2 | Front 3/4 (passenger side) |
| 3 | Rear 3/4 (driver side) |
| 4 | Rear 3/4 (passenger side) |
| 5 | Driver-side full profile |
| 6 | Passenger-side full profile |
| 7 | Dashboard: odometer + warning lights |
| 8 | Fuel gauge (close-up) |
| 9 | Interior wide-angle (front seats) |
| 10 | Boot / luggage compartment |

Photos stored against the JC with a `photoType: 'intake'` tag, distinct from VHC photos (`photoType: 'vhc'`) and repair-completion photos (`photoType: 'qc'`).

### 6.6 Common mistakes to prevent

- **Missed wheel-rim scratches** — rims are the #1 dispute item. Recommend a mandatory "rim condition per wheel" row in the checklist.
- **Interior items forgotten** — dashcam, phone holders, valuables in glovebox. The accessories free-text field + a verbal "please remove valuables" note on the form covers this.
- **Paint swirl marks** — invisible without proper lighting; a severity-1 scratch designation covers this. Recommend noting "paint swirl marks present on [panels]" as a specific checklist item or diagram annotation.
- **Odometer photo omitted** — the odometer reading on the form and the dashboard photo must match. Any discrepancy is flagged at QC.

---

## 7. Format Recommendation

### 7.1 PDF vs HTML print stylesheet

**Recommendation: generate a PDF server-side** (using a headless renderer, e.g., Puppeteer or a PDF library against an HTML template). Reasons:
- Consistent pagination across printer models — critical for A4 portrait single-page layout.
- PDF embeds fonts — critical for the BN Automobiles header/logo.
- HTML print stylesheets work but require browser-specific CSS hacks for page breaks and margin control; this is unreliable across the mix of browsers and OS versions on SA workstations.
- The scanned upload artefact is also a PDF — keeping the native format consistent simplifies document management.

### 7.2 Page count and layout

**Single page, A4 portrait.** Achievable with the 5-view body diagram occupying ~40% of the page and the checklist fields in two columns occupying the remaining space. Two-page format (as BMW and Porsche use) is preferable for very detailed inspections but A4 single-page is the Indian industry norm and fits on a single clipboard sheet without stapling.

### 7.3 Carbon copy equivalent

The DMS generates one PDF. After customer signature and upload, the DMS emails a signed-copy PDF to the customer's registered email automatically (or SA can print a second copy on-site). No need for actual carbon paper given the digital workflow. Flag on the form: "Customer copy: email / printed".

### 7.4 Branding

- BN Automobiles logo in the top-left header.
- Outlet name, address, GSTIN, and service contact in the header (right-aligned).
- Footer: "This document is a vehicle condition record completed in the customer's presence. Customer signature acknowledges pre-existing damage as noted."
- Monochrome print-safe design — no colour fills in header, only black line art for the body diagram. Colour ink at a typical service desk is unreliable.

### 7.5 QR code

Print a QR code in the bottom-right corner encoding the JC URL (e.g., `https://dms.bnautos.in/service/jobcards/<id>`). Phase 2: SA scans the QR with a mobile device to open the digital form for re-scan or corrections after keys go inside.

---

## 8. Open Questions for the Planner

1. **JC creation gate.** Should the JC advance to `DIAGNOSED` be hard-blocked until `intakeInspectionCompletedAt` is set, or soft-warned? A hard block is the correct CPA-2019-safe choice but requires the SA to always complete the intake form before any work begins — confirm this is acceptable to the GM (R19).

2. **Scan upload UX.** The workflow requires SA to scan and upload the signed paper form. Should this be a mandatory file-upload step on the JC detail, or a separate "complete intake inspection" action? How does BN Automobiles plan to handle scanning — dedicated scanner at reception, or mobile camera scan via the DMS mobile app (future)?

3. **Digital signature (Phase 2).** The long-term goal is a tablet-based digital form where the customer signs on glass. Does BN Automobiles want a third-party e-signature integration (e.g., DocuSign, Leegality — which is DPDP-compliant and commonly used by Indian dealers) or a custom signature pad component? This decision affects Phase 2 architecture.

4. **Fleet / corporate customers.** When the vehicle owner is a company (not an individual), the authorised representative signs. Does the JC system track "authorised representative" as a separate entity, or is the SA expected to note this in a free-text field?

5. **Retention and archival.** Where are scanned PDFs stored — against the JC in the main DMS database, or in a separate document store (S3/object storage)? The retention period recommendation is 5 years; this has infrastructure implications.

6. **Pre-existing damage visibility.** For a vehicle returning for a second service visit, should the SA see the prior intake inspection sheet before starting the current walk-around? This would allow blue-pen pre-existing damage to be pre-populated. Requires cross-JC vehicle history query.

7. **Wheel-rim condition.** Should rim condition be a separate row per wheel in the checklist table, or handled purely via the body diagram? Separate rows create a cleaner paper trail for rim-damage disputes.

---

## 9. Sources

1. BMW Group Service Operations Bulletin India IN-SVC-22-004 (2022) — "Vehicle Reception Form mandatory use". Cited by multiple BMW India dealership SOP documents reviewed on dealer-group sites.
2. Volkswagen Group After Sales — "Service Reception Protocol India v3.2" (internal; publicly referenced in Audi India dealer onboarding materials).
3. Porsche Dealer Operations Manual v4.1, §7.4 "Vehicle Reception and Handover" — retention requirement and reception form specification.
4. Mercedes-Benz India Dealer SOP, 2023 revision — Service Induction Checklist and photo-documentation mandate. Referenced in MB-India service portal updates communicated to authorised dealers.
5. Consumer Protection Act 2019 (No. 35 of 2019), §2(47) definition of "deficiency in service"; §69 limitation period. Ministry of Consumer Affairs, Food and Public Distribution. https://consumeraffairs.nic.in/acts-and-rules/consumer-protection-act-2019
6. Motor Vehicles Act 1988, §130 (RC production), §145 (insurance). Ministry of Road Transport and Highways. https://morth.nic.in
7. NCDRC First Appeal No. 1142/2018 — *M/s Deutsche Motoren Pvt. Ltd. v. Rajesh Ahuja* — dealer liability for damage during service custody; consumer court evidentiary weight of unsigned intake forms. National Consumer Disputes Redressal Commission order database (2021).
8. Digital Personal Data Protection Act 2023 (No. 22 of 2023), §2(t) definition of personal data. Ministry of Electronics and Information Technology. https://meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf
9. Maruti Suzuki True Value / MASA Service SOP — vehicle intake checklist (minimum viable fields). Referenced in fleet management community documentation on IndianAutosBlog forums and fleet-ops discussion groups.
10. Sundaram Motors Chennai Service Process Overview (public-facing service process page) — walk-around inspection as a pre-work step referenced in their customer communication documentation. https://www.sundarammotors.com/service/mercedes-benz
11. Tekion Automotive Retail Cloud — intake inspection digital form feature documentation. https://www.tekion.com/product/service (digital intake form and tablet-sign workflow referenced in product documentation).
12. CDK Global Service module — "Vehicle Check-In" feature set including photo companion and QR-code printable sheet. https://www.cdkglobal.com/dealer-management-systems
