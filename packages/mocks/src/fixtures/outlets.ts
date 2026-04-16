import type { Outlet } from '@dms/types';

export const outlets: Outlet[] = [
  {
    id: 'bn-bangalore',
    city: 'bangalore',
    name: 'BN Automobiles Bangalore',
    address: '14, Intermediate Ring Road, Domlur, Indiranagar, Bengaluru, Karnataka 560071',
    phone: '+91 80 4118 8800',
    email: 'bangalore@bnautomobiles.in',
    openingHours: {
      weekday: '9:00 AM – 7:00 PM',
      saturday: '9:00 AM – 6:00 PM',
      sunday: '10:00 AM – 4:00 PM',
    },
    vehicleCount: 10,
    serviceCount: 7,
    arrivingCount: 3,
    coordinates: {
      lat: 12.9611,
      lng: 77.6387,
    },
  },
  {
    id: 'bn-mumbai',
    city: 'mumbai',
    name: 'BN Automobiles Mumbai',
    address: 'Ground Floor, Turner Road, Bandra West, Mumbai, Maharashtra 400050',
    phone: '+91 22 6132 5500',
    email: 'mumbai@bnautomobiles.in',
    openingHours: {
      weekday: '9:00 AM – 7:00 PM',
      saturday: '9:00 AM – 6:00 PM',
      sunday: '10:00 AM – 4:00 PM',
    },
    vehicleCount: 9,
    serviceCount: 5,
    arrivingCount: 2,
    coordinates: {
      lat: 19.0596,
      lng: 72.8295,
    },
  },
  {
    id: 'bn-chennai',
    city: 'chennai',
    name: 'BN Automobiles Chennai',
    address: '48, Khader Nawaz Khan Road, Nungambakkam, Chennai, Tamil Nadu 600006',
    phone: '+91 44 4291 9900',
    email: 'chennai@bnautomobiles.in',
    openingHours: {
      weekday: '9:00 AM – 7:00 PM',
      saturday: '9:00 AM – 6:00 PM',
      sunday: '10:00 AM – 4:00 PM',
    },
    vehicleCount: 9,
    serviceCount: 6,
    arrivingCount: 4,
    coordinates: {
      lat: 13.0592,
      lng: 80.2459,
    },
  },
];
