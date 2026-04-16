import type {
  ConsignedVehicle,
  ConsignorPayout,
  ConsignorMessage,
  ConsignmentAgreement,
} from '@dms/types';

// ─── Consigned Vehicles ────────────────────────────────────────────────────────

export const consignedVehicles: ConsignedVehicle[] = [
  {
    vin: 'SAJDA4BV8NCK12345',
    make: 'Jaguar',
    model: 'F-Type',
    variant: 'R Coupe',
    year: 2022,
    color: 'Santorini Black Metallic',
    city: 'bangalore',
    imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
    consignmentDate: '2026-03-05',
    askingPrice: 11500000,
    currentListPrice: 11200000,
    status: 'listed',
    viewingsCount: 8,
    inquiriesCount: 3,
    daysListed: 42,
    feePercentage: 10,
  },
  {
    vin: 'WAUZZZ8T8NA012345',
    make: 'Audi',
    model: 'RS5',
    variant: 'Sportback',
    year: 2023,
    color: 'Nardo Grey',
    city: 'mumbai',
    imageUrl: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80',
    consignmentDate: '2026-03-19',
    askingPrice: 9500000,
    currentListPrice: 9200000,
    status: 'under-offer',
    viewingsCount: 12,
    inquiriesCount: 5,
    daysListed: 28,
    feePercentage: 12,
  },
];

// ─── Payouts ───────────────────────────────────────────────────────────────────

export const consignorPayouts: ConsignorPayout[] = [
  {
    id: 'payout-001',
    vehicleVin: 'WBA3B5C50FK123456',
    vehicleName: '2021 BMW Z4 M40i',
    salePrice: 7200000,
    feePercentage: 10,
    feeAmount: 720000,
    reimbursables: 185000, // detailing + photography
    netPayout: 6295000,
    status: 'completed',
    completedDate: '2026-03-14',
  },
  {
    id: 'payout-002',
    vehicleVin: 'WAUZZZ8T8NA012345',
    vehicleName: '2023 Audi RS5 Sportback',
    salePrice: 9000000,
    feePercentage: 12,
    feeAmount: 1080000,
    reimbursables: 210000,
    netPayout: 7710000,
    status: 'pending',
    estimatedDate: '2026-05-15',
  },
];

// ─── Messages ──────────────────────────────────────────────────────────────────

