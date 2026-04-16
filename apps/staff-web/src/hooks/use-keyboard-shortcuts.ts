'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Map chord prefix G + second key -> route
const NAV_CHORDS: Record<string, string> = {
  i: '/inventory',
  s: '/sales',
  v: '/service',
  p: '/parts',
  c: '/customers',
  f: '/finance',
  r: '/reports',
  n: '/notifications',
  d: '/dashboard',
};

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let chordMode = false;
    let chordTimer: ReturnType<typeof setTimeout> | null = null;

    function handler(e: KeyboardEvent) {
      // Bail if input is focused (except for ⌘K which other providers handle)
      const el = document.activeElement;
      const inInput =
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          (el as HTMLElement).isContentEditable);
      if (inInput) return;

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        chordMode = true;
        if (chordTimer) clearTimeout(chordTimer);
        chordTimer = setTimeout(() => {
          chordMode = false;
        }, 1000);
        return;
      }

      if (chordMode) {
        const route = NAV_CHORDS[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          router.push(route);
          chordMode = false;
          if (chordTimer) clearTimeout(chordTimer);
        }
      }
    }

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      if (chordTimer) clearTimeout(chordTimer);
    };
  }, [router]);
}
