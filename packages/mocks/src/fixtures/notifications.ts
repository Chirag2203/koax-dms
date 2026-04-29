/**
 * Notifications fixtures — SPEC-NOTIFICATIONS-001 §12
 *
 * 12 NotificationTemplate fixtures spanning 4 modules:
 *   - 3 APPROVED WhatsApp (INSURANCE)
 *   - 3 APPROVED SMS (SERVICE_BOOKING) — pre-requisite for Seam 27
 *   - 2 APPROVED WhatsApp (CUSTOM_BUILDS)
 *   - 2 APPROVED SMS (CUSTOMERS)
 *   - 1 PENDING_DLT (INSURANCE)
 *   - 1 DEPRECATED (SERVICE_BOOKING) — version chain demo
 *
 * 40 NotificationDispatch records across modules/channels/statuses:
 *   - Including 2 opted-out, 2 failed (terminal), 1 cancelled, 1 queued
 *   - consentSnapshot populated on every dispatch
 *   - 3 customers: cust-arjun-mehta (WHATSAPP_MARKETING revoked),
 *     cust-meera-iyer (active), cust-rohan-desai (opted-out via portal)
 *
 * Mock DLT IDs follow format DLT{16 digits} per Doc 09 §DLT.
 */

import type {
  NotificationTemplate,
  NotificationDispatch,
  NotificationAuditEvent,
} from '@dms/types';

// ─── Templates ────────────────────────────────────────────────────────────────

