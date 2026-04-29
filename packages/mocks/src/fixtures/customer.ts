// FIXTURE AUDIT 2026-04-20 (PLAN-VEHICLES-002 §1.5): added contactConfidential field to all entries;
//   set contactConfidential: true on cust-karan-shah (Porsche owner — high-net-worth demo);
//   added service-module customers customer-001..customer-034 (JC + Appointment fixtures).
import type { Customer } from '@dms/types';

export const mockCustomer: Customer = {
  id: 'cust-arjun-mehta',
  name: 'Arjun Mehta',
  email: 'arjun.mehta@gmail.com',
  phone: '+919876001003',
  avatar: 'AM',
  preferredCity: 'bangalore',
  preferredLanguage: 'en-IN',
  memberSince: '2023-04-10',
  pan: 'DDDPM3456D',
  contactConfidential: false,
};

// ─── Customers added for vehicles module (SPEC-VEHICLES-001 §5) ──────────────

/** BN Automobiles dealer stock sentinel (D4 — global single customer) */
export const custBnDealer: Customer = {
  id: 'cust-bn-dealer',
  name: 'BN Automobiles — Dealer Stock',
  email: 'dealer-stock@bnautomobiles.in',
  phone: '+918022000000',
  avatar: 'BN',
  preferredCity: 'bangalore',
  preferredLanguage: 'en-IN',
  memberSince: '2018-01-01',
  contactConfidential: false,
};

// VIN-A owners
export const custRohanDesai: Customer = {
  id: 'cust-rohan-desai',
  name: 'Rohan Desai',
  email: 'rohan.desai@gmail.com',
  phone: '+919876001001',
  avatar: 'RD',
  preferredCity: 'bangalore',
  preferredLanguage: 'en-IN',
  memberSince: '2019-03-01',
  pan: 'AABPD1234A',
  contactConfidential: false,
};

export const custNehaKapoor: Customer = {
  id: 'cust-neha-kapoor',
  name: 'Neha Kapoor',
  email: 'neha.kapoor@gmail.com',
  phone: '+919876001002',
  avatar: 'NK',
  preferredCity: 'bangalore',
  preferredLanguage: 'en-IN',
  memberSince: '2020-11-01',
  pan: 'BBBPK5678B',
  contactConfidential: false,
};

export const custArjunMehta: Customer = {
  id: 'cust-arjun-mehta',
  name: 'Arjun Mehta',
  email: 'arjun.mehta@gmail.com',
  phone: '+919876001003',
  avatar: 'AM',
  preferredCity: 'bangalore',
  preferredLanguage: 'en-IN',
  memberSince: '2023-04-01',
  pan: 'CCCPM9012C',
  contactConfidential: false,
  lifecycleStage: 'ACTIVE',
  segment: 'PREMIER',
  aadhaarLast4: '4567',
};

export const custPriyaMehta: Customer = {
  id: 'cust-priya-mehta',
  name: 'Priya Mehta',
  email: 'priya.mehta@gmail.com',
  phone: '+919876001004',
  avatar: 'PM',
  preferredCity: 'bangalore',
  preferredLanguage: 'en-IN',
  memberSince: '2023-04-01',
  pan: 'DDDPM3456D',
  contactConfidential: false,
  lifecycleStage: 'ACTIVE',
  segment: 'PREMIER',
  aadhaarLast4: '8901',
};

// VIN-B owners
export const custVikramSingh: Customer = {
  id: 'cust-vikram-singh',
  name: 'Vikram Singh',
  email: 'vikram.singh@gmail.com',
  phone: '+919876002001',
  avatar: 'VS',
  preferredCity: 'mumbai',
  preferredLanguage: 'en-IN',
  memberSince: '2020-06-01',
  pan: 'EEEPS7890E',
  contactConfidential: false,
  lifecycleStage: 'ACTIVE',
  segment: 'ULTRA_HNW',
  aadhaarLast4: '6789',
};

export const custMeeraIyer: Customer = {
  id: 'cust-meera-iyer',
  name: 'Meera Iyer',
  email: 'meera.iyer@gmail.com',
  phone: '+919876002002',
  avatar: 'MI',
  preferredCity: 'mumbai',
  preferredLanguage: 'en-IN',
  memberSince: '2024-02-01',
  pan: 'FFFPI2345F',
  contactConfidential: false,
};

