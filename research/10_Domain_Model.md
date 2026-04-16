# 10 · Domain Model & Core Entities

The entity catalog for the DMS. This is the backbone every feature spec, database migration, API contract, and agent prompt refers to when it needs to be specific about data. Entities are grouped by bounded context (module). Attributes listed are the conceptual shape, not the full Prisma schema — migrations are the authoritative physical schema.

Use this doc as a read-only reference. Changes here must precede migration changes.

---

## 1. Context map (high-level)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Identity   │    │  Customers   │    │   Inventory  │
│ (users,      │    │ (customer    │    │ (Vehicle,    │
│  roles,      │    │  master,     │    │  VIN ledger, │
│  sessions)   │    │  vehicles    │    │  CPO cert,   │
│              │    │  registered) │    │  refurb)     │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │              ┌────▼────┐         ┌────▼────┐
       │              │  Sales  │         │ Service │
       │              │  CRM    │         │ (RO,VHC,│
       │              │ (Lead,  │         │ warranty│
       │              │  Deal,  │         │  claims)│
       │              │  Quote) │         │         │
       │              └────┬────┘         └────┬────┘
       │                   │                   │
       │              ┌────▼───────────────────▼────┐
       │              │         Finance             │
       │              │ (Invoice, Payment, AR, AP,  │
       │              │  Commission, GST, TCS,      │
       │              │  per-VIN ledger, warranty   │
       │              │  reserve)                   │
       │              └────┬────────────────────────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│   Parts      │    │Notifications │
