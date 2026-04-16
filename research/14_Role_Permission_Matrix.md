# 14 · Role & Permission Matrix

Authoritative RBAC source of truth. Every role × every capability × allow/deny/conditional. Feature specs must reference this document rather than restating who can do what. This matrix feeds directly into:
- Permission constants in code (`permissions.ts`)
- Row-Level Security (RLS) policies in PostgreSQL
- UI feature-flagging / menu visibility
- Audit log event classification

Any change to this document requires approval from Product + Security + Legal (for DPDP-sensitive actions).

---

## 1. Roles (v1)

Hierarchy is compositional, not strict — a user can have multiple roles. RLS scope is set per role binding (global / org / outlet / team / self).

| Role ID | Role name | Scope | Typical headcount/outlet |
|---|---|---|---|
| R01 | Super Admin | Global | 1–2 (founders/CTO) |
| R02 | Org Admin | Global | 2–3 (COO, Finance Head, HR) |
| R03 | Outlet Manager | Outlet | 1 per outlet |
| R04 | Sales Manager | Outlet | 1 per outlet |
| R05 | Sales Executive | Outlet (self + team) | 5–10 per outlet |
| R06 | Procurement Manager | Global or Outlet | 1–2 per outlet |
| R07 | Inspector | Outlet | 2–4 per outlet |
| R08 | Refurb Workshop Manager | Outlet | 1 per outlet |
| R09 | Service Advisor (SA) | Outlet | 3–5 per outlet |
| R10 | Master Technician | Outlet | 1–2 per outlet |
| R11 | Technician | Outlet (self) | 8–15 per outlet |
| R12 | Parts Manager | Outlet | 1 per outlet |
| R13 | Parts Counter | Outlet | 2–3 per outlet |
| R14 | Body Shop Manager | Outlet | 1 per outlet |
| R15 | Finance Executive | Outlet | 2–3 per outlet |
| R16 | Finance Head | Global | 1 |
| R17 | Accounts Payable (AP) | Global or Outlet | 1–2 |
| R18 | Marketing Manager | Global | 1 |
| R19 | Marketing Executive | Global | 1–2 |
| R20 | Customer | Self | N (customers) |
| R21 | Consignor | Self | N (sellers on consignment) |
| R22 | Auditor (Read-only) | Global | 1 (external/internal audit) |
| R23 | Data Protection Officer (DPO) | Global | 1 |
| R24 | Support Agent | Global | 2–3 |

Roles R20, R21 are **external** (customers/consignors) — separate auth tenant from staff. R24 is our CX team.

---

## 2. Scopes (RLS predicates)

Every allow in the matrix below is further constrained by the user's scope binding:

- **Global** — no RLS predicate
- **Outlet** — rows where `outlet_id = :user_outlet_id` or `user_outlets @> [outlet_id]` (multi-outlet managers)
- **Team** — outlet + `owner_user_id IN (team_member_ids)`
- **Self** — `owner_user_id = :user_id` or equivalent
- **Customer-self** — `customer_id = :authenticated_customer_id`
- **Consignor-self** — `consignor_id = :authenticated_consignor_id`

Super Admin bypasses RLS only via break-glass with DPO-notified audit trail.

---

## 3. Legend for permission cells

- ✅ = Allow
- ⛔ = Deny
- 🔶 = Conditional (see notes column)
- 👥 = Team scope
- 🙋 = Self scope
- 📝 = Allow + mandatory reason/approval captured

---

## 4. Customer (R20) — Storefront & Portal

| Capability | R20 | Notes |
|---|---|---|
| Browse listings (Listed state) | ✅ | Public |
| Save / wishlist | ✅ | Self |
| Request test drive | ✅ | Self; KYC light |
| Submit sell-your-car lead | ✅ | Self |
| Pay token (Razorpay) | ✅ | Self |
| Upload KYC docs | ✅ | Self |
| View own invoices | ✅ | Self |
| Book service appointment | ✅ | Self |
| Approve service estimate (OTP/button) | ✅ | Self; evidence captured |
| View own service history | ✅ | Self |
| Download certificates | ✅ | Self |
| Grant / revoke consent (DPDP) | ✅ | Self |
| Submit Data Subject Request | ✅ | Self |
| Access own audit trail | 🔶 | DPDP access-right flow |
| View other customers | ⛔ | |
| View vehicle cost/margin | ⛔ | |

---

## 5. Consignor (R21) — Consignment Portal

| Capability | R21 | Notes |
|---|---|---|
| View own consigned vehicle status | ✅ | Self |
| View offers received | ✅ | Self |
| Approve sale price floor | ✅ | Self |
| View payout statement | ✅ | Self |
| E-sign agreements | ✅ | Self |
| Revoke consignment (per agreement) | 🔶 | Subject to contract terms |

