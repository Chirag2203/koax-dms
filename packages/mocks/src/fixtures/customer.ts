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
};

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
];