│ (Parts Master│    │ (WhatsApp,   │
│  Stock, PO,  │    │  SMS, email, │
│  GRN)        │    │  consent log)│
└──────────────┘    └──────────────┘
```

Cross-cutting: Audit Log, Consent Ledger, Reporting, Platform (feature flags, health).

---

## 2. Identity & RBAC

### 2.1 `User`

An employee, contractor, or occasionally a system account with credentials.

| Attribute | Type | Notes |
|---|---|---|
| id | UUID | |
| email | string | unique |
| phone | string | E.164; unique |
| full_name | string | |
| password_hash | string | Argon2id |
| mfa_enrolled | boolean | |
| mfa_secret | encrypted | |
| status | enum | Active / Suspended / Offboarded |
| primary_role_id | FK Role | |
| primary_outlet_id | FK Outlet | nullable (regional / HQ users) |
| pii_class | — | partial PII; access restricted to HR + Super Admin |

### 2.2 `Role`, `Permission`, `UserRoleAssignment`

Roles are collections of Permissions. Users can have multiple Role Assignments scoped by Outlet. See Doc 14 for full matrix.

| Entity | Key attrs |
|---|---|
| Role | id, name (e.g., `outlet_manager`), description |
| Permission | id, resource (e.g., `deal`), action (e.g., `update`), conditions (JSON) |
| RolePermission | role_id, permission_id |
| UserRoleAssignment | user_id, role_id, outlet_id (nullable for cross-outlet roles) |

### 2.3 `Session`, `RefreshToken`

Standard JWT + refresh pattern. Revocation list in Redis.

### 2.4 `Outlet`

| Attribute | Type | Notes |
|---|---|---|
| id | UUID | |
| name | string | e.g., "Mumbai - Bandra West" |
| city | string | |
| state_code | string | ISO subdivision |
| gstin | string | state-specific |
| address | JSONB | |
| geo | point | for storefront "nearest outlet" |
| brands_supported | string[] | e.g., ['BMW','Audi','Porsche'] |
| bay_count | int | service capacity baseline |
| status | enum | Active / Inactive / Planned |

---

## 3. Customers & Vehicles-Registered

### 3.1 `Customer`

A single individual who has engaged with us. Cross-outlet entity.

| Attribute | Notes |
|---|---|
| id | UUID |
| full_name | |
| phone_e164 | unique |
| email | nullable; unique when present |
| pan | encrypted; nullable pre-KYC |
| aadhaar_hash | hash-only; raw never stored |
| dob | nullable |
| pincode / city / state | |
| kyc_level | enum: None / DL / Basic / Full |
| preferred_language | enum: en / hi / ... |
| preferred_channel | enum: WhatsApp / SMS / Email |
| pii_class | full PII |
| created_at, updated_at | |

### 3.2 `CustomerConsent` (denormalized convenience view; see Consent Ledger §12)

Latest consent state per (customer, purpose) for fast lookups.

### 3.3 `RegisteredVehicle`

Vehicle owned by a customer and registered in their portal. Not the same as a Vehicle in our inventory (though they can coincide when we've sold the car).

| Attribute | Notes |
|---|---|
| id | |
| customer_id | FK Customer |
| vin | 17 char; unique globally in our system |
| make, model, year, variant, color | |
| rc_number | |
| rc_document_s3_key | |
| insurance_expiry | |
| puc_expiry | |
| warranty (OEM) | JSON: end_date, km_limit |
| warranty (CPO) | JSON: end_date, coverage_tier |
| service_reminder_km | next-due |
| acquired_from_us | boolean | did we sell this car? |
| first_registered_at | |
| current_km | |

---

## 4. Inventory & Vehicles

### 4.1 `Vehicle` (inventory Vehicle, identified by VIN)

The canonical entity for a car we own or consign.

| Attribute | Notes |
|---|---|
| vin | **PK** (17 chars) |
| ownership_type | enum: Owned / Consignment |
| consignor_id | FK Consignor, nullable (NOT NULL when Consignment) |
| make, model, year, variant, color | |
| engine_cc, fuel_type | |
| transmission | |
| km_at_acquisition | |
| current_km | |
| acquisition_source | enum: DirectInbound / TradeIn / FleetReturn / Auction / Consignment |
| acquisition_date | |
| acquisition_price | |
| current_outlet_id | FK Outlet |
| current_listing_state | enum: see Doc 11 state machine |
| listed_price | computed from pricing rules |
| floor_price | computed |
| list_price | computed |
| sold_at | nullable |
| sold_to_customer_id | FK Customer, nullable |
| sold_at_price | nullable |
| current_cpo_cert_id | FK CPOCertification, nullable |
| tags | string[] (e.g., 'collector', 'demo', 'low_km') |

### 4.2 `VehicleCostEntry` (per-VIN cost ledger)

Append-only ledger of cost components accruing against a VIN. Summed at any time to compute Landed Cost.

| Attribute | Notes |
|---|---|
| id | |
| vin | FK Vehicle |
| entry_type | enum: Acquisition / Transport / RefurbParts / RefurbLabor / Certification / OverheadAllocation / HoldingCost / Adjustment |
| amount | decimal |
| currency | INR default |
| entry_date | |
| source_type | enum: PO / RO / GL / Manual / SystemJob |
| source_ref | UUID, polymorphic per source_type |
| notes | |
| created_by | FK User |
| created_at | |

### 4.3 `Consignor` (when Q4 consignment is active)

| Attribute | Notes |
|---|---|
| id | |
| customer_id | FK Customer (may reuse existing customer) |
| agreement_s3_key | signed consignment agreement |
| marketing_fee_pct | negotiated |
| expected_return_terms | free-text |
| agreement_start, agreement_end | |

### 4.4 `CPOCertification`

| Attribute | Notes |
|---|---|
| id | |
| vin | FK Vehicle |
| program_code | e.g., 'ASSURED_LUXURY' / 'ASSURED_STANDARD' |
| template_version | links to InspectionTemplate version |
| inspector_id | FK User |
| countersigned_by | FK User |
| completed_at | |
| pass_fail | enum: Pass / Conditional / Fail |
| public_cert_id | short human-friendly code shown on QR |
| cert_pdf_s3_key | |
| warranty_policy_id | FK WarrantyPolicy |
| expires_at | certification validity |

### 4.5 `InspectionTemplate`, `InspectionCheckpoint`, `InspectionResult`

Template-driven inspection system shared by CPO Certification, Acquisition Inspection, VHC, and PPI.

| Entity | Key attrs |
|---|---|
| InspectionTemplate | id, name, type (CPO/Acquisition/VHC/PPI), version, is_active |
| InspectionCheckpoint | template_id, sequence, zone, title, description, photo_required_on, severity_scale |
| InspectionResult | id, checkpoint_id, parent_inspection_id, parent_inspection_type, state (Pass/Fail/Note), severity, photo_urls, notes, inspected_at, inspected_by |

### 4.6 `PhotographySession`, `PhotoAsset`

Per-VIN media package (photos, 360°, video).

### 4.7 `ListingPricingRule`

Admin-configurable floor/list rules, stale-stock drop rules per segment.

---

## 5. Sales CRM

### 5.1 `Lead`

| Attribute | Notes |
|---|---|
| id | |
| source | enum: Website / Walkin / Phone / WhatsApp / Referral / Aggregator |
| source_detail | e.g., aggregator name |
| customer_id | FK Customer (may be created on capture) |
| interested_vin | FK Vehicle, nullable |
| budget_min, budget_max | |
| brand_preference | |
| current_stage | enum: New / Qualified / TestDrive / Negotiation / Token / Paperwork / Delivery / Delivered |
| owner_user_id | FK User (sales exec) |
| routing_reason | enum: RoundRobin / Specialist / Location / Language / Escalation |
| sla_clock_expires_at | |
| created_at | |

### 5.2 `Deal`

Materializes a serious lead into a pipeline object with Quote versioning.

| Attribute | Notes |
|---|---|
| id | |
| lead_id | FK Lead |
| primary_vin | FK Vehicle |
| stage | mirrors Lead stage enum |
| stage_changed_at | |
| closing_amount | decimal, nullable |
| probability | int % |
| expected_close_date | |
| finance_applied_partner | enum: HDFC / ICICI / Other / None |
| finance_status | enum: NotStarted / SoftPullSent / SanctionPending / Sanctioned / Disbursed |
| token_paid_at, token_amount | |
| invoice_id | FK Invoice, nullable |
| handover_id | FK Handover, nullable |

### 5.3 `Quote`

| Attribute | Notes |
|---|---|
| id | |
| deal_id | FK Deal |
| vin | FK Vehicle |
| version | int, increments |
| parent_quote_id | self-FK, nullable |
| status | enum: Draft / Sent / Expired / Accepted / Superseded |
| line_items | JSONB (ex-showroom, accessories, ext. warranty, insurance, RTO, GST-margin, TCS, tradein, discount) |
| total_on_road | decimal |
| gst_breakdown | JSONB |
| sent_at, expires_at | |
| accepted_at | |
| created_by | FK User |

### 5.4 `TestDrive`

| Attribute | Notes |
|---|---|
| id | |
| customer_id | |
| vin | |
| scheduled_at | |
| dl_number, dl_doc_s3_key | |
| insurance_rider_ref | |
| return_condition_checklist | JSONB |
| completed_at | |
| status | enum: Scheduled / InProgress / Completed / NoShow / Cancelled |

### 5.5 `CommissionAccrual`

| Attribute | Notes |
|---|---|
| id | |
| deal_id | FK |
| user_id | FK (earner) |
| role_at_time | enum |
| base_commission | decimal |
| slab_bonus | decimal |
| clawback | decimal |
| net_accrual | computed |
| payout_cycle | e.g., '2026-05' |
| status | enum: Accrued / PaidOut / Reversed |

---

## 6. Service

### 6.1 `ServiceBooking`

| Attribute | Notes |
|---|---|
| id | |
| customer_id | |
| vin | FK Vehicle (from RegisteredVehicle or free-text if third-party) |
| outlet_id | |
| slot_start, slot_end | |
| drop_mode | enum: SelfDrop / PickupDrop / ChauffeurPickup |
| loaner_requested | boolean |
| concerns | JSONB |
| status | enum: Requested / Confirmed / CheckedIn / InService / Delivered / NoShow / Cancelled |
| channel | enum: Portal / WhatsApp / Phone / Walkin / Reminder |

### 6.2 `RepairOrder` (RO)

Core service entity; see Doc 11 state machine.

| Attribute | Notes |
|---|---|
| id | |
| ro_number | human-readable (per-outlet, year-based sequence) |
| vin | FK Vehicle |
| customer_id | FK Customer |
| outlet_id | FK Outlet |
| service_booking_id | FK, nullable |
| service_advisor_id | FK User |
| primary_technician_id | FK User, nullable (multiple techs via LaborEntry) |
| bay_id | FK Bay |
| state | see Doc 11 |
| state_changed_at | |
| complaint_summary | short text |
| estimated_total | decimal |
| approved_total | decimal |
| final_total | decimal |
| warranty_claim_id | FK, nullable |
| invoice_id | FK Invoice, nullable |
| created_at | |
| delivered_at | |

### 6.3 `ROLineItem` (3C)

| Attribute | Notes |
|---|---|
| id | |
| ro_id | FK |
| sequence | |
| complaint | text (customer words) |
| cause | text (diagnosis) |
| correction | text (action taken) |
| labor_op_code | FK LaborOperation |
| labor_hours_flat_rate | decimal |
| labor_hours_actual | decimal (from clock-ins) |
| labor_rate | decimal/hr |
| parts_total | decimal |
| warranty_flag | boolean |
| approval_state | enum: Unapproved / Approved / Declined / Auto |
| approval_evidence | WhatsApp msg ref or OTP ref |

### 6.4 `LaborEntry` (technician clock-in/out)

| Attribute | Notes |
|---|---|
| id | |
| ro_id | FK |
| line_item_id | FK, nullable (may be RO-level) |
| technician_id | FK User |
| clock_in, clock_out | |
| duration_billable | derived |
| pause_reason | nullable enum |

### 6.5 `PartsRequisition`

| Attribute | Notes |
|---|---|
| id | |
| ro_id | FK |
| part_number | FK Part |
| quantity_requested, quantity_issued, quantity_returned | |
| issue_at, return_at | |
| status | enum: Requested / Picked / Issued / Partially Returned / Fully Returned / BackOrdered |

### 6.6 `VehicleHealthCheck` (VHC)

Distinct from RO but usually paired with one.

| Attribute | Notes |
|---|---|
| id | |
| ro_id | FK, nullable (always has one in current design) |
| vin | FK Vehicle |
| performed_by | FK User (tech) |
| template_id | FK InspectionTemplate |
| overall_traffic_light | enum: Green / Amber / Red |
| report_pdf_s3_key | |
| whatsapp_sent_at | |
| customer_responses | JSONB (per-item approve/decline/call) |

### 6.7 `WarrantyPolicy`, `WarrantyClaim`

| Entity | Key attrs |
|---|---|
| WarrantyPolicy | id, program_code, coverage_matrix_json, term_months, km_limit, transferable, underwriter (us / OEM / provider) |
| WarrantyClaim | id, policy_id, vin, ro_id, amount_claimed, amount_approved, state, filed_at, settled_at |

### 6.8 `Bay`, `ServiceSlot`

| Entity | Key attrs |
|---|---|
| Bay | id, outlet_id, code, lift_capacity, equipment_tags |
| ServiceSlot | id, bay_id, tech_assignable, start, end, booking_id (nullable) |

### 6.9 `TechnicianCertification`

| Attribute | Notes |
|---|---|
| id | |
| user_id | FK |
| certification_code | e.g., 'BMW_STAR_SENIOR' |
| issued_at, expires_at | |
| issuing_body | |
| evidence_s3_key | |

### 6.10 `DiagnosticToolLicense`, `SpecialTool`

Licensing + calibration tracking.

### 6.11 `CourtesyVehicle`, `CourtesyVehicleBooking`

Loaner pool + assignment records.

### 6.12 `BodyShopJob` (v1 per Q9)

| Attribute | Notes |
|---|---|
| id | |
| ro_id | FK (extends RO) |
| accident_report_s3_key | |
| insurance_claim_number | |
| insurance_surveyor_name | |
| surveyor_assessment_s3_key | |
| dual_signoff_at | |
| panel_list | JSONB (per-panel labor/paint) |
| paint_booth_slot_id | FK |

---

## 7. Parts

### 7.1 `Part` (Parts Master)

| Attribute | Notes |
|---|---|
| part_number | PK |
| oem_brand | |
| description | |
| category | enum |
| uom | unit of measure |
| criticality | enum: Routine / Common / Critical / Safety |
| hsn | default '8708' |
| superseded_by | FK self, nullable |
| aftermarket_crossrefs | string[] |
| handling_notes | |

### 7.2 `PartsStock`

| Attribute | Notes |
|---|---|
| part_number | FK |
| outlet_id | FK |
| quantity | |
| min_stock, max_stock | |
| abc_class, ved_class | |
| bin_location | |

### 7.3 `PurchaseOrder`, `POLineItem`, `GRN`, `GRNLineItem`

Standard PO → GRN → AP flow with 3-way match.

### 7.4 `PartBatch` (for safety-critical)

Batch/serial tracking per airbag, ECU, seatbelt, EV battery module.

---

## 8. Finance

### 8.1 `Invoice`

| Attribute | Notes |
|---|---|
| id | |
| invoice_number | per-GSTIN year-based sequence |
| gstin | FK Outlet-scoped GSTIN |
| invoice_type | enum: VehicleSale / Service / Accessories / PPI / Consignment / CreditNote / DebitNote |
| deal_id | FK, nullable |
| ro_id | FK, nullable |
| customer_id | FK |
| total_taxable_value | |
| gst_breakdown | JSONB (cgst/sgst/igst per rate) |
| gst_scheme | enum: Margin / Normal |
| tcs_amount | |
| total_amount | |
| irn | string, nullable (if IRP submitted) |
| qr_data | string, nullable |
| ack_no, ack_date | |
| status | enum: Draft / Generated / SubmittedToIRP / IRNReceived / Cancelled / Amended |
| parent_invoice_id | FK self, for credit/debit notes |
| pdf_s3_key | |

### 8.2 `InvoiceLineItem`

Per-line tax classification; HSN/SAC; item type; quantity; amount.

### 8.3 `Payment`, `PaymentAllocation`

Inbound payments from customers; allocation against invoices.

| Attribute | Notes |
|---|---|
| Payment.id | |
| method | enum: UPI / Card / NEFT / RTGS / IMPS / Cash / Cheque |
| provider | enum: Razorpay / Bank / POS / Cash |
| provider_ref | transaction id / UTR |
| amount, currency | |
| received_at | |
| status | enum: Pending / Received / Reversed |
| customer_id | FK |
| PaymentAllocation | payment_id, invoice_id, amount_allocated |

### 8.4 `Vendor`, `Bill`, `VendorPayment`

AP side.

### 8.5 `GSTLedger`, `TCSLedger`, `TDSLedger`

Monthly period buckets with liability, paid, ITC, net. Feeds returns.

### 8.6 `CommissionPayout`

Aggregation of accruals into a payout cycle; payout file export.

### 8.7 `WarrantyReserveEntry`

Accrual and release entries against warranty reserve liability.

### 8.8 `BankAccount`, `BankTransaction`, `Reconciliation`

### 8.9 `ChartOfAccount`, `JournalVoucher`, `JournalLine`

GL tier. If Q8 is closed as "in-house accounting", this tier expands significantly (see deferred decisions memo).

---

## 9. Notifications

### 9.1 `NotificationTemplate`

| Attribute | Notes |
|---|---|
| id | |
| channel | enum: WhatsApp / SMS / Email / InApp |
| code | stable identifier |
| whatsapp_meta_template_id | nullable |
| sms_dlt_template_id | nullable |
| language | enum |
| body | string with placeholders |
| variables | JSONB schema |
| approval_status | enum (for WA/SMS) |

### 9.2 `NotificationEvent`

| Attribute | Notes |
|---|---|
| id | |
| template_code | |
| recipient_type | enum: Customer / User / Prospect |
| recipient_id | UUID |
| channel | |
| variables | JSONB |
| scheduled_for | |
| sent_at | |
| delivery_status | enum: Pending / Sent / Delivered / Read / Failed |
| provider_ref | BSP message id |
| consent_check_passed | boolean |

### 9.3 `ReminderSchedule`

Durable schedule for recurring reminders (service-due, insurance-expiry, etc.).

---

## 10. Integrations

### 10.1 `IntegrationAccount`

Per-integration credentials (Razorpay account, BSP account, GSP credentials, Bank API creds, KYC partner creds).

### 10.2 `IntegrationEventLog`

Inbound/outbound call logs with request/response hash (not body by default), latency, retry count, result.

### 10.3 `WebhookDelivery`, `WebhookEvent`

Inbound webhooks with idempotency handling.

---

## 11. Audit & Compliance

### 11.1 `AuditLogEntry`

| Attribute | Notes |
|---|---|
| id | sequential bigint |
| entity_type | |
| entity_id | |
| action | enum: Create / Update / Delete / Read-Sensitive |
| actor_user_id | |
| session_id | |
| ip | |
| device_fp | |
| before | JSONB |
| after | JSONB |
| diff | JSONB (computed) |
| ts | timestamptz UTC |
| prev_hash | bytea |
| this_hash | bytea (generated) |

### 11.2 `ConsentEvent`

| Attribute | Notes |
|---|---|
| id | |
| subject_type | enum: Customer / Employee / Vendor |
| subject_id | UUID |
| purpose | enum: KYC / Marketing / ServiceComms / Analytics / Referral / DataProcessing |
| scope | JSONB |
| state | enum: Granted / Revoked / Expired |
| evidence_artifact_s3_key | |
| ip, device_fp | |
| recorded_at | |

### 11.3 `DataSubjectRequest`

DPDP-driven DSR tracking (access/correction/deletion/grievance).

### 11.4 `RetentionJob`

Scheduled jobs that delete/anonymize per retention policy.

---

## 12. Platform

### 12.1 `FeatureFlag`, `FeatureFlagEvaluation`

### 12.2 `Setting` (key-value, org + outlet scope)

### 12.3 `JobRun`, `JobFailure`

Background-job observability.

---

## 13. Key relationships (summary)

- One `Customer` has many `RegisteredVehicle`s.
- One `Customer` has many `Lead`s, `Deal`s, `TestDrive`s, `ServiceBooking`s, `RO`s, `Invoice`s, `Payment`s, `ConsentEvent`s.
- One `Vehicle` (VIN) has many `VehicleCostEntry`, one current `CPOCertification`, many `RO`s (service history), optionally one `Deal` reserving it.
- One `Deal` has many `Quote` versions, one `Invoice`, one `Handover`, many `CommissionAccrual`s.
- One `RO` has many `ROLineItem`s, many `LaborEntry`s, many `PartsRequisition`s, one (or nullable) `VHC`, one `Invoice`.
- One `Outlet` belongs to one `State` and one `GSTIN`; users are scoped by outlet (RLS).
- One `Consignor` has many `Vehicle`s in Consignment ownership.

---

## 14. Aggregate boundaries (DDD-ish)

Strong aggregates (one transaction, one writer):
- **Deal aggregate**: Deal + Quote versions + Test Drives + Commission Accruals
- **RO aggregate**: RO + Line Items + Labor Entries + Parts Requisitions + VHC
- **Vehicle aggregate**: Vehicle + Vehicle Cost Entries + Current CPO Certification
- **Invoice aggregate**: Invoice + Line Items + IRP submission state + Credit Notes

Across aggregates, use events and sagas (not multi-aggregate transactions).

---

## 15. Shared value objects

- `Money { amount_minor, currency }` — always in minor units (paise) internally
- `GSTBreakdown { cgst, sgst, igst, cess, scheme, hsn }`
- `Address { line1, line2, city, state_code, pincode, country }`
- `PhoneE164 { country_code, subscriber_number }`
- `IndianPAN { value (encrypted at rest, masked in logs) }`
- `VIN { value (17-char, validated checksum) }`
- `RegistrationNumber { state_code, rto_code, series, number }`

---

## 16. Notes for spec authors

When writing a feature spec, include a short "Entities touched" section citing entries here. If a spec needs a new entity, propose it here first (via PR), get review, then implement. Agents generating specs must load this doc early.

When the entity model is ambiguous for your feature, escalate — ambiguity at this layer creates downstream rework at 10× the cost of resolving it here.
