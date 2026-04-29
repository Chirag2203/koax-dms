---
spec_id: SPEC-CUSTOMER-PORTAL-001
domain: customer-portal
title: Customer Portal (Account, Vehicles, Bookings, Documents, Preferences)
status: shipped
risk_level: medium
pii_sensitivity: high
flags: [customer-portal.v1]
owners: [planner, ux-writer, security-reviewer, qa-planner, integrator]
depends_on:
  - SPEC-STOREFRONT-001 (header, footer, VehicleCard, PriceDisplay)
docs_consulted:
  - Doc 03 §3 (Customer account & portal — authoritative)
  - Doc 03 §3.1 (Account identity), §3.2 (My Vehicles), §3.3 (Service booking), §3.4 (Test drive), §3.5 (Document vault), §3.6 (Loyalty)
  - Doc 09 (Glossary)
  - Doc 14 §R20 (Customer role)
  - Design 01 §2 (Customer tokens)
  - Stitch export: 03-account.html, 03-account.jpg
effective_date: 2026-04-16
---

# SPEC-CUSTOMER-PORTAL-001 — Customer Portal

## 1. Summary

The Customer Portal is the authenticated private space for BN Automobiles customers. Per Doc 03 §3: "The portal is the most underbuilt surface in Indian luxury pre-owned. It is cheap to build, hard for incumbents to retrofit, and drives lifetime value."

It provides: account home with personalized greeting, saved vehicles shelf, reservations, bookings (test drive + service), multi-vehicle garage with service history timeline, document vault (RC, insurance, PUC, warranty, invoices), and DPDP-compliant communication preferences.

Routes live under `app/(portal)/` with a separate layout, auth guard, and sidebar navigation.

## 2. Goals

- Customer sees their complete automotive relationship with BN in one place
- Multi-vehicle support (Indian families own 2-4 cars)
- Service history as editorial ledger (increases resale value narrative)
- India-specific document vault (RC, insurance, PUC — all expire on different dates)
- DPDP-compliant consent management with per-channel toggles
- Mock auth layer for v1 (any email signs in after 1s delay)

## 3. Non-goals

- Real authentication (OAuth, OTP verification) — v1.5
- Real-time RO status tracking — v1.5
- WhatsApp-button approval for additional service work — v1.5
- OCR on document upload — v1.5
- Loyalty points ledger — v1.5

## 4. Pages

| Page | Route | Description |
|------|-------|-------------|
| Sign In | `/sign-in` | Email + dummy OTP |
| Sign Up | `/sign-up` | Name, email, phone, city, language |
| Account Home | `/account` | Greeting, saved cars, reservations, visits, service history preview |
| My Vehicles | `/vehicles` | Owned vehicle cards with service-due badges |
| Vehicle Detail | `/vehicles/[vin]` | Service timeline + documents for one vehicle |
| Bookings | `/bookings` | Test drives + service appointments |
| Documents | `/documents` | All documents across vehicles |
| Preferences | `/preferences` | Communication toggles, language, outlet |

## 5. Build Order

- **P0**: Auth mock + portal layout + types + fixtures + MSW handlers
- **P1**: Account home (greeting, shelves, reservations, visits, history preview)
- **P2**: My Vehicles + Vehicle detail (service timeline + documents)
- **P3**: Bookings + Documents pages
- **P4**: Preferences (toggles, consent, outlet, language)
- **P5 (deferred to v1.1)**: Consent log integration with staff-side `customers-store` — see §5.1

### 5.1 Deferred — Consent log cross-side integration (DEF-PORTAL-1)

**Status:** spec-only; not yet implemented.

**Problem.** As of the 2026-04-29 pass, `customers-store.consents` (staff-web) has been promoted from a stub to a real read+revoke surface (SPEC-CUSTOMERS-001 S-C-10, S-C-14). The portal's Preferences page (P4) currently writes per-channel opt-in/out booleans to `R20Customer.notificationPrefs` but does NOT write a `ConsentEntry` row to the staff-side consent-log. Result: when a customer revokes WhatsApp marketing via the portal, the staff Consents tab continues to show the consent as active until a staff member manually revokes it.

**v1.1 contract.** Portal Preferences page must:

1. On any consent toggle change, call a new bridge action `recordPortalConsentChange(customerId, purpose, granted, source: 'PORTAL_TOGGLE')`. The bridge writes:
   - For grant (toggle ON): a fresh `ConsentEntry` with `capturedAt: now`, `capturedBy: customerId`, `capturedByName: <customer name>`, `source: 'PORTAL_SIGNUP'`. If a prior revoked entry exists for the same purpose, the new entry supersedes it (do not mutate the historic row — append-only ledger).
   - For revoke (toggle OFF): set `revokedAt: now`, `revokedBy: customerId`, `revokedByName: <customer name>`, `revocationReason: 'Customer self-revoke via portal'` on the latest active entry for that purpose.
2. The bridge dispatches a `CONSENT_WITHDRAWN` audit event to the customer audit log (visible to R09+ on staff-side via the Profile audit trail).
3. Insurance audience builders (per SPEC-INSURANCE-001 L14) re-evaluate the opt-out registry at `sendTemplateMessage` boundary — once the bridge writes the revocation, the customer is excluded from the next batch send within minutes.

**Locked decision** (proposed L_PORTAL_2 — to be locked when v1.1 ships):
"Portal consent toggles write append-only `ConsentEntry` rows to the staff-side `customers-store.consents`; staff revocations and portal revocations share the same data model. There is no separate `R20Customer.notificationPrefs` shadow state — that field is removed from the schema in v1.1, and the Preferences UI reads/writes via the bridge. Migration: on v1.1 first-load, `notificationPrefs` is one-shot translated to `ConsentEntry` rows with `source: 'IMPORT'` for any customer who has prefs but no entries."

**Acceptance criteria** (for v1.1 implementer):

- Portal Preferences toggle directly drives `customers-store.consents`
- Withdrawal sets `revokedAt`/`revokedBy`/`revocationReason` (NEVER deletes the row)
- Customer Profile Audit trail on staff-side renders the portal-driven revocation event
- Insurance opt-out registry sees the revocation within the same tick (Zustand store subscription)
- E2E test: portal toggle off WhatsApp → run audience builder for an insurance campaign → customer is excluded with reason `consent-revoked`
- DPDP §6 audit: every consent change carries a timestamp, an actor (customer-id when self), and a purpose

**Cross-references:** SPEC-CUSTOMERS-001 §4 (`withdrawConsent`), §4.1 (ConsentEntry); SPEC-INSURANCE-001 L14 (opt-out boundary check).

## 6. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-16 | 0.1 | Claude (integrator) | Initial draft from research + plan agent |
| 2026-04-16 | 1.0 | Claude (integrator) | All 8 pages shipped. UI fixes: portal cards use token classes (bg-bg-subtle, border-line) instead of raw var(--color-*). Vehicle cards: 2x2 grid, equal height via flexbox, grayscale images with color-on-hover, actions contained within card. Booking cards dark-compatible. Service history table rows use token-based bg. Header shows profile avatar when signed in. 12 Zod types, mock customer with 3 owned vehicles. |
| 2026-04-29 | 1.1-spec | orchestrator | §5.1 added: P5 deferred — consent log cross-side integration (DEF-PORTAL-1). Spec-only update; identifies that the portal's Preferences page does not yet write to staff-side `customers-store.consents` (introduced in SPEC-CUSTOMERS-001 v1.1). Defines the bridge contract, proposed L_PORTAL_2 locked decision, migration path for `notificationPrefs`, and acceptance criteria for v1.1 implementation. |
