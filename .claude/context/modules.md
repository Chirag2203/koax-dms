# Module index & owning agents

15 modules. Each spec lives under `/specs/modules/<domain>/`.

| # | Domain | Scope summary | Money? | PII |
|---|---|---|---|---|
| 01 | `identity` | Users, roles, auth, sessions, service accounts, Aadhaar/PAN/eKYC, consent ledger | no | high |
| 02 | `customers` | Customer profile, household, preferences, communication history | no | medium |
| 03 | `inventory` | Acquisition (outright + consignment), appraisal, refurb, per-VIN cost ledger, listing | yes | low |
| 04 | `sales` | Lead, test drive, reservation, sales order, delivery, buyback, handover | yes | medium |
| 05 | `service` | Appointment, reception, job card, bay, QC, delivery, warranty, service campaigns | yes | medium |
| 06 | `parts` | Parts master, suppliers, PO, GRN, stock transfer, stock count, issues | yes | low |
| 07 | `finance` | Invoicing (margin scheme + TCS), e-invoicing/IRN, thin GL, Tally export, collections, refunds | yes | medium |
| 08 | `notifications` | WhatsApp templates, DLT SMS, email, in-app; opt-out; consent | no | medium |
| 09 | `integrations` | Razorpay, IRP/GSP, Aadhaar sub-KUA, PAN NSDL, DigiLocker, loan APIs, Tally, BSP | yes | high |
| 10 | `reporting` | Dashboards, operational reports, management reports, finance reconciliation | no | low |
| 11 | `audit` | Immutable audit log, access review, event replay | no | medium |
| 12 | `platform` | Outlet management, feature flags, settings, environment, city isolation | no | none |
| 13 | `storefront` | Public marketing site, SEO, CMS surfaces, vehicle catalog for customers | no | none |
| 14 | `customer-portal` | Customer account, saved vehicles, bookings, invoices, service history | yes | high |
| 15 | `consignor-portal` | Consignor account, listings, appraisals, payouts, messaging | yes | high |

## Agent defaults per domain

| Domain | finance-reviewer | security-reviewer | DPDP-sensitive |
|---|---|---|---|
| identity | no | yes (high) | yes |
| customers | no | yes (medium) | yes |
| inventory | yes | yes | no |
| sales | yes | yes | yes |
| service | yes | yes | yes |
| parts | yes | yes | no |
| finance | yes | yes | yes |
| notifications | no | yes | yes |
| integrations | yes | yes (high) | yes |
| reporting | no | yes | yes |
| audit | no | yes (high) | yes |
| platform | no | yes | no |
| storefront | no | yes | no |
| customer-portal | yes | yes (high) | yes |
| consignor-portal | yes | yes (high) | yes |

## Surface ownership

- **Customer surface (customer-web :3000):** storefront, customer-portal, consignor-portal, parts of notifications (opt-in UX), parts of identity (signup / eKYC flows).
- **Staff surface (staff-web :3001):** everything else.

## Development path (high level)

1. Design system + tokens — **done**.
2. Customer front (Figma via Stitch) → customer-web pages (landing, catalog, vehicle detail, account, portal, checkout).
3. Staff foundation (shell, navigation, RBAC gating, command palette, data table primitives, VIN card).
4. Inventory module (acquisition → appraisal → refurb → listing → cost ledger).
5. Sales module (lead → test drive → reservation → sales order → delivery → buyback).
6. Service module (appointment → reception → job card → bay → QC → delivery).
7. Parts module (master → PO → GRN → stock → issues).
8. Finance module (invoice → e-invoice → TCS → GL → Tally export → refunds).
9. Notifications module (WhatsApp + DLT SMS + email + consent).
10. Integrations module (Razorpay, IRP, Aadhaar, Tally).
11. Reporting, audit, platform, customer-portal, consignor-portal rounded out.
12. Backend wiring pass — behind the same contracts.