export const notificationTemplates: NotificationTemplate[] = [
  // ── INSURANCE: 3 APPROVED WhatsApp ────────────────────────────────────────
  {
    id: 'tmpl-ins-renewal-reminder',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    name: 'Insurance Renewal Reminder',
    bodyMarkdown:
      'Dear {{customer_name}}, your insurance policy for {{vehicle_reg}} expires on {{expiry_date}}. Renew now to stay protected. Reply YES to connect with our team.',
    variables: [
      { name: 'customer_name', type: 'string', required: true, example: 'Arjun Mehta' },
      { name: 'vehicle_reg', type: 'string', required: true, example: 'KA01AB1234' },
      { name: 'expiry_date', type: 'date', required: true, example: '30 May 2026' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT1234567890123456',
    lastUpdatedAt: '2026-01-15T10:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-01-20T09:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },
  {
    id: 'tmpl-ins-policy-quote',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    name: 'Insurance Policy Quote',
    bodyMarkdown:
      'Hello {{customer_name}}, we have a personalised insurance quote for your {{vehicle_make_model}}. Quote amount: ₹{{quote_amount}}. Valid till {{valid_till}}. Tap to view details.',
    variables: [
      { name: 'customer_name', type: 'string', required: true, example: 'Meera Iyer' },
      { name: 'vehicle_make_model', type: 'string', required: true, example: 'BMW 5 Series' },
      { name: 'quote_amount', type: 'currency', required: true, example: '42500' },
      { name: 'valid_till', type: 'date', required: true, example: '15 May 2026' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT2345678901234567',
    lastUpdatedAt: '2026-02-01T11:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-02-05T10:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },
  {
    id: 'tmpl-ins-campaign-promo',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    name: 'Insurance Campaign Promo',
    bodyMarkdown:
      'Exclusive offer for BN Automobiles customers! Get comprehensive insurance for your premium vehicle at special rates. Limited time only. Contact us: {{outlet_phone}}',
    variables: [
      { name: 'outlet_phone', type: 'phone', required: true, example: '+91 98765 43210' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT3456789012345678',
    lastUpdatedAt: '2026-03-01T09:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-03-05T11:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },

  // ── SERVICE_BOOKING: 3 APPROVED SMS ───────────────────────────────────────
  {
    id: 'DLT_SVC_BOOKING_CREATED',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    name: 'Service Booking Received',
    bodyMarkdown:
      'Your service booking {{job_no}} at BN Automobiles {{outlet}} has been received for {{date}}. Our team will confirm shortly. BN Automobiles.',
    variables: [
      { name: 'job_no', type: 'string', required: true, example: 'JC-2026-00045' },
      { name: 'outlet', type: 'string', required: true, example: 'Bangalore' },
      { name: 'date', type: 'date', required: true, example: '28 Apr 2026' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT4567890123456789',
    lastUpdatedAt: '2026-01-10T08:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-01-12T10:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },
  {
    id: 'DLT_SVC_BOOKING_CONFIRMED',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    name: 'Service Booking Confirmed',
    bodyMarkdown:
      'Your service booking {{job_no}} at BN Automobiles {{outlet}} on {{date}} is CONFIRMED. Kindly arrive 10 minutes early. BN Automobiles.',
    variables: [
      { name: 'job_no', type: 'string', required: true, example: 'JC-2026-00045' },
      { name: 'outlet', type: 'string', required: true, example: 'Bangalore' },
      { name: 'date', type: 'date', required: true, example: '28 Apr 2026' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT5678901234567890',
    lastUpdatedAt: '2026-01-10T08:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-01-12T10:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },
  {
    id: 'DLT_SVC_BOOKING_DECLINED',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    name: 'Service Booking Declined',
    bodyMarkdown:
      'We regret to inform you that your service booking {{job_no}} at BN Automobiles {{outlet}} could not be accommodated. Please call us to reschedule. BN Automobiles.',
    variables: [
      { name: 'job_no', type: 'string', required: true, example: 'JC-2026-00045' },
      { name: 'outlet', type: 'string', required: true, example: 'Bangalore' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT6789012345678901',
    lastUpdatedAt: '2026-01-10T08:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-01-12T10:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },

  // ── CUSTOM_BUILDS: 2 APPROVED WhatsApp ────────────────────────────────────
  {
    id: 'DLT_CB_STAGE_UPDATE',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    name: 'Custom Build Stage Update',
    bodyMarkdown:
      'Great news, {{customer_name}}! Your custom build "{{job_title}}" has progressed to: *{{stage}}*. {{estimated_date}}. Track progress on the BN portal.',
    variables: [
      { name: 'customer_name', type: 'string', required: true, example: 'Rohan Desai' },
      { name: 'job_title', type: 'string', required: true, example: 'BMW M4 Stormtrooper' },
      { name: 'stage', type: 'string', required: true, example: 'Parts Ordering' },
      { name: 'estimated_date', type: 'string', required: false, example: 'Est. delivery: 15 Jun 2026' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT7890123456789012',
    lastUpdatedAt: '2026-02-15T10:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-02-18T09:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },
  {
    id: 'DLT_CB_DELIVERY_READY',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    name: 'Custom Build Delivery Ready',
    bodyMarkdown:
      'Your dream build is ready! {{customer_name}}, your "{{job_title}}" has passed QC and is ready for delivery. Our team will call to schedule your delivery appointment.',
    variables: [
      { name: 'customer_name', type: 'string', required: true, example: 'Arjun Mehta' },
      { name: 'job_title', type: 'string', required: true, example: 'Porsche 911 GT3 Edition' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT8901234567890123',
    lastUpdatedAt: '2026-02-15T10:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-02-18T09:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },

  // ── CUSTOMERS: 2 APPROVED SMS ─────────────────────────────────────────────
  {
    id: 'DLT_CUST_CONSENT_CONFIRMED',
    channel: 'SMS',
    module: 'CUSTOMERS',
    name: 'DPDP Consent Confirmation',
    bodyMarkdown:
      'Thank you {{customer_name}}. Your data consent with BN Automobiles has been recorded. Reference: {{consent_id}}. You may withdraw consent at any time via the portal. BN Automobiles.',
    variables: [
      { name: 'customer_name', type: 'string', required: true, example: 'Meera Iyer' },
      { name: 'consent_id', type: 'string', required: true, example: 'consent-20260428-abc' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT9012345678901234',
    lastUpdatedAt: '2026-01-05T09:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-01-07T10:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },
  {
    id: 'DLT_CUST_CONSENT_WITHDRAWN',
    channel: 'SMS',
    module: 'CUSTOMERS',
    name: 'DPDP Consent Withdrawal Acknowledgement',
    bodyMarkdown:
      'We have received your consent withdrawal request, {{customer_name}}. Your marketing preferences have been updated. Data retention per DPDP Act 2023. BN Automobiles.',
    variables: [
      { name: 'customer_name', type: 'string', required: true, example: 'Rohan Desai' },
    ],
    status: 'APPROVED',
    dltTemplateId: 'DLT0123456789012345',
    lastUpdatedAt: '2026-01-05T09:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2026-01-07T10:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },

  // ── INSURANCE: 1 PENDING_DLT ──────────────────────────────────────────────
  {
    id: 'tmpl-ins-new-wip',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    name: 'Insurance Cross-Sell Offer',
    bodyMarkdown:
      'Dear {{customer_name}}, did you know BN Automobiles offers add-on covers for {{cover_type}}? Protect yourself from {{risk_description}}. Reply DETAILS to learn more.',
    variables: [
      { name: 'customer_name', type: 'string', required: true, example: 'Arjun Mehta' },
      { name: 'cover_type', type: 'string', required: true, example: 'zero depreciation' },
      { name: 'risk_description', type: 'string', required: true, example: 'accidental damage costs' },
    ],
    status: 'PENDING_DLT',
    lastUpdatedAt: '2026-04-25T10:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
  },

  // ── SERVICE_BOOKING: 1 DEPRECATED (version chain demo) ───────────────────
  {
    id: 'tmpl-svc-booking-confirmed-v1',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    name: 'Service Booking Confirmed (v1 — Deprecated)',
    bodyMarkdown: 'Booking confirmed. Job No: {{job_no}}. BN Automobiles.',
    variables: [
      { name: 'job_no', type: 'string', required: true, example: 'JC-2026-00045' },
    ],
    status: 'DEPRECATED',
    dltTemplateId: 'DLT1111111111111111',
    supersededBy: 'DLT_SVC_BOOKING_CONFIRMED',
    lastUpdatedAt: '2026-01-09T15:00:00.000Z',
    lastUpdatedBy: 'staff-r12-priya',
    approvedAt: '2025-12-01T09:00:00.000Z',
    approvedBy: 'staff-r12-priya',
  },
];

// ─── Dispatches ───────────────────────────────────────────────────────────────

const BASE_CONSENT_ACTIVE = {
  purpose: 'WHATSAPP_MARKETING' as const,
  capturedAt: '2025-11-01T10:00:00.000Z',
  capturedBy: 'staff-r09-raj',
  source: 'STAFF_FORM' as const,
};

const SERVICE_CONSENT_ACTIVE = {
  purpose: 'SERVICE_REMINDER' as const,
  capturedAt: '2025-10-15T09:00:00.000Z',
  capturedBy: 'PORTAL_SIGNUP',
  source: 'PORTAL_SIGNUP' as const,
};

const DATA_PROCESSING_CONSENT = {
  purpose: 'DATA_PROCESSING' as const,
  capturedAt: '2025-09-20T12:00:00.000Z',
  capturedBy: 'staff-r09-raj',
  source: 'STAFF_FORM' as const,
};

export const notificationDispatches: NotificationDispatch[] = [
  // ── INSURANCE dispatches ─────────────────────────────────────────────────

  // 1 — delivered (Arjun renewal)
  {
    id: 'notif-ins-001',
    templateId: 'tmpl-ins-renewal-reminder',
    templateName: 'Insurance Renewal Reminder',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: { customer_name: 'Arjun', vehicle_reg: 'KA01AB1234', expiry_date: '15 May 2026' },
    sentAt: '2026-04-20T09:15:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.ABC123DEF456',
    consentSnapshot: BASE_CONSENT_ACTIVE,
    sourceEntityId: 'lead-ins-001',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 2 — opted-out (Arjun revoked WHATSAPP_MARKETING — S-N-3)
  {
    id: 'notif-ins-002',
    templateId: 'tmpl-ins-campaign-promo',
    templateName: 'Insurance Campaign Promo',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: { outlet_phone: '+91 98765 43210' },
    sentAt: '2026-04-22T11:00:00.000Z',
    status: 'opted-out',
    retryCount: 0,
    consentSnapshot: {
      purpose: 'WHATSAPP_MARKETING',
      capturedAt: '2025-11-01T10:00:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'lead-ins-001',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 3 — delivered (Meera policy quote)
  {
    id: 'notif-ins-003',
    templateId: 'tmpl-ins-policy-quote',
    templateName: 'Insurance Policy Quote',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: {
      customer_name: 'Meera',
      vehicle_make_model: 'BMW 5 Series',
      quote_amount: '42500',
      valid_till: '15 May 2026',
    },
    sentAt: '2026-04-21T14:00:00.000Z',
    status: 'read',
    retryCount: 0,
    providerMessageId: 'wamid.GHI789JKL012',
    consentSnapshot: BASE_CONSENT_ACTIVE,
    sourceEntityId: 'lead-ins-002',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 4 — sent
  {
    id: 'notif-ins-004',
    templateId: 'tmpl-ins-renewal-reminder',
    templateName: 'Insurance Renewal Reminder',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: { customer_name: 'Meera', vehicle_reg: 'MH02CD5678', expiry_date: '20 Jun 2026' },
    sentAt: '2026-04-25T10:30:00.000Z',
    status: 'sent',
    retryCount: 0,
    providerMessageId: 'wamid.MNO345PQR678',
    consentSnapshot: BASE_CONSENT_ACTIVE,
    sourceEntityId: 'lead-ins-003',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 5 — failed terminal (S-N-7) — retryCount = 3
  {
    id: 'notif-ins-005',
    templateId: 'tmpl-ins-campaign-promo',
    templateName: 'Insurance Campaign Promo',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: { outlet_phone: '+91 98765 43210' },
    sentAt: '2026-04-18T16:00:00.000Z',
    status: 'failed',
    retryCount: 3,
    errorReason: 'BSP_TIMEOUT: Provider unreachable after 3 attempts',
    consentSnapshot: {
      purpose: 'WHATSAPP_MARKETING',
      capturedAt: '2025-09-20T12:00:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'lead-ins-004',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 6 — delivered
  {
    id: 'notif-ins-006',
    templateId: 'tmpl-ins-policy-quote',
    templateName: 'Insurance Policy Quote',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: {
      customer_name: 'Rohan',
      vehicle_make_model: 'Audi RS5',
      quote_amount: '68200',
      valid_till: '10 May 2026',
    },
    sentAt: '2026-04-15T11:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.STU901VWX234',
    consentSnapshot: DATA_PROCESSING_CONSENT,
    sourceEntityId: 'lead-ins-004',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 7 — opted-out (Rohan — opted out via portal)
  {
    id: 'notif-ins-007',
    templateId: 'tmpl-ins-renewal-reminder',
    templateName: 'Insurance Renewal Reminder',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: { customer_name: 'Rohan', vehicle_reg: 'TN04EF9012', expiry_date: '02 Jun 2026' },
    sentAt: '2026-04-24T09:45:00.000Z',
    status: 'opted-out',
    retryCount: 0,
    consentSnapshot: {
      purpose: 'WHATSAPP_MARKETING',
      capturedAt: '2025-09-20T12:00:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'lead-ins-005',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 8 — sent
  {
    id: 'notif-ins-008',
    templateId: 'tmpl-ins-renewal-reminder',
    templateName: 'Insurance Renewal Reminder',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: { customer_name: 'Meera', vehicle_reg: 'KA05GH3456', expiry_date: '30 May 2026' },
    sentAt: '2026-04-28T08:00:00.000Z',
    status: 'sent',
    retryCount: 0,
    providerMessageId: 'wamid.YZA567BCD890',
    consentSnapshot: BASE_CONSENT_ACTIVE,
    sourceEntityId: 'lead-ins-006',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 9 — delivered
  {
    id: 'notif-ins-009',
    templateId: 'tmpl-ins-campaign-promo',
    templateName: 'Insurance Campaign Promo',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: { outlet_phone: '+91 98765 43210' },
    sentAt: '2026-04-10T13:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.EFG123HIJ456',
    consentSnapshot: BASE_CONSENT_ACTIVE,
    sourceEntityId: 'lead-ins-007',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 10 — queued (L8 demo — can be cancelled)
  {
    id: 'notif-ins-010',
    templateId: 'tmpl-ins-policy-quote',
    templateName: 'Insurance Policy Quote',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: {
      customer_name: 'Arjun',
      vehicle_make_model: 'Mercedes AMG GT',
      quote_amount: '95000',
      valid_till: '05 May 2026',
    },
    sentAt: '2026-04-29T08:00:00.000Z',
    status: 'queued',
    retryCount: 0,
    consentSnapshot: BASE_CONSENT_ACTIVE,
    sourceEntityId: 'lead-ins-008',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // ── SERVICE_BOOKING dispatches ────────────────────────────────────────────

  // 11 — delivered
  {
    id: 'notif-svc-001',
    templateId: 'DLT_SVC_BOOKING_CREATED',
    templateName: 'Service Booking Received',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: { job_no: 'JC-2026-00045', outlet: 'Bangalore', date: '28 Apr 2026' },
    sentAt: '2026-04-25T16:30:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-prov-001',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-001',
    sourceEntityType: 'JOB_CARD',
  },

  // 12 — delivered
  {
    id: 'notif-svc-002',
    templateId: 'DLT_SVC_BOOKING_CONFIRMED',
    templateName: 'Service Booking Confirmed',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: { job_no: 'JC-2026-00045', outlet: 'Bangalore', date: '28 Apr 2026' },
    sentAt: '2026-04-26T09:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-prov-002',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-001',
    sourceEntityType: 'JOB_CARD',
  },

  // 13 — sent
  {
    id: 'notif-svc-003',
    templateId: 'DLT_SVC_BOOKING_CREATED',
    templateName: 'Service Booking Received',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: { job_no: 'JC-2026-00046', outlet: 'Mumbai', date: '30 Apr 2026' },
    sentAt: '2026-04-28T14:00:00.000Z',
    status: 'sent',
    retryCount: 0,
    providerMessageId: 'sms-prov-003',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-002',
    sourceEntityType: 'JOB_CARD',
  },

  // 14 — cancelled (L8 demo)
  {
    id: 'notif-svc-004',
    templateId: 'DLT_SVC_BOOKING_DECLINED',
    templateName: 'Service Booking Declined',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: { job_no: 'JC-2026-00044', outlet: 'Chennai' },
    sentAt: '2026-04-24T11:30:00.000Z',
    status: 'cancelled',
    retryCount: 0,
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-003',
    sourceEntityType: 'JOB_CARD',
  },

  // 15 — delivered
  {
    id: 'notif-svc-005',
    templateId: 'DLT_SVC_BOOKING_CONFIRMED',
    templateName: 'Service Booking Confirmed',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: { job_no: 'JC-2026-00040', outlet: 'Mumbai', date: '22 Apr 2026' },
    sentAt: '2026-04-22T10:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-prov-005',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-004',
    sourceEntityType: 'JOB_CARD',
  },

  // 16 — failed terminal
  {
    id: 'notif-svc-006',
    templateId: 'DLT_SVC_BOOKING_CONFIRMED',
    templateName: 'Service Booking Confirmed',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: { job_no: 'JC-2026-00041', outlet: 'Chennai', date: '23 Apr 2026' },
    sentAt: '2026-04-23T09:00:00.000Z',
    status: 'failed',
    retryCount: 3,
    errorReason: 'INVALID_PHONE: Number not reachable on SMS network',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-005',
    sourceEntityType: 'JOB_CARD',
  },

  // 17 — delivered
  {
    id: 'notif-svc-007',
    templateId: 'DLT_SVC_BOOKING_CREATED',
    templateName: 'Service Booking Received',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: { job_no: 'JC-2026-00042', outlet: 'Chennai', date: '24 Apr 2026' },
    sentAt: '2026-04-22T18:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-prov-007',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-006',
    sourceEntityType: 'JOB_CARD',
  },

  // 18 — sent
  {
    id: 'notif-svc-008',
    templateId: 'DLT_SVC_BOOKING_DECLINED',
    templateName: 'Service Booking Declined',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: { job_no: 'JC-2026-00039', outlet: 'Bangalore' },
    sentAt: '2026-04-21T15:00:00.000Z',
    status: 'sent',
    retryCount: 0,
    providerMessageId: 'sms-prov-008',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-007',
    sourceEntityType: 'JOB_CARD',
  },

  // ── CUSTOM_BUILDS dispatches ──────────────────────────────────────────────

  // 19 — delivered (stage update — Arjun)
  {
    id: 'notif-cb-001',
    templateId: 'DLT_CB_STAGE_UPDATE',
    templateName: 'Custom Build Stage Update',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: {
      customer_name: 'Arjun',
      job_title: 'Porsche 911 GT3 Edition',
      stage: 'Parts Ordering',
      estimated_date: 'Est. delivery: 20 Jun 2026',
    },
    sentAt: '2026-04-20T13:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.CB001XYZ',
    consentSnapshot: DATA_PROCESSING_CONSENT,
    sourceEntityId: 'build-job-001',
    sourceEntityType: 'BUILD_JOB',
  },

  // 20 — delivered (delivery ready — Meera)
  {
    id: 'notif-cb-002',
    templateId: 'DLT_CB_DELIVERY_READY',
    templateName: 'Custom Build Delivery Ready',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: {
      customer_name: 'Meera',
      job_title: 'BMW M4 Competition Special',
    },
    sentAt: '2026-04-18T11:00:00.000Z',
    status: 'read',
    retryCount: 0,
    providerMessageId: 'wamid.CB002ABC',
    consentSnapshot: DATA_PROCESSING_CONSENT,
    sourceEntityId: 'build-job-002',
    sourceEntityType: 'BUILD_JOB',
  },

  // 21 — sent (stage update — Rohan)
  {
    id: 'notif-cb-003',
    templateId: 'DLT_CB_STAGE_UPDATE',
    templateName: 'Custom Build Stage Update',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: {
      customer_name: 'Rohan',
      job_title: 'Audi R8 Decal Edition',
      stage: 'QC',
      estimated_date: '',
    },
    sentAt: '2026-04-27T14:30:00.000Z',
    status: 'sent',
    retryCount: 0,
    providerMessageId: 'wamid.CB003DEF',
    consentSnapshot: DATA_PROCESSING_CONSENT,
    sourceEntityId: 'build-job-003',
    sourceEntityType: 'BUILD_JOB',
  },

  // 22 — delivered
  {
    id: 'notif-cb-004',
    templateId: 'DLT_CB_STAGE_UPDATE',
    templateName: 'Custom Build Stage Update',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: {
      customer_name: 'Meera',
      job_title: 'BMW M4 Competition Special',
      stage: 'In Progress',
      estimated_date: 'Est. completion: 15 Apr 2026',
    },
    sentAt: '2026-04-05T10:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.CB004GHI',
    consentSnapshot: DATA_PROCESSING_CONSENT,
    sourceEntityId: 'build-job-002',
    sourceEntityType: 'BUILD_JOB',
  },

  // 23 — delivered
  {
    id: 'notif-cb-005',
    templateId: 'DLT_CB_STAGE_UPDATE',
    templateName: 'Custom Build Stage Update',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: {
      customer_name: 'Arjun',
      job_title: 'Porsche 911 GT3 Edition',
      stage: 'Approved',
      estimated_date: '',
    },
    sentAt: '2026-04-08T09:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.CB005JKL',
    consentSnapshot: DATA_PROCESSING_CONSENT,
    sourceEntityId: 'build-job-001',
    sourceEntityType: 'BUILD_JOB',
  },

  // 24 — delivered
  {
    id: 'notif-cb-006',
    templateId: 'DLT_CB_DELIVERY_READY',
    templateName: 'Custom Build Delivery Ready',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: {
      customer_name: 'Rohan',
      job_title: 'Audi RS5 Blacked Out',
    },
    sentAt: '2026-03-28T12:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.CB006MNO',
    consentSnapshot: DATA_PROCESSING_CONSENT,
    sourceEntityId: 'build-job-004',
    sourceEntityType: 'BUILD_JOB',
  },

  // ── CUSTOMERS dispatches ──────────────────────────────────────────────────

  // 25 — delivered (consent confirmed — Meera)
  {
    id: 'notif-cust-001',
    templateId: 'DLT_CUST_CONSENT_CONFIRMED',
    templateName: 'DPDP Consent Confirmation',
    channel: 'SMS',
    module: 'CUSTOMERS',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: { customer_name: 'Meera', consent_id: 'consent-20251015-mee' },
    sentAt: '2025-10-15T09:05:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-cust-001',
    consentSnapshot: {
      purpose: 'DATA_PROCESSING',
      capturedAt: '2025-10-15T09:00:00.000Z',
      capturedBy: 'PORTAL_SIGNUP',
      source: 'PORTAL_SIGNUP',
    },
    sourceEntityId: 'cust-meera-iyer',
    sourceEntityType: 'CUSTOMER',
  },

  // 26 — delivered (consent confirmed — Arjun)
  {
    id: 'notif-cust-002',
    templateId: 'DLT_CUST_CONSENT_CONFIRMED',
    templateName: 'DPDP Consent Confirmation',
    channel: 'SMS',
    module: 'CUSTOMERS',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: { customer_name: 'Arjun', consent_id: 'consent-20251101-arj' },
    sentAt: '2025-11-01T10:05:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-cust-002',
    consentSnapshot: {
      purpose: 'DATA_PROCESSING',
      capturedAt: '2025-11-01T10:00:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'cust-arjun-mehta',
    sourceEntityType: 'CUSTOMER',
  },

  // 27 — delivered (consent confirmed — Rohan)
  {
    id: 'notif-cust-003',
    templateId: 'DLT_CUST_CONSENT_CONFIRMED',
    templateName: 'DPDP Consent Confirmation',
    channel: 'SMS',
    module: 'CUSTOMERS',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: { customer_name: 'Rohan', consent_id: 'consent-20250920-roh' },
    sentAt: '2025-09-20T12:05:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-cust-003',
    consentSnapshot: {
      purpose: 'DATA_PROCESSING',
      capturedAt: '2025-09-20T12:00:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'cust-rohan-desai',
    sourceEntityType: 'CUSTOMER',
  },

  // 28 — delivered (consent withdrawal — Arjun)
  {
    id: 'notif-cust-004',
    templateId: 'DLT_CUST_CONSENT_WITHDRAWN',
    templateName: 'DPDP Consent Withdrawal Acknowledgement',
    channel: 'SMS',
    module: 'CUSTOMERS',
    recipient: { customerId: 'cust-arjun-mehta', raw: '+919876543210' },
    variables: { customer_name: 'Arjun' },
    sentAt: '2026-04-19T14:30:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-cust-004',
    consentSnapshot: {
      purpose: 'DATA_PROCESSING',
      capturedAt: '2025-11-01T10:00:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'cust-arjun-mehta',
    sourceEntityType: 'CUSTOMER',
  },

  // 29 — delivered (consent withdrawal — Rohan)
  {
    id: 'notif-cust-005',
    templateId: 'DLT_CUST_CONSENT_WITHDRAWN',
    templateName: 'DPDP Consent Withdrawal Acknowledgement',
    channel: 'SMS',
    module: 'CUSTOMERS',
    recipient: { customerId: 'cust-rohan-desai', raw: '+919988776655' },
    variables: { customer_name: 'Rohan' },
    sentAt: '2026-04-17T10:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-cust-005',
    consentSnapshot: {
      purpose: 'DATA_PROCESSING',
      capturedAt: '2025-09-20T12:00:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'cust-rohan-desai',
    sourceEntityType: 'CUSTOMER',
  },

  // 30 — delivered (consent confirmed — new customer)
  {
    id: 'notif-cust-006',
    templateId: 'DLT_CUST_CONSENT_CONFIRMED',
    templateName: 'DPDP Consent Confirmation',
    channel: 'SMS',
    module: 'CUSTOMERS',
    recipient: { customerId: 'cust-vikram-singh', raw: '+919654321098' },
    variables: { customer_name: 'Vikram', consent_id: 'consent-20260420-vik' },
    sentAt: '2026-04-20T16:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-cust-006',
    consentSnapshot: {
      purpose: 'DATA_PROCESSING',
      capturedAt: '2026-04-20T15:55:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'cust-vikram-singh',
    sourceEntityType: 'CUSTOMER',
  },

  // Extra dispatches to reach 40 total ─────────────────────────────────────

  // 31
  {
    id: 'notif-ins-011',
    templateId: 'tmpl-ins-renewal-reminder',
    templateName: 'Insurance Renewal Reminder',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: { customer_name: 'Meera', vehicle_reg: 'MH04IJ7890', expiry_date: '01 Jun 2026' },
    sentAt: '2026-04-12T10:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.INS011PQR',
    consentSnapshot: BASE_CONSENT_ACTIVE,
    sourceEntityId: 'lead-ins-009',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 32
  {
    id: 'notif-ins-012',
    templateId: 'tmpl-ins-policy-quote',
    templateName: 'Insurance Policy Quote',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-vikram-singh', raw: '+919654321098' },
    variables: {
      customer_name: 'Vikram',
      vehicle_make_model: 'Mercedes C Class',
      quote_amount: '38900',
      valid_till: '20 May 2026',
    },
    sentAt: '2026-04-23T14:00:00.000Z',
    status: 'sent',
    retryCount: 0,
    providerMessageId: 'wamid.INS012STU',
    consentSnapshot: {
      purpose: 'WHATSAPP_MARKETING',
      capturedAt: '2026-04-20T15:55:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'lead-ins-010',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 33
  {
    id: 'notif-svc-009',
    templateId: 'DLT_SVC_BOOKING_CREATED',
    templateName: 'Service Booking Received',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-vikram-singh', raw: '+919654321098' },
    variables: { job_no: 'JC-2026-00050', outlet: 'Bangalore', date: '02 May 2026' },
    sentAt: '2026-04-29T10:00:00.000Z',
    status: 'sent',
    retryCount: 0,
    providerMessageId: 'sms-svc-009',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-008',
    sourceEntityType: 'JOB_CARD',
  },

  // 34
  {
    id: 'notif-cb-007',
    templateId: 'DLT_CB_STAGE_UPDATE',
    templateName: 'Custom Build Stage Update',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: 'cust-vikram-singh', raw: '+919654321098' },
    variables: {
      customer_name: 'Vikram',
      job_title: 'Mercedes AMG GT Edition',
      stage: 'Design Approved',
      estimated_date: '',
    },
    sentAt: '2026-04-25T11:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.CB007VWX',
    consentSnapshot: DATA_PROCESSING_CONSENT,
    sourceEntityId: 'build-job-005',
    sourceEntityType: 'BUILD_JOB',
  },

  // 35
  {
    id: 'notif-ins-013',
    templateId: 'tmpl-ins-campaign-promo',
    templateName: 'Insurance Campaign Promo',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-vikram-singh', raw: '+919654321098' },
    variables: { outlet_phone: '+91 98765 43210' },
    sentAt: '2026-04-14T10:00:00.000Z',
    status: 'read',
    retryCount: 0,
    providerMessageId: 'wamid.INS013YZA',
    consentSnapshot: {
      purpose: 'WHATSAPP_MARKETING',
      capturedAt: '2026-04-20T15:55:00.000Z',
      capturedBy: 'staff-r09-raj',
      source: 'STAFF_FORM',
    },
    sourceEntityId: 'lead-ins-011',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 36
  {
    id: 'notif-svc-010',
    templateId: 'DLT_SVC_BOOKING_CONFIRMED',
    templateName: 'Service Booking Confirmed',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-meera-iyer', raw: '+919123456789' },
    variables: { job_no: 'JC-2026-00048', outlet: 'Mumbai', date: '01 May 2026' },
    sentAt: '2026-04-29T08:30:00.000Z',
    status: 'sent',
    retryCount: 0,
    providerMessageId: 'sms-svc-010',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-009',
    sourceEntityType: 'JOB_CARD',
  },

  // 37
  {
    id: 'notif-cust-007',
    templateId: 'DLT_CUST_CONSENT_CONFIRMED',
    templateName: 'DPDP Consent Confirmation',
    channel: 'SMS',
    module: 'CUSTOMERS',
    recipient: { customerId: 'cust-priya-nair', raw: '+918765432109' },
    variables: { customer_name: 'Priya', consent_id: 'consent-20260415-pri' },
    sentAt: '2026-04-15T14:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'sms-cust-007',
    consentSnapshot: {
      purpose: 'DATA_PROCESSING',
      capturedAt: '2026-04-15T13:55:00.000Z',
      capturedBy: 'PORTAL_SIGNUP',
      source: 'PORTAL_SIGNUP',
    },
    sourceEntityId: 'cust-priya-nair',
    sourceEntityType: 'CUSTOMER',
  },

  // 38
  {
    id: 'notif-cb-008',
    templateId: 'DLT_CB_DELIVERY_READY',
    templateName: 'Custom Build Delivery Ready',
    channel: 'WHATSAPP',
    module: 'CUSTOM_BUILDS',
    recipient: { customerId: 'cust-priya-nair', raw: '+918765432109' },
    variables: {
      customer_name: 'Priya',
      job_title: 'Porsche 911 Exclusive Edition',
    },
    sentAt: '2026-04-20T10:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.CB008BCD',
    consentSnapshot: DATA_PROCESSING_CONSENT,
    sourceEntityId: 'build-job-006',
    sourceEntityType: 'BUILD_JOB',
  },

  // 39
  {
    id: 'notif-ins-014',
    templateId: 'tmpl-ins-renewal-reminder',
    templateName: 'Insurance Renewal Reminder',
    channel: 'WHATSAPP',
    module: 'INSURANCE',
    recipient: { customerId: 'cust-priya-nair', raw: '+918765432109' },
    variables: { customer_name: 'Priya', vehicle_reg: 'KA03KL2345', expiry_date: '10 Jun 2026' },
    sentAt: '2026-04-26T09:00:00.000Z',
    status: 'delivered',
    retryCount: 0,
    providerMessageId: 'wamid.INS014EFG',
    consentSnapshot: {
      purpose: 'WHATSAPP_MARKETING',
      capturedAt: '2026-04-15T13:55:00.000Z',
      capturedBy: 'PORTAL_SIGNUP',
      source: 'PORTAL_SIGNUP',
    },
    sourceEntityId: 'lead-ins-012',
    sourceEntityType: 'INSURANCE_LEAD',
  },

  // 40
  {
    id: 'notif-svc-011',
    templateId: 'DLT_SVC_BOOKING_DECLINED',
    templateName: 'Service Booking Declined',
    channel: 'SMS',
    module: 'SERVICE_BOOKING',
    recipient: { customerId: 'cust-priya-nair', raw: '+918765432109' },
    variables: { job_no: 'JC-2026-00047', outlet: 'Bangalore' },
    sentAt: '2026-04-27T16:00:00.000Z',
    status: 'sent',
    retryCount: 0,
    providerMessageId: 'sms-svc-011',
    consentSnapshot: SERVICE_CONSENT_ACTIVE,
    sourceEntityId: 'jc-portal-010',
    sourceEntityType: 'JOB_CARD',
  },
];

// ─── Seed audit events ────────────────────────────────────────────────────────

export const notificationAuditEvents: NotificationAuditEvent[] = [
  { id: 'nae-001', dispatchId: 'notif-ins-001', kind: 'sent', at: '2026-04-20T09:15:00.000Z' },
  { id: 'nae-002', dispatchId: 'notif-ins-001', kind: 'delivered', at: '2026-04-20T09:15:30.000Z' },
  { id: 'nae-003', dispatchId: 'notif-ins-002', kind: 'consent-blocked', at: '2026-04-22T11:00:00.000Z' },
  { id: 'nae-004', dispatchId: 'notif-ins-003', kind: 'sent', at: '2026-04-21T14:00:00.000Z' },
  { id: 'nae-005', dispatchId: 'notif-ins-003', kind: 'delivered', at: '2026-04-21T14:01:00.000Z' },
  { id: 'nae-006', dispatchId: 'notif-ins-003', kind: 'read', at: '2026-04-21T14:05:00.000Z' },
  {
    id: 'nae-007',
    dispatchId: 'notif-ins-005',
    kind: 'failed',
    at: '2026-04-18T16:01:00.000Z',
    errorReason: 'BSP_TIMEOUT',
  },
  {
    id: 'nae-008',
    dispatchId: 'notif-ins-005',
    kind: 'retry-queued',
    at: '2026-04-18T16:02:00.000Z',
  },
  {
    id: 'nae-009',
    dispatchId: 'notif-ins-005',
    kind: 'failed',
    at: '2026-04-18T16:07:00.000Z',
    errorReason: 'BSP_TIMEOUT',
  },
  {
    id: 'nae-010',
    dispatchId: 'notif-ins-005',
    kind: 'retry-queued',
    at: '2026-04-18T16:08:00.000Z',
  },
  {
    id: 'nae-011',
    dispatchId: 'notif-ins-005',
    kind: 'failed',
    at: '2026-04-18T16:38:00.000Z',
    errorReason: 'BSP_TIMEOUT: Provider unreachable after 3 attempts',
  },
  {
    id: 'nae-012',
    dispatchId: 'notif-svc-004',
    kind: 'cancelled',
    at: '2026-04-24T11:32:00.000Z',
    actorId: 'staff-r12-priya',
  },
  { id: 'nae-013', dispatchId: 'notif-svc-001', kind: 'sent', at: '2026-04-25T16:30:00.000Z' },
  { id: 'nae-014', dispatchId: 'notif-svc-001', kind: 'delivered', at: '2026-04-25T16:31:00.000Z' },
  {
    id: 'nae-015',
    dispatchId: 'notif-svc-006',
    kind: 'failed',
    at: '2026-04-23T09:01:00.000Z',
    errorReason: 'INVALID_PHONE',
  },
];