export const consignorMessages: ConsignorMessage[] = [
  {
    id: 'msg-001',
    date: '2026-03-05T10:15:00Z',
    from: 'advisor',
    senderName: 'Priya Sharma, Sales Director',
    subject: 'Welcome to the BN Consignment Programme',
    body: 'Dear Sir/Madam,\n\nThank you for entrusting BN Automobiles with your Jaguar F-Type R. Our initial assessment confirms this is an exceptional example — low mileage, full service history, and the Santorini Black finish is particularly sought after in the current market.\n\nBased on comparable sales over the past 90 days, we are recommending an asking price of ₹1,15,00,000 with a listing price of ₹1,12,00,000. We will proceed with professional photography this week and aim to have the vehicle live on our platform by Thursday.\n\nKind regards,\nPriya Sharma\nSales Director, BN Automobiles',
    isRead: true,
  },
  {
    id: 'msg-002',
    date: '2026-03-06T14:30:00Z',
    from: 'consignor',
    senderName: 'You',
    subject: 'Re: Welcome to the BN Consignment Programme',
    body: 'Dear Priya,\n\nThank you for the warm welcome and the thorough valuation. The asking price aligns with my expectations. Please proceed with the photography and listing.\n\nI would appreciate being kept informed of any viewings or enquiries as they come in.\n\nKind regards',
    isRead: true,
  },
  {
    id: 'msg-003',
    date: '2026-03-10T09:00:00Z',
    from: 'advisor',
    senderName: 'Priya Sharma, Sales Director',
    subject: 'Photography Complete — Listing Live',
    body: 'Dear Sir/Madam,\n\nI am pleased to inform you that the professional photography session for your Jaguar F-Type R was completed yesterday by our in-house photographer. The vehicle looks stunning — we have captured 24 images including detailed interior and engine bay shots.\n\nThe listing is now live on our platform and has already received considerable attention in the first 24 hours. We will keep you updated on all enquiries.\n\nWarm regards,\nPriya Sharma',
    isRead: true,
  },
  {
    id: 'msg-004',
    date: '2026-03-18T16:45:00Z',
    from: 'advisor',
    senderName: 'Priya Sharma, Sales Director',
    subject: 'First Viewing Completed — Feedback',
    body: 'Dear Sir/Madam,\n\nWe had our first serious viewing yesterday — a qualified buyer from Whitefield who has been looking at F-Types for the past two months. The feedback was very positive on the condition and specification.\n\nHis primary concern was around the 2022 registration vis-à-vis price — he felt the market had softened slightly at this price point. This is consistent with what we are observing across similar listings.\n\nI would like to discuss a possible adjustment to the listing price to ₹1,08,00,000 to accelerate interest. Would you be available for a brief call this week?\n\nBest regards,\nPriya Sharma',
    isRead: true,
  },
  {
    id: 'msg-005',
    date: '2026-03-20T11:00:00Z',
    from: 'consignor',
    senderName: 'You',
    subject: 'Re: First Viewing Completed — Feedback',
    body: 'Dear Priya,\n\nThank you for the update. I understand the market dynamics. I am comfortable with maintaining the current listing price for now, but would consider a reduction to ₹1,10,00,000 if we have not received a firm offer within the next two weeks.\n\nPlease proceed with further viewings and keep me informed.\n\nKind regards',
    isRead: true,
  },
  {
    id: 'msg-006',
    date: '2026-03-19T10:30:00Z',
    from: 'advisor',
    senderName: 'Priya Sharma, Sales Director',
    subject: 'Audi RS5 Listing Update',
    body: 'Dear Sir/Madam,\n\nYour Audi RS5 Sportback has generated outstanding interest since going live. In the first week we have had 4 viewings and 3 serious enquiries — this is above our typical velocity for vehicles in this segment.\n\nThe Nardo Grey specification with the Dynamic Ride Control suspension appears to be exactly what the market is looking for at present. We are cautiously optimistic about a strong offer within the next 10 days.\n\nWarm regards,\nPriya Sharma',
    isRead: true,
  },
  {
    id: 'msg-007',
    date: '2026-04-10T15:20:00Z',
    from: 'advisor',
    senderName: 'Priya Sharma, Sales Director',
    subject: 'Offer Received — Audi RS5',
    body: 'Dear Sir/Madam,\n\nI am pleased to advise that we have received a formal written offer of ₹88,00,000 for your Audi RS5 Sportback from a verified buyer based in Bandra. The buyer has been a client of ours for three years and has made two previous purchases through us.\n\nGiven the asking price of ₹95,00,000 and listing price of ₹92,00,000, this offer is below our target. However, the buyer is well-qualified and has indicated flexibility should the gap be narrowed.\n\nI recommend counter-offering at ₹91,00,000. Please advise on how you would like to proceed.\n\nBest regards,\nPriya Sharma',
    isRead: false,
  },
  {
    id: 'msg-008',
    date: '2026-04-14T09:45:00Z',
    from: 'advisor',
    senderName: 'Priya Sharma, Sales Director',
    subject: 'Counter-Offer Status — Audi RS5',
    body: 'Dear Sir/Madam,\n\nFollowing our conversation, we presented the counter-offer of ₹90,50,000 to the buyer. He has indicated strong interest and is currently in consultation with his financial advisor. We expect a response by end of week.\n\nIn the interim, the vehicle has been marked as "Under Offer" on our platform. We will, of course, continue to field serious enquiries in case this deal does not proceed.\n\nI will update you the moment we hear back.\n\nWarm regards,\nPriya Sharma',
    isRead: false,
  },
];

// ─── Agreements ────────────────────────────────────────────────────────────────

export const consignmentAgreements: ConsignmentAgreement[] = [
  {
    id: 'agr-001',
    vehicleVin: 'SAJDA4BV8NCK12345',
    vehicleName: '2022 Jaguar F-Type R Coupe',
    signedDate: '2026-03-05',
    feePercentage: 10,
    durationMonths: 6,
    termsUrl: '/documents/consignment-agreement-agr-001.pdf',
  },
  {
    id: 'agr-002',
    vehicleVin: 'WAUZZZ8T8NA012345',
    vehicleName: '2023 Audi RS5 Sportback',
    signedDate: '2026-03-19',
    feePercentage: 12,
    durationMonths: 6,
    termsUrl: '/documents/consignment-agreement-agr-002.pdf',
  },
];
