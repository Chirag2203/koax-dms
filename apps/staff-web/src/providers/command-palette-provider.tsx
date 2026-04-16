'use client';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface CommandPaletteItem {
  type: 'vehicle' | 'customer' | 'job-card' | 'invoice' | 'action';
  id: string;
  label: string;
  hint?: string;
  category: string;
  shortcut?: string;
  href?: string;
}

interface RecentItem {
  id: string;
  openedAt: number;
}

const RECENT_STORAGE_KEY = 'bn-staff-palette-recent';
const MAX_RECENTS = 10;

export interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  registerItem: (item: CommandPaletteItem) => void;
  unregisterItem: (id: string) => void;
  getAllItems: () => CommandPaletteItem[];
  recentItems: CommandPaletteItem[];
  markItemOpened: (id: string) => void;
}

export const CommandPaletteContext =
  createContext<CommandPaletteContextValue | null>(null);

function readRecentIds(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as RecentItem[];
  } catch {
    // ignore parse errors
  }
  return [];
}

function persistRecentIds(recents: RecentItem[]): void {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recents));
  } catch {
    // localStorage may be blocked in some environments
  }
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  // Internal item registry — Map keyed by id
  const registryRef = useRef<Map<string, CommandPaletteItem>>(new Map());
  const [, forceUpdate] = useState(0);

  const [recentIds, setRecentIds] = useState<RecentItem[]>([]);

  // Hydrate recents from localStorage on mount
  useEffect(() => {
    setRecentIds(readRecentIds());
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
  }, []);

  const registerItem = useCallback((item: CommandPaletteItem) => {
    registryRef.current.set(item.id, item);
    forceUpdate((n) => n + 1);
  }, []);

  const unregisterItem = useCallback((id: string) => {
    registryRef.current.delete(id);
    forceUpdate((n) => n + 1);
  }, []);

  const getAllItems = useCallback((): CommandPaletteItem[] => {
    return Array.from(registryRef.current.values());
  }, []);

  const markItemOpened = useCallback((id: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      const updated: RecentItem[] = [
        { id, openedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENTS);
      persistRecentIds(updated);
      return updated;
    });
  }, []);

  // Derive recentItems from recentIds + registry
  const recentItems: CommandPaletteItem[] = recentIds
    .map((r) => registryRef.current.get(r.id))
    .filter((item): item is CommandPaletteItem => item !== undefined);

  // Global ⌘K listener
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Bail if active element is a text input/textarea/contenteditable
        const el = document.activeElement;
        const inInput =
          el &&
          (el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            (el as HTMLElement).isContentEditable);
        if (inInput) return;

        e.preventDefault();
        setOpenState((prev) => !prev);
      }
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <CommandPaletteContext.Provider
      value={{
        open,
        setOpen,
        registerItem,
        unregisterItem,
        getAllItems,
        recentItems,
        markItemOpened,
      }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      'useCommandPalette must be used within CommandPaletteProvider',
    );
  }
  return ctx;
}
