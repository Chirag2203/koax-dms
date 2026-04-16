import type { Metadata } from 'next';
import { outlets } from '@dms/mocks/fixtures';
import { CitiesHero, CitySection, ServiceMatrix } from '@/src/components/cities';
import type { TeamMember } from '@/src/components/cities';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Our Cities | BN Automobiles',
  description:
    'Visit BN Automobiles across Bangalore, Mumbai, and Chennai. Three distinguished showrooms dedicated to pre-owned luxury automotive excellence.',
};

// ─── Team rosters per city ────────────────────────────────────────────────────

const BANGALORE_TEAM: TeamMember[] = [
  {
    name: 'Rajesh Kumar',
    role: 'General Manager',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  },
  {
    name: 'Priya Sharma',
    role: 'Sales Director',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  },
  {
    name: 'Vikram Singh',
    role: 'Certification Lead',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  },
  {
    name: 'Meera Iyer',
    role: 'Client Relations',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
  },
];

const MUMBAI_TEAM: TeamMember[] = [
  {
    name: 'Arjun Nair',
    role: 'Service Head',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
  },
  {
    name: 'Anita Desai',
    role: 'Finance Manager',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  },
  {
    name: 'Priya Sharma',
    role: 'Sales Director',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  },
  {
    name: 'Rajesh Kumar',
    role: 'General Manager',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  },
];

const CHENNAI_TEAM: TeamMember[] = [
  {
    name: 'Meera Iyer',
    role: 'Client Relations',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
  },
  {
    name: 'Vikram Singh',
    role: 'Certification Lead',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  },
  {
    name: 'Anita Desai',
    role: 'Finance Manager',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  },
  {
    name: 'Arjun Nair',
    role: 'Service Head',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
  },
];

// ─── Showroom photos ──────────────────────────────────────────────────────────

const SHOWROOM_PHOTOS = {
  bangalore: {
    src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
    alt: 'BN Automobiles Bangalore flagship showroom — modern architecture',
  },
  mumbai: {
    src: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80',
    alt: 'BN Automobiles Mumbai atelier — coastal city architecture',
  },
  chennai: {
    src: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&q=80',
    alt: 'BN Automobiles Chennai studio — contemporary building',
  },
} as const;

// ─── City config ──────────────────────────────────────────────────────────────

const CITY_CONFIG = [
  {
    city: 'bangalore',
    tag: 'SOUTHERN HQ',
    roleLabel: 'The Flagship',
    description:
      'Nestled in the heart of Indiranagar, our Bangalore headquarters serves as the primary showroom and certification facility for the collection. A destination for discerning buyers across the Deccan plateau.',
    team: BANGALORE_TEAM,
  },
  {
    city: 'mumbai',
    tag: 'COASTAL ATELIER',
    roleLabel: 'The Atelier',
    description:
      'Our Mumbai atelier in Bandra West focuses on curated collection management and private transactions for our coastal clients. Modern, discreet, and meticulously appointed.',
    team: MUMBAI_TEAM,
  },
  {
    city: 'chennai',
    tag: 'EAST COAST STUDIO',
    roleLabel: 'The Studio',
    description:
      'Our Chennai studio on Khader Nawaz Khan Road brings the BN Standard to the East Coast, serving Nungambakkam\'s most discerning clientele with a hand-picked inventory.',
    team: CHENNAI_TEAM,
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CitiesPage() {
  return (
    <>
      <CitiesHero />

      {CITY_CONFIG.map((config, idx) => {
        const outlet = outlets.find((o) => o.city === config.city);
        if (!outlet) return null;

        const photo = SHOWROOM_PHOTOS[config.city];

        return (
          <CitySection
            key={config.city}
            outlet={outlet}
            index={idx + 1}
            tag={config.tag}
            roleLabel={config.roleLabel}
            description={config.description}
            showroomPhoto={photo.src}
            showroomAlt={photo.alt}
            team={config.team}
            alternate={idx % 2 !== 0}
          />
        );
      })}

      <ServiceMatrix />
    </>
  );
}
