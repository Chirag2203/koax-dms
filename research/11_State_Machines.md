# 11 · State Machines Catalog

Every stateful object in the system in one place. States, transitions, triggers, guards, side effects, timeouts, and terminal states are defined here authoritatively. Specs reference by machine + transition ID rather than redefining.

Each state machine is documented in a consistent shape:
1. **States** — enumerated
2. **Transitions** — with trigger, guard, and side effects
3. **Invariants** — what must always hold
4. **Timeouts / SLA clocks** — where applicable
5. **Audit-logged** — every transition is audit-logged by default

---

## 1. Lead state machine

### States
`New → Qualified → TestDrive → Negotiation → Token → Paperwork → Delivery → Delivered`

Terminal: `Delivered`, `Lost`, `Disqualified`.

### Transitions

| ID | From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|---|
| L1 | — | New | Lead capture from any channel | — | Send welcome WhatsApp template (if consent) + assign via routing rules |
| L2 | New | Qualified | Sales exec completes qualification call | Budget + interest captured | Update lead owner if reassigned |
| L3 | New/Qualified | Disqualified | Out of budget / not seriously interested / duplicate | Reason code required | Close lead; analytics event |
| L4 | Qualified | TestDrive | Test drive scheduled | `TestDrive.status = Scheduled` | Calendar block; WhatsApp confirmation |
| L5 | TestDrive | Negotiation | Test drive completed | `TestDrive.status = Completed` | Generate first Quote |
| L6 | Negotiation | Token | Token payment received | `Payment.status = Received && amount >= min_token` | Reserve VIN; freeze list price; notify logistics if inter-outlet |
| L7 | Token | Paperwork | KYC + finance + insurance workflow started | KYC at least Basic | Create document checklist; assign to finance exec |
| L8 | Paperwork | Delivery | All paperwork complete, RC transfer tracked | All checklist items done | Schedule delivery slot; generate final invoice |
| L9 | Delivery | Delivered | Handover checklist signed | Customer signature captured | Mark VIN Sold; trigger commission accrual; send post-delivery WhatsApp |
| L10 | any (before Token) | Lost | Lead explicitly lost or SLA-expired | Reason code required | Close lead; remove reserve if any |
| L11 | Token | Lost (unwind) | Token refunded | Manager approval + reason | Release VIN Reserve; reverse commission pre-accrual if any |

### SLA clocks
- `New → Qualified` within 15 min of capture for hot leads, 24h for cold
- `Qualified → TestDrive` within 7 days or reason captured
- `Token → Paperwork` within 48h (escalate to manager if overdue)
- Reserve TTL: 48h default, extendable with manager approval

### Invariants
- A VIN cannot be tied to more than one active Lead in `Token` state.
- `Delivered` requires at least one paid `Invoice.status = Generated` tied to the Deal.
- Any backward transition requires manager approval + reason.

---

## 2. Deal state machine

Deal mirrors Lead stage 1:1 for pipeline visibility, but carries commercial data (Quote versions, finance status, handover).

### States
`Draft → Open → Won → Lost`

Open sub-stages mirror Lead stages Qualified through Delivery.

### Key transitions
- `Open → Won` only when `Lead.state = Delivered`
- `Open → Lost` when `Lead.state = Lost` or `Disqualified`

---

## 3. Quote state machine

### States
`Draft → Sent → Accepted / Expired / Superseded`

### Transitions

| ID | From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|---|
| Q1 | — | Draft | Quote created | Deal in Negotiation+ | — |
| Q2 | Draft | Sent | Sales exec sends | All mandatory lines present; margin-scheme GST computed correctly | WhatsApp template send; PDF generated |
| Q3 | Sent | Accepted | Customer confirms (OTP or button) | Not expired | Move Deal to Token gate |
| Q4 | Sent | Expired | TTL elapsed | `expires_at < now()` | Sales exec notified |
| Q5 | Sent/Draft | Superseded | New version created | Parent links set | Old version marked read-only |

### Invariants
- Only one Quote per Deal can be `Accepted` at any time.
- An `Accepted` Quote is immutable; amendments create a new version that starts at `Draft`.

---

## 4. Vehicle listing state machine

This is the Vehicle's lifecycle from acquisition through sale.

### States
`Lead (Sell-Your-Car) → Inspected → Offered → Accepted → Acquired → Transport → Arrived → Refurb → Ready for Certification → Certified → Listed → (Reserved | Hold) → Sold → Invoiced → Delivered → Closed`

Exceptional: `Rejected`, `Returned to Seller`.

### Key transitions

