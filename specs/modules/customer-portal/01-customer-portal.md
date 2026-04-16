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

## 6. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-16 | 0.1 | Claude (integrator) | Initial draft from research + plan agent |
| 2026-04-16 | 1.0 | Claude (integrator) | All 8 pages shipped. UI fixes: portal cards use token classes (bg-bg-subtle, border-line) instead of raw var(--color-*). Vehicle cards: 2x2 grid, equal height via flexbox, grayscale images with color-on-hover, actions contained within card. Booking cards dark-compatible. Service history table rows use token-based bg. Header shows profile avatar when signed in. 12 Zod types, mock customer with 3 owned vehicles. |
