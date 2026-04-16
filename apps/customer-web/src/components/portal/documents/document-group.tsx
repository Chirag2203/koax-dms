'use client';

import * as React from 'react';
import type { Document } from '@dms/types';
import { DocumentCard } from './document-card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentGroupProps {
  vehicleName: string;
  documents: Document[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentGroup({ vehicleName, documents }: DocumentGroupProps) {
  return (
    <div>
      {/* Vehicle header */}
      <h3 className="font-display text-xl text-[var(--color-ink)] mb-4 pb-3 border-b border-[var(--color-line)]">
        {vehicleName}
      </h3>

      {/* Document rows */}
      <div className="divide-y divide-[var(--color-line)]">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
}