| ID | From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|---|
| V1 | — | Lead (SYC) | Sell-your-car form / lead ingest | — | OBV lookup; schedule inspection |
| V2 | Lead (SYC) | Inspected | Inspector completes acquisition inspection | Report submitted | Offer computed |
| V3 | Inspected | Offered | Procurement manager approves offer | Offer >= buy-floor | WhatsApp offer sent |
| V4 | Offered | Accepted | Seller accepts; token collected | Token received | Dealer RTO agent notified |
| V5 | Accepted | Acquired | RC transfer complete | RC received by us | VehicleCostEntry: acquisition |
| V6 | Acquired | Transport / Arrived | Logistics to destination outlet | — | Transport cost logged |
| V7 | Arrived | Refurb | Intake at workshop | Refurb plan created | Create refurb RO |
| V8 | Refurb | Ready for Certification | Refurb complete | All line items Complete/Waived | Photography scheduled |
| V9 | Ready for Certification | Certified | CPO inspection Pass | All six ready-for-sale gate items done | Certificate PDF generated; warranty policy attached |
| V10 | Certified | Listed | Sales manager approves listing | Listed_price set | Visible on storefront |
| V11 | Listed | Reserved | Deal reaches Token gate | Reserve TTL set | Invisible on storefront |
| V12 | Listed | Hold | Internal reason (dispute, reinspect) | Reason captured | Invisible on storefront |
| V13 | Reserved | Sold | Deal reaches Delivered | Invoice generated | Recognize COGS |
| V14 | Reserved | Listed | Reserve TTL expired or released | — | Visible again |
| V15 | Sold | Invoiced | Invoice generated + IRN received | — | Revenue recognition |
| V16 | Invoiced | Delivered | Handover complete | Checklist signed | Close Deal; release commission |
| V17 | Delivered | Closed | 30 days post-delivery | — | Archive; warranty tracked separately |
| V18 | Refurb | Rejected | Too expensive / unviable | Procurement approval | Return to seller / scrap path |

### Invariants
- A Vehicle may only be in one of `Listed / Reserved / Hold` at a time.
- `Reserved` requires an active Deal linked.
- Transitions V10 onwards require `CPOCertification.pass_fail = Pass`.
- Consignment vehicles share same machine; different GST + payout at V13/V15.

---

## 5. CPO Certification state machine

### States
`Draft → In Progress → Submitted → Under Review → Approved → Expired`
Exceptional: `Rejected`, `Reinspection Required`.

### Transitions

| ID | From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|---|
| C1 | — | Draft | Inspector starts | Template selected | — |
| C2 | Draft | In Progress | First checkpoint completed | — | — |
| C3 | In Progress | Submitted | Inspector signs off | All checkpoints answered; mandatory photos present | — |
| C4 | Submitted | Under Review | Counter-sign queue | — | Notify manager |
| C5 | Under Review | Approved | Manager signs | No critical fails OR rework completed | Generate PDF certificate; public URL; attach warranty policy |
| C6 | Under Review | Reinspection Required | Manager flags | Rework scope captured | Route back to workshop |
| C7 | Submitted | Rejected | Category-level fail (frame / flood / major accident) | — | Vehicle → Rejected path |
| C8 | Approved | Expired | Validity TTL elapsed | — | Require re-cert before sale (if not yet sold) |

### Invariants
- A Vehicle can have at most one `Approved` Certification at a time.
- Certificate PDF immutable; corrections issue a new Certificate version with parent reference.

---

## 6. Repair Order (RO) state machine

### States
`Created → Awaiting Estimate Approval → Scheduled → In-Progress → (Additional Work Requested → Approved/Declined) → QC → Ready for Delivery → Delivered → Invoiced`

Branches: `On Hold (Parts) / On Hold (Customer) / Cancelled / Rework`.

### Key transitions

| ID | From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|---|
| R1 | — | Created | SA opens RO from booking / walk-in | Customer + VIN linked | Pull Customer 360 |
| R2 | Created | Awaiting Estimate Approval | SA sends estimate | Estimate lines complete; GST computed | WhatsApp estimate with approval button |
| R3 | Awaiting Estimate Approval | Scheduled | Customer approves | OTP/button evidence captured | Assign bay + tech; block slot |
| R4 | Awaiting Estimate Approval | Cancelled | Customer declines | Reason captured | Close RO |
| R5 | Scheduled | In-Progress | Tech clocks in first LaborEntry | Tech certification meets requirement | Bay marked busy |
| R6 | In-Progress | Additional Work Requested | Tech flags finding | Photo attached | Pause bay clock; WhatsApp additional estimate |
| R7 | Additional Work Requested | In-Progress | Customer approves additional | Evidence captured | Add line items; resume |
| R8 | Additional Work Requested | In-Progress | Customer declines | Reason captured | Proceed without additional work |
| R9 | In-Progress | On Hold (Parts) | Parts back-order | — | Notify customer with revised ETA |
| R10 | In-Progress | QC | Tech marks work complete | All line items Complete/Waived; road test done where required | QC queue |
| R11 | QC | Ready for Delivery | QC passes | All QC checks passed; wash done | Notify customer |
| R12 | QC | In-Progress | QC fails | Rework scope captured | Reassign tech |
| R13 | Ready for Delivery | Delivered | Customer picks up; handover form signed | Payment collected OR AR allowed | Release bay |
| R14 | Delivered | Invoiced | Invoice generated + IRN | All financials final | Revenue recognition; warranty claim routed if applicable |
| R15 | Delivered | Rework | Customer returns with same complaint | Within rework window | New sub-RO linked as rework |