---

## 6. Sales Executive (R05)

| Capability | R05 | Notes |
|---|---|---|
| View leads | ✅ | Self + unassigned pool |
| Claim unassigned lead | ✅ | |
| Reassign own lead | ⛔ | Manager only |
| Edit lead details | ✅ | Self |
| Schedule test drive | ✅ | Self's leads |
| Generate quote | ✅ | Self's deals |
| Apply discount | 🔶 | Up to auto-approval threshold (₹X); manager approval beyond |
| Accept/Reject price negotiation | ✅ | Within threshold |
| Collect token payment | ✅ | Self's deals |
| Initiate KYC | ✅ | Self's customers |
| Submit finance pre-approval (HDFC/ICICI) | ✅ | Self's deals |
| Mark lead Lost / Disqualified | 🔶 | Reason required; manager audits |
| Transition to Delivered | ⛔ | Requires handover checklist signoff by Ops |
| View colleague's leads | 🔶 | Read only for team; full only for manager |
| View cost/landed price of vehicle | ⛔ | Sees floor price only, not cost |
| View commission statements | ✅ | Self |
| Export customer list | ⛔ | DPDP — restricted |

---

## 7. Sales Manager (R04)

| Capability | R04 | Notes |
|---|---|---|
| Everything R05 can do | ✅ | Within outlet |
| Reassign leads | ✅ | Within team |
| Approve discount beyond threshold | 🔶 | Up to outlet-level ceiling |
| Approve token refund (Lost-unwind) | 📝 | Reason required |
| Set floor price on listings | ✅ | Outlet |
| Approve VIN reserve extension | ✅ | Outlet |
| View team pipeline + forecasts | ✅ | Outlet |
| View cost/landed price | 🔶 | Role-based; conditional on outlet manager policy |
| Approve lead source / channel attribution overrides | ✅ | Outlet |
| Override commission calculation | 📝 | Reason + Finance Head co-sign |

---

## 8. Procurement Manager (R06)

| Capability | R06 | Notes |
|---|---|---|
| Review acquisition leads (SYC) | ✅ | |
| Schedule acquisition inspection | ✅ | |
| Approve buy offer | 🔶 | Within buy-floor authority; Org Admin for beyond |
| Negotiate with seller | ✅ | |
| Approve consignment agreement | ✅ | |
| Trigger RC transfer workflow | ✅ | |
| Set acquisition cost on VIN | ✅ | |
| View aggregated acquisition analytics | ✅ | |
| Reject vehicle at inspection | 📝 | Reason captured |

---

## 9. Inspector (R07)

| Capability | R07 | Notes |
|---|---|---|
| Create/complete inspection report (any template) | ✅ | Self's assigned |
| Attach photos / videos | ✅ | |
| Flag critical defects | ✅ | |
| Sign CPO certification | 🔶 | Only if inspector is CPO-certified; countersign by manager |
| Edit report after submit | ⛔ | New version only |
| View historical inspection reports | ✅ | |

---

## 10. Refurb Workshop Manager (R08)

| Capability | R08 | Notes |
|---|---|---|
| Create refurb plan | ✅ | |
| Assign technicians | ✅ | |
| Approve refurb line items | ✅ | |
| Procure parts (raise PR) | ✅ | |
| Mark Ready for Certification | ✅ | |
| View refurb cost per VIN | ✅ | |
| Approve refurb budget overrun | 🔶 | Up to threshold; Org Admin beyond |

---

## 11. Service Advisor (R09)

| Capability | R09 | Notes |
|---|---|---|
| Open RO from booking or walk-in | ✅ | |
| Conduct VHC walkaround | ✅ | |
| Generate estimate | ✅ | |
| Send estimate to customer (WhatsApp) | ✅ | Template-gated |
| Apply service discount | 🔶 | Up to SA threshold; Manager beyond |
| Capture estimate approval evidence | ✅ | OTP/button/signature |
| Reassign bay/tech | 🔶 | Within outlet; Master Tech or Manager approves |
| Close RO (handover) | ✅ | Checklist gate |
| View Customer 360 | ✅ | PII access logged |
| View parts markup / cost | ⛔ | Sees MRP/selling price only |

---

## 12. Master Technician (R10)

| Capability | R10 | Notes |
|---|---|---|
| Everything R11 (Technician) | ✅ | |
| Review & countersign technical decisions | ✅ | |
| QC pass/fail | ✅ | |
| Approve rework | ✅ | |
| Update technician certifications (training records) | 🔶 | Workshop Head / HR also |

---

## 13. Technician (R11)