export const custRahulKumar: Customer = {
  id: 'cust-rahul-kumar',
  name: 'Rahul Kumar',
  email: 'rahul.kumar@gmail.com',
  phone: '+919876002003',
  avatar: 'RK',
  preferredCity: 'mumbai',
  preferredLanguage: 'en-IN',
  memberSince: '2025-01-01',
  contactConfidential: false,
};

// VIN-C owners
export const custSunitaReddy: Customer = {
  id: 'cust-sunita-reddy',
  name: 'Sunita Reddy',
  email: 'sunita.reddy@gmail.com',
  phone: '+919876003001',
  avatar: 'SR',
  preferredCity: 'chennai',
  preferredLanguage: 'en-IN',
  memberSince: '2019-07-01',
  pan: 'GGGPR6789G',
  contactConfidential: false,
  lifecycleStage: 'DORMANT',
  segment: 'STANDARD',
};

export const custKaranShah: Customer = {
  id: 'cust-karan-shah',
  name: 'Karan Shah',
  email: 'karan.shah@gmail.com',
  phone: '+919876003002',
  avatar: 'KS',
  preferredCity: 'chennai',
  preferredLanguage: 'en-IN',
  memberSince: '2021-09-01',
  pan: 'HHHPS0123H',
  // High-net-worth Porsche owner — PII masked for staff below R19 (PLAN-VEHICLES-002 §A)
  contactConfidential: true,
  lifecycleStage: 'ACTIVE',
  segment: 'ULTRA_HNW',
  aadhaarLast4: '2345',
};

export const custPoojaDesai: Customer = {
  id: 'cust-pooja-desai',
  name: 'Pooja Desai',
  email: 'pooja.desai@gmail.com',
  phone: '+919876003003',
  avatar: 'PD',
  preferredCity: 'chennai',
  preferredLanguage: 'en-IN',
  memberSince: '2026-01-01',
  contactConfidential: false,
  lifecycleStage: 'PROSPECT',
  segment: 'STANDARD',
};

// ─── Service-module customers (FIXTURE AUDIT 2026-04-20 — PLAN-VEHICLES-002 §1.5) ─
// customer-001..018 map to JC outletIds; customer-019..034 map to Appointment outletIds.
// Realistic Indian names; phone format +91XXXXXXXXXX; email at gmail.com.
// preferredCity matches the JC/Appointment outletId city.