### SLA clocks
- `Created → Estimate` target 30 min (customer waiting)
- `Scheduled → In-Progress` target 60 min of slot start
- `Additional Work` customer decision target 2h (re-ping WhatsApp at 1h)

### Invariants
- `Scheduled → In-Progress` requires primary tech certification matches job requirements (brand certification gate).
- A bay cannot serve two ROs simultaneously in In-Progress.
- Financial totals immutable after `Invoiced`.

---

## 7. Service Booking state machine

### States
`Requested → Confirmed → CheckedIn → InService → Delivered → Invoiced / Cancelled / NoShow`

### Transitions (summary)
- `Requested → Confirmed` on slot availability + customer confirm
- `Confirmed → CheckedIn` on arrival
- `CheckedIn → InService` when RO created
- RO drives remaining

---

## 8. Payment state machine

### States
`Initiated → Pending → Received → Reversed / Failed`

### Key
- Webhook-driven from Razorpay / bank
- Idempotent via `provider_ref`
- `Received → Reversed` on refund/chargeback; all downstream effects (invoice status, commission, VIN reserve) reversed

---

## 9. Invoice state machine

### States
`Draft → Generated → SubmittedToIRP → IRNReceived → Cancelled / Amended`

### Key transitions

| ID | From | To | Trigger | Guard | Side Effects |
|---|---|---|---|---|---|
| I1 | Draft | Generated | User finalizes | All lines valid; GST computed | PDF generated without IRN (pre-IRP placeholder) |
| I2 | Generated | SubmittedToIRP | System submits | Within 24h of generation | Call GSP |
| I3 | SubmittedToIRP | IRNReceived | IRP responds | IRN + QR returned | Update PDF; send to customer |
| I4 | IRNReceived | Cancelled | Within 24h window | Reason allowed | Create cancellation record |
| I5 | IRNReceived | Amended | Beyond 24h window | Amendment reason | Create credit note + new invoice |

### Invariants
- Once IRN received, invoice values are immutable; corrections via credit/debit note only.
- E-way bill required for inter-state invoices above threshold.

---

## 10. Consent state machine (per subject × purpose)

### States
`Granted → Revoked → Expired`

Terminal on `Revoked` for that purpose; re-grant creates a new ConsentEvent.

### Transitions
- On collection: append `Granted`
- On customer revoke action: append `Revoked`; cascade: stop all matching notifications, purge marketing audiences
- On TTL: append `Expired` (treated as Revoked for processing)

### Invariants
- Current consent state derived from latest event per (subject, purpose).
- Any personal-data processing action must verify Granted state at runtime (middleware).

---

## 11. Test Drive state machine

### States
`Scheduled → InProgress → Completed → NoShow / Cancelled`

Guarded by DL verification + insurance rider activation.

---

## 12. Warranty Claim state machine

### States
`Filed → Under Review → Approved / Rejected → Settled / Closed`

### Notes
- OEM warranty claims state parallels this but gated by external OEM portal responses.
- In-house CPO warranty claims: finance reviews monthly; reserve consumption posted.

---

## 13. Handover state machine

### States
`Scheduled → InProgress → Completed`

Requires checklist signoff on Completed. Drives Vehicle `Sold → Delivered`, Deal `Delivery → Delivered`.

---

## 14. Courtesy Vehicle Booking state machine

### States
`Reserved → HandedOver → InUse → Returned → Closed`

Insurance rider active during `InUse`. KM + fuel + damage diff on Return.

---

## 15. PO / GRN state machine

### PO: `Draft → Sent → Acknowledged → Partially Received → Received → Closed / Cancelled`
### GRN: `Draft → Matched → Posted` (with 3-way match gate between Matched and Posted)

---

## 16. Data Subject Request state machine (DPDP)

### States
`Received → Identity Verified → In Progress → Fulfilled / Rejected → Closed`

Statutory clocks per DPDP per action type. Automated + operator-handled workflow.

---

## 17. User Account state machine

### States
`Invited → Active → Suspended → Offboarded`

Offboarding cascades role revocation + session invalidation + consent archive.

---

## 18. Incident state machine (ops)

### States
`Declared → Investigating → Mitigated → Resolved → PostmortemDone`

Linked to on-call paging and status communications.

---

## 19. Notes for spec authors and agents

- Cite transitions by machine name + transition ID (e.g., "R6 (Additional Work Requested)"). Do not reword.
- Any spec that introduces a new state or transition must PR this document first.
- Prefer event-sourced recording for the richest machines (RO, Vehicle listing, Consent) so we have a durable timeline for audit and analytics.
- Every transition is audit-logged by default (see Doc 06 §17, Doc 10 §11.1).
- If a backward / exceptional transition is needed that isn't listed, it requires a specific policy — design it explicitly rather than allowing ad-hoc overrides.