| Capability | R11 | Notes |
|---|---|---|
| View assigned ROs | ✅ | Self |
| Clock in/out on job (LaborEntry) | ✅ | Self |
| Complete checklist items | ✅ | Self |
| Request additional work | ✅ | Self's RO |
| Request parts | ✅ | Self's RO |
| Capture photos/videos | ✅ | |
| Mark job complete | ✅ | Self's RO |
| View others' ROs | ⛔ | Unless assisting |
| Edit estimate pricing | ⛔ | |
| Approve customer-side decisions | ⛔ | |

---

## 14. Parts Manager (R12)

| Capability | R12 | Notes |
|---|---|---|
| Raise PO | ✅ | Within threshold; Org Admin beyond |
| Approve GRN | ✅ | |
| Manage stock movements | ✅ | |
| Set reorder levels | ✅ | |
| Write-off obsolete stock | 📝 | Reason + Finance Head co-sign |
| View parts margin | ✅ | |
| Transfer stock between outlets | ✅ | Multi-outlet |

---

## 15. Parts Counter (R13)

| Capability | R13 | Notes |
|---|---|---|
| Issue parts against RO | ✅ | Outlet |
| Receive GRN items | ✅ | Outlet |
| View stock levels | ✅ | |
| Raise PR to Parts Manager | ✅ | |
| Sell parts OTC to walk-ins | 🔶 | If OTC enabled for outlet |
| Manage pricing | ⛔ | |

---

## 16. Body Shop Manager (R14)

| Capability | R14 | Notes |
|---|---|---|
| Create body shop job | ✅ | |
| Manage insurance claim workflow | ✅ | |
| Coordinate with surveyor | ✅ | |
| Approve labor / paint estimates | ✅ | |
| Close body shop job | ✅ | |
| Mirror subset of RO permissions | ✅ | |

---

## 17. Finance Executive (R15)

| Capability | R15 | Notes |
|---|---|---|
| Generate invoice | ✅ | |
| Submit to IRP for IRN | ✅ | Automated; manual retry on fail |
| Record payment | ✅ | |
| Reconcile bank statement | ✅ | |
| Issue refund | 🔶 | Approval threshold |
| Issue credit note | 🔶 | Approval threshold |
| Process consignor payout | ✅ | |
| Cancel invoice (within 24h) | 📝 | Reason required |
| View P&L | ⛔ | Finance Head only |
| Run GST reports | ✅ | Read-only |

---

## 18. Finance Head (R16)

| Capability | R16 | Notes |
|---|---|---|
| Everything R15 | ✅ | Global |
| Approve large refunds / credit notes | ✅ | |
| Manage chart of accounts | ✅ | |
| Approve commission payouts | ✅ | |
| Approve warranty reserve movements | ✅ | |
| View org-wide P&L, balance sheet | ✅ | |
| Configure tax rules (GST, TCS) | 🔶 | Change control; Super Admin co-sign |
| Approve period-end close | ✅ | |
| Trigger Tally sync manually | ✅ | |

---

## 19. AP Clerk (R17)

| Capability | R17 | Notes |
|---|---|---|
| Enter vendor bills | ✅ | |
| Three-way match (PO/GRN/Bill) | ✅ | |
| Schedule payments | 🔶 | Finance Head approves release |
| Manage vendor master | 🔶 | Finance Head approves creation |
| View AP aging | ✅ | |

---

## 20. Outlet Manager (R03)

| Capability | R03 | Notes |
|---|---|---|
| View all outlet operations (sales, service, parts, body, finance summary) | ✅ | Outlet |
| Manage outlet staff (activate/deactivate/role assignment) | 🔶 | Role scope capped below Org Admin |
| Configure outlet settings (holidays, SLAs, bay map) | ✅ | Outlet |
| Approve outlet-level exceptions | ✅ | |
| View cost/margin | ✅ | Outlet |
| Export outlet reports | ✅ | |

---

## 21. Marketing Manager (R18) / Executive (R19)

| Capability | R18 | R19 | Notes |
|---|---|---|---|
| Build customer segments | ✅ | ✅ | Consent-aware filtering mandatory |
| Create campaigns | ✅ | 🔶 | R19 submits, R18 approves |
| Send marketing WhatsApp / SMS / email | ✅ | ⛔ | R18 pushes; consent check auto-applied |
| Approve marketing templates | ✅ | ⛔ | |
| Access lead source analytics | ✅ | ✅ | |
| Export customer segments | ⛔ | ⛔ | DPDP — processing only, no export |
| View PII in campaigns | 🔶 | 🔶 | Masked by default; unmask requires reason |

---

## 22. Org Admin (R02)