export const custServiceCustomers: Customer[] = [
  // jc-001  BLR-01 → bangalore
  { id: 'customer-001', name: 'Suresh Krishnamurthy', email: 'suresh.krishnamurthy@gmail.com', phone: '+919845100001', avatar: 'SK', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2024-01-10', contactConfidential: false },
  // jc-002  MUM-01 → mumbai
  { id: 'customer-002', name: 'Nisha Bhatia', email: 'nisha.bhatia@gmail.com', phone: '+919820200002', avatar: 'NB', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2024-02-14', contactConfidential: false },
  // jc-003  BLR-01 → bangalore
  { id: 'customer-003', name: 'Ramachandran Iyer', email: 'ramachandran.iyer@gmail.com', phone: '+919845100003', avatar: 'RI', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2023-11-05', contactConfidential: false },
  // jc-004  BLR-01 → bangalore
  { id: 'customer-004', name: 'Akhil Verma', email: 'akhil.verma@gmail.com', phone: '+919845100004', avatar: 'AV', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2023-08-20', contactConfidential: false },
  // jc-005  MUM-01 → mumbai
  { id: 'customer-005', name: 'Preethi Nambiar', email: 'preethi.nambiar@gmail.com', phone: '+919820200005', avatar: 'PN', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2024-03-01', contactConfidential: false },
  // jc-006  CHE-01 → chennai
  { id: 'customer-006', name: 'Deepak Subramanian', email: 'deepak.subramanian@gmail.com', phone: '+919444300006', avatar: 'DS', preferredCity: 'chennai', preferredLanguage: 'en-IN', memberSince: '2023-07-15', contactConfidential: false },
  // jc-007  MUM-01 → mumbai
  { id: 'customer-007', name: 'Anita Chawla', email: 'anita.chawla@gmail.com', phone: '+919820200007', avatar: 'AC', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2022-12-10', contactConfidential: false },
  // jc-008  MUM-01 → mumbai
  { id: 'customer-008', name: 'Rajiv Saxena', email: 'rajiv.saxena@gmail.com', phone: '+919820200008', avatar: 'RS', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2023-05-18', contactConfidential: false },
  // jc-009  BLR-01 → bangalore
  { id: 'customer-009', name: 'Geeta Nair', email: 'geeta.nair@gmail.com', phone: '+919845100009', avatar: 'GN', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2024-01-22', contactConfidential: false },
  // jc-010  CHE-01 → chennai
  { id: 'customer-010', name: 'Muthukumar Pillai', email: 'muthukumar.pillai@gmail.com', phone: '+919444300010', avatar: 'MP', preferredCity: 'chennai', preferredLanguage: 'en-IN', memberSince: '2023-09-30', contactConfidential: false },
  // jc-011  BLR-01 → bangalore
  { id: 'customer-011', name: 'Sandeep Rao', email: 'sandeep.rao@gmail.com', phone: '+919845100011', avatar: 'SR', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2024-02-28', contactConfidential: false },
  // jc-012  MUM-01 → mumbai
  { id: 'customer-012', name: 'Kavita Malhotra', email: 'kavita.malhotra@gmail.com', phone: '+919820200012', avatar: 'KM', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2023-06-11', contactConfidential: false },
  // jc-013  CHE-01 → chennai
  { id: 'customer-013', name: 'Balakrishnan Venkataraman', email: 'bala.venkataraman@gmail.com', phone: '+919444300013', avatar: 'BV', preferredCity: 'chennai', preferredLanguage: 'en-IN', memberSince: '2022-10-01', contactConfidential: false },
  // jc-014  BLR-01 → bangalore
  { id: 'customer-014', name: 'Harish Gowda', email: 'harish.gowda@gmail.com', phone: '+919845100014', avatar: 'HG', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2023-03-14', contactConfidential: false },
  // jc-015  CHE-01 → chennai
  { id: 'customer-015', name: 'Shalini Rajan', email: 'shalini.rajan@gmail.com', phone: '+919444300015', avatar: 'SR', preferredCity: 'chennai', preferredLanguage: 'en-IN', memberSince: '2024-04-02', contactConfidential: false },
  // jc-016  BLR-01 → bangalore
  { id: 'customer-016', name: 'Vivek Anand', email: 'vivek.anand@gmail.com', phone: '+919845100016', avatar: 'VA', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2023-10-20', contactConfidential: false },
  // jc-017  MUM-01 → mumbai
  { id: 'customer-017', name: 'Parveen Akhtar', email: 'parveen.akhtar@gmail.com', phone: '+919820200017', avatar: 'PA', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2024-01-07', contactConfidential: false },
  // jc-018  CHE-01 → chennai
  { id: 'customer-018', name: 'Divya Krishnan', email: 'divya.krishnan@gmail.com', phone: '+919444300018', avatar: 'DK', preferredCity: 'chennai', preferredLanguage: 'en-IN', memberSince: '2023-12-15', contactConfidential: false },
  // apt-001  BLR-01 → bangalore
  { id: 'customer-019', name: 'Arjun Balakumar', email: 'arjun.balakumar@gmail.com', phone: '+919845100019', avatar: 'AB', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2025-01-10', contactConfidential: false },
  // apt-002  MUM-01 → mumbai
  { id: 'customer-020', name: 'Rashida Merchant', email: 'rashida.merchant@gmail.com', phone: '+919820200020', avatar: 'RM', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2025-02-14', contactConfidential: false },
  // apt-003  BLR-01 → bangalore
  { id: 'customer-021', name: 'Gopal Srinivasan', email: 'gopal.srinivasan@gmail.com', phone: '+919845100021', avatar: 'GS', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2024-11-01', contactConfidential: false },
  // apt-004  CHE-01 → chennai
  { id: 'customer-022', name: 'Nandita Chandrasekhar', email: 'nandita.cs@gmail.com', phone: '+919444300022', avatar: 'NC', preferredCity: 'chennai', preferredLanguage: 'en-IN', memberSince: '2025-03-08', contactConfidential: false },
  // apt-005  MUM-01 → mumbai
  { id: 'customer-023', name: 'Sunil Khandelwal', email: 'sunil.khandelwal@gmail.com', phone: '+919820200023', avatar: 'SK', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2024-08-22', contactConfidential: false },
  // apt-006  MUM-01 → mumbai
  { id: 'customer-024', name: 'Leena Kapadia', email: 'leena.kapadia@gmail.com', phone: '+919820200024', avatar: 'LK', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2024-06-30', contactConfidential: false },
  // apt-007  BLR-01 → bangalore
  { id: 'customer-025', name: 'Chetan Hegde', email: 'chetan.hegde@gmail.com', phone: '+919845100025', avatar: 'CH', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2025-01-25', contactConfidential: false },
  // apt-008  CHE-01 → chennai
  { id: 'customer-026', name: 'Anuradha Selvam', email: 'anuradha.selvam@gmail.com', phone: '+919444300026', avatar: 'AS', preferredCity: 'chennai', preferredLanguage: 'en-IN', memberSince: '2024-09-10', contactConfidential: false },
  // apt-009  BLR-01 → bangalore
  { id: 'customer-027', name: 'Murali Krishnaswamy', email: 'murali.krishnaswamy@gmail.com', phone: '+919845100027', avatar: 'MK', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2024-07-05', contactConfidential: false },
  // apt-010  CHE-01 → chennai
  { id: 'customer-028', name: 'Rekha Padmanabhan', email: 'rekha.padmanabhan@gmail.com', phone: '+919444300028', avatar: 'RP', preferredCity: 'chennai', preferredLanguage: 'en-IN', memberSince: '2024-10-18', contactConfidential: false },
  // apt-011  BLR-01 → bangalore
  { id: 'customer-029', name: 'Satish Kulkarni', email: 'satish.kulkarni@gmail.com', phone: '+919845100029', avatar: 'SK', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2023-04-12', contactConfidential: false },
  // apt-012  MUM-01 → mumbai
  { id: 'customer-030', name: 'Farah Irani', email: 'farah.irani@gmail.com', phone: '+919820200030', avatar: 'FI', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2024-05-28', contactConfidential: false },
  // apt-013  CHE-01 → chennai
  { id: 'customer-031', name: 'Chandrakumar Natarajan', email: 'chandrakumar.natarajan@gmail.com', phone: '+919444300031', avatar: 'CN', preferredCity: 'chennai', preferredLanguage: 'en-IN', memberSince: '2024-03-20', contactConfidential: false },
  // apt-014  BLR-01 → bangalore
  { id: 'customer-032', name: 'Pradeep Bangera', email: 'pradeep.bangera@gmail.com', phone: '+919845100032', avatar: 'PB', preferredCity: 'bangalore', preferredLanguage: 'en-IN', memberSince: '2025-02-10', contactConfidential: false },
  // apt-015  MUM-01 → mumbai
  { id: 'customer-033', name: 'Zahira Qureshi', email: 'zahira.qureshi@gmail.com', phone: '+919820200033', avatar: 'ZQ', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2025-03-15', contactConfidential: false },
  // jc-019  MUM-01 → mumbai
  { id: 'customer-034', name: 'Roshan Mirza', email: 'roshan.mirza@gmail.com', phone: '+919820200034', avatar: 'RM', preferredCity: 'mumbai', preferredLanguage: 'en-IN', memberSince: '2024-12-01', contactConfidential: false },
];

/** All vehicle-module customers as a flat array for store initialization. */
export const vehicleModuleCustomers: Customer[] = [
  custBnDealer,
  custRohanDesai,
  custNehaKapoor,
  custArjunMehta,
  custPriyaMehta,
  custVikramSingh,
  custMeeraIyer,
  custRahulKumar,
  custSunitaReddy,
  custKaranShah,
  custPoojaDesai,
  ...custServiceCustomers,
];
