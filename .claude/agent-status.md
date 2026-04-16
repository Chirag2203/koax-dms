# Agent Status — Customer Web Modules

**Last updated:** 2026-04-16
**Overall status:** ALL 3 CUSTOMER MODULES COMPLETE

## Module 13: Storefront — SHIPPED
- 8 pages: Landing, VDP, Collection, Cities, Certification, Service, Journal, Sell
- 3 specs written (SPEC-STOREFRONT-001 through 003)
- VDP gallery: Cinematic Grid (Proposal 2)
- 28 vehicles with Unsplash images, Indian pricing

## Module 14: Customer Portal — SHIPPED
- 8 pages: Sign-in, Sign-up, Account, Vehicles, Vehicle Detail, Bookings, Documents, Preferences
- Mock auth via localStorage (any email works)
- Portal sidebar nav (desktop) + bottom tabs (mobile)
- 1 mock customer (Arjun Mehta), 3 owned vehicles, 2 saved, 1 reservation, 2 bookings, 8 service records, 15 documents

## Module 15: Consignor Portal — SHIPPED
- 5 pages: Dashboard, Vehicles, Payouts, Messages, Documents
- Routes at /consignor/* (real URL segment, not route group)
- 2 consigned vehicles, 2 payouts, 8 messages, 2 agreements
- Financial breakdown: sale - fee - reimbursables = net payout

## Routes Summary (21 total)
```
/ — Landing (storefront)
/collection — Inventory listing with 7 filters
/collection/[vin] — Vehicle Detail Page
/cities — Our Cities (3 outlets)
/certification — The BN Standard
/service — Service & Maintenance
/journal — The Journal
/sell — Sell Your Car
/sign-in — Auth sign-in
/sign-up — Auth sign-up
/account — Customer account home
/vehicles — My Vehicles
/vehicles/[vin] — Vehicle detail (service history + docs)
/bookings — Upcoming bookings
/documents — Document vault
/preferences — Communication preferences
/consignor — Consignor dashboard
/consignor/vehicles — Consigned vehicles
/consignor/payouts — Payout tracking
/consignor/messages — Advisor correspondence
/consignor/documents — Consignment agreements
```

## Git Commits
1. `feat: complete customer storefront` — 220 files
2. `feat: complete customer portal` — 57 files
3. `feat: complete consignor portal` — 31 files