| Capability | R02 | Notes |
|---|---|---|
| Manage users + roles org-wide | ✅ | Except Super Admin |
| Configure org-wide settings | ✅ | |
| View all outlets | ✅ | |
| Approve cross-outlet transfers | ✅ | |
| Approve large commercial exceptions | ✅ | |
| Access audit logs | ✅ | Read-only |
| Modify RBAC matrix | ⛔ | Super Admin only |

---

## 23. Super Admin (R01)

| Capability | R01 | Notes |
|---|---|---|
| Full system access | ✅ | MFA mandatory |
| Modify RBAC matrix / permissions | 📝 | Change-control process |
| Break-glass bypass RLS | 📝 | DPO notified; session-scoped; audit |
| Configure feature flags | ✅ | |
| Initiate data migrations | ✅ | |
| Manage integrations | ✅ | |
| Rotate secrets | ✅ | |

---

## 24. Auditor (R22)

| Capability | R22 | Notes |
|---|---|---|
| Read-only access to all financial records | ✅ | |
| Read-only access to audit logs | ✅ | |
| Export read-only reports | 🔶 | Watermarked, signed; audit entry |
| Write anything | ⛔ | |

---

## 25. DPO (R23)

| Capability | R23 | Notes |
|---|---|---|
| View consent ledger | ✅ | |
| Process Data Subject Requests | ✅ | |
| Configure retention policies | ✅ | |
| Access PII with purpose logging | ✅ | Every access logged |
| Approve Super Admin break-glass | ✅ | |
| Review integration data flows | ✅ | |

---

## 26. Support Agent (R24)

| Capability | R24 | Notes |
|---|---|---|
| View customer tickets + Customer 360 | ✅ | Masked PII by default |
| Unmask PII | 🔶 | Reason captured + time-boxed |
| Act on behalf of customer (with consent) | 🔶 | Session recorded |
| Modify financial data | ⛔ | Hands off to Finance |

---

## 27. Conditional permission thresholds (configurable)

These thresholds live in `platform.settings` and are per-outlet where relevant.

| Threshold | Default | Role that can set |
|---|---|---|
| Sales exec discount auto-approval | ₹25,000 | Sales Manager |
| Sales manager discount ceiling | ₹2,00,000 | Outlet Manager |
| Refund auto-approval | ₹10,000 | Finance Head |
| PO auto-approval | ₹1,00,000 | Org Admin |
| Refurb budget overrun | 15% of plan | Org Admin |
| Write-off auto-approval | ₹50,000 | Finance Head |
| Break-glass session TTL | 60 min | Super Admin + DPO |

---

## 28. Sensitive-action inventory (all require `reason` + audit)

- Override commission calculation
- Cancel IRN-backed invoice
- Refund after 24h invoice window
- Edit vehicle cost ledger entry (create adjustments instead)
- Reverse a Delivered status
- Unmask customer PII
- Break-glass RLS bypass
- Bulk data export
- Deactivate outlet
- Modify DLT/Meta template catalog
- Disable feature flag in production
- Force-sync Tally / force-delete journal voucher

Every entry above maps to a specific permission ID with `requires_reason=true` and is logged with the full reason to the hash-chain audit log (see NFR-S-10).

---

## 29. Delegation & impersonation

- Managers can delegate their approval authority to a deputy for a time window (max 14 days, renewable); delegation is a first-class permission grant with start/end.
- Support / Super Admin impersonation for debugging: always time-boxed, DPO-notified for >5 min sessions, and UI clearly shows "Impersonating <user>".
- Customer-side: consignor/customer can add additional authorized contacts (e.g., spouse signing on their behalf) via scoped-delegation token.

---

## 30. Machine accounts

| Account | Purpose | Scope |
|---|---|---|
| `svc-razorpay-webhook` | Receive Razorpay webhooks | Write to Payment entity |
| `svc-whatsapp-ingest` | Inbound WhatsApp to CRM | Write to Lead, Message |
| `svc-irp-worker` | Submit invoices to IRP | Update Invoice |
| `svc-tally-sync` | Daily voucher push | Read finance, write sync flag |
| `svc-reporting-reader` | BI/reporting jobs | Read-only across finance |
| `svc-backup` | Automated backups | Read-only filesystem / DB dumps |

Machine accounts use short-lived tokens; never human-logged-in sessions.

---

## 31. Change control

Any proposal to change this matrix follows:

1. Open RFC with diff vs current matrix.
2. Security review (is this a principle-of-least-privilege regression?).
3. DPO review (does this create a PII-access path?).
4. Product + affected stakeholder sign-off.
5. Merge: update this doc + `permissions.ts` + RLS policy + test coverage.
6. Migration: existing users' role bindings audited for new permissions.

No silent additions. No code-only changes; this document is the contract.
