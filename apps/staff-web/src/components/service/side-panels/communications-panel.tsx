'use client';

import { useMemo } from 'react';
import { MessageCircle, Phone, Mail, MessageSquare } from 'lucide-react';
import { SlideInPanel } from '@/src/components/primitives';
import { useServiceStore } from '@/src/lib/service/service-store';
import type { CommunicationChannel } from '@/src/lib/service/service-store';
import { cn } from '@dms/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function ChannelIcon({ channel }: { channel: CommunicationChannel }) {
  switch (channel) {
    case 'whatsapp':
      return <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden="true" />;
    case 'sms':
      return <MessageSquare className="h-4 w-4 text-blue-500" aria-hidden="true" />;
    case 'call':
      return <Phone className="h-4 w-4 text-ink-secondary" aria-hidden="true" />;
    case 'email':
      return <Mail className="h-4 w-4 text-ink-secondary" aria-hidden="true" />;
    default:
      return <MessageSquare className="h-4 w-4 text-ink-muted" aria-hidden="true" />;
  }
}

const CHANNEL_LABEL: Record<CommunicationChannel, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  call: 'Call',
  email: 'Email',
};

const ACTOR_MAP: Record<string, string> = {
  'staff-r09-001': 'Priya Sharma',
  'staff-r09-002': 'Rajesh Kumar',
  'staff-r09-003': 'Deepa Nair',
  'staff-r12-001': 'Vikram Singh',
  'staff-r19-001': 'Sunita Reddy',
  'staff-r24-001': 'Meera Iyer',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommunicationsPanelProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  jobNo: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommunicationsPanel({
  open,
  onClose,
  jobCardId,
  jobNo,
}: CommunicationsPanelProps) {
  const allCommunications = useServiceStore((s) => s.communications);
  const communications = useMemo(
    () =>
      allCommunications
        .filter((c) => c.jobCardId === jobCardId)
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    [allCommunications, jobCardId],
  );

  return (
    <SlideInPanel
      open={open}
      onClose={onClose}
      title={`Communications — ${jobNo}`}
      width="40%"
    >
      <div className="p-4 space-y-2">
        {communications.length === 0 && (
          <p className="text-[13px] text-ink-muted italic text-center py-8">
            No communications logged yet.
          </p>
        )}

        {communications.map((comm) => {
          const actorName = ACTOR_MAP[comm.actorId] ?? comm.actorId;
          return (
            <div
              key={comm.id}
              className="flex items-start gap-3 rounded-md border border-line bg-bg-surface p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-subtle">
                <ChannelIcon channel={comm.channel} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn(
                    'inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded',
                    'bg-bg-subtle text-ink-muted',
                  )}>
                    {CHANNEL_LABEL[comm.channel]}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {formatRelative(comm.sentAt)}
                  </span>
                </div>
                <p className="text-[13px] text-ink-primary">{comm.template}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">by {actorName}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SlideInPanel>
  );
}
