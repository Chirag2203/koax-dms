'use client';
import { useContext } from 'react';
import { CityContext } from '@/src/providers/city-provider';

export function useCity() {
  const context = useContext(CityContext);
  if (!context) throw new Error('useCity must be used within CityProvider');
  return context;
}
