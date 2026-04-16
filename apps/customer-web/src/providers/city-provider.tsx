'use client';
import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';

export type CitySlug = 'bangalore' | 'mumbai' | 'chennai';
export type CitySelection = CitySlug | null;

const STORAGE_KEY = 'bn-city';
const COOKIE_KEY = 'bn-city';
const VALID_CITIES: CitySlug[] = ['bangalore', 'mumbai', 'chennai'];

const CITY_LABELS: Record<CitySlug, string> = {
  bangalore: 'Bangalore',
  mumbai: 'Mumbai',
  chennai: 'Chennai',
};

export interface CityContextValue {
  city: CitySelection;
  setCity: (city: CitySelection) => void;
  cityLabel: string;
}

export const CityContext = createContext<CityContextValue | null>(null);

function readStoredCity(): CitySelection {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as string | null;
    if (stored && VALID_CITIES.includes(stored as CitySlug)) {
      return stored as CitySlug;
    }
  } catch {
    // localStorage may be blocked in some environments
  }
  return null;
}

function persistCity(city: CitySelection): void {
  const value = city ?? '';
  try {
    if (city) {
      localStorage.setItem(STORAGE_KEY, city);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage may be blocked in some environments
  }
  // Set cookie for SSR — 1 year expiry, SameSite=Lax
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COOKIE_KEY}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

function getCityLabel(city: CitySelection): string {
  if (!city) return 'All Cities';
  return CITY_LABELS[city];
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<CitySelection>(null);

  // On mount: read stored city
  useEffect(() => {
    const stored = readStoredCity();
    setCityState(stored);
  }, []);

  const setCity = useCallback((next: CitySelection) => {
    setCityState(next);
    persistCity(next);
  }, []);

  return (
    <CityContext.Provider
      value={{ city, setCity, cityLabel: getCityLabel(city) }}
    >
      {children}
    </CityContext.Provider>
  );
}
