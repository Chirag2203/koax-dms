'use client';

import { useKeyboardShortcuts } from '@/src/hooks/use-keyboard-shortcuts';
import { CommandPalette } from './command-palette';
import { StaffSidebar } from './staff-sidebar';
import { StaffTopBar } from './staff-top-bar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen flex bg-bg-canvas text-ink-primary">
      <StaffSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <StaffTopBar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Command palette — portals into document.body */}
      <CommandPalette />
    </div>
  );
}
