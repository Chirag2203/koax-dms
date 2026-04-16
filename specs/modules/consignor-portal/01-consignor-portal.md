---
spec_id: SPEC-CONSIGNOR-PORTAL-001
domain: consignor-portal
title: Consignor Portal
status: draft
risk_level: medium
pii_sensitivity: high
flags: [consignor-portal.v1]
owners: [planner, finance-reviewer, security-reviewer, integrator]
depends_on:
  - SPEC-CUSTOMER-PORTAL-001 (auth layer, portal patterns)
docs_consulted:
  - Doc 04 §2.6 (Consignment variant)
  - Doc 03 §3 (Portal patterns)
  - Doc 06 §GST (consignment GST differs from margin scheme)
  - Doc 09 (Glossary — Consignor)
  - Doc 14 §R21 (Consignor role)
effective_date: 2026-04-16
---

# SPEC-CONSIGNOR-PORTAL-001 — Consignor Portal

## 1. Summary

The Consignor Portal is a private area for vehicle owners who consign their cars to BN Automobiles for sale. Unlike the Customer Portal (buyer-focused), the Consignor Portal is seller-focused: the consignor tracks the marketing and sale of their vehicle, receives valuation updates, monitors viewings/interest, and tracks payouts.

Per Doc 04 §2.6: consignment means the owner retains title, BN markets for a fee (7-15% of sale price), and on sale, buyer pays BN → BN deducts fee + reimbursables → remits balance to consignor.

Routes live under `app/(consignor)/` with the same auth system as the customer portal (a consignor is a signed-in user with consigned vehicles).

## 2. Goals

- Consignor sees real-time status of their consigned vehicle(s)
- Transparent fee structure visible at all times
- Payout tracking with clear breakdown (sale price - fee - reimbursables = net payout)
- Communication log with BN team (viewing requests, offer updates, advisor messages)
- Document management for consignment agreement, vehicle docs

## 3. Non-goals

- Real payment processing (v1 shows mock payout status)
- Real-time chat (v1 shows message log, no live messaging)
- Multi-vehicle consignment management dashboard (v1 supports 1-3 vehicles)

## 4. Pages

| Page | Route | Description |
|------|-------|-------------|
| Consignor Dashboard | `/consignor` | Overview: vehicle status, interest/viewings, payout estimate |
| Vehicle Status | `/consignor/vehicles/[vin]` | Detailed status timeline, listing performance, photos |
| Payouts | `/consignor/payouts` | Payout breakdown, fee transparency, payment history |
| Messages | `/consignor/messages` | Communication log with BN team |
| Documents | `/consignor/documents` | Consignment agreement, vehicle docs |

## 5. Key data types

- `ConsignedVehicle`: vin, make, model, year, color, consignmentDate, askingPrice, currentListPrice, status (listed|reserved|under-offer|sold|withdrawn), viewingsCount, inquiriesCount, daysListed, photos, feePercentage
- `ConsignorPayout`: id, vehicleVin, salePrice, feeAmount, feePercentage, reimbursables, netPayout, status (pending|processing|completed), estimatedDate, completedDate
- `ConsignorMessage`: id, date, from (advisor|consignor), subject, body, isRead
- `ConsignmentAgreement`: id, vehicleVin, signedDate, feePercentage, duration, termsUrl

## 6. Build order

- **C0**: Types + fixtures + MSW handlers + consignor layout with nav
- **C1**: Dashboard + vehicle status pages
- **C2**: Payouts + messages + documents

## 7. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-16 | 0.1 | Claude (integrator) | Initial draft |
