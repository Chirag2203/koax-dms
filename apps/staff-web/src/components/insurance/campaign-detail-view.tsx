/**
 * CampaignDetailView — per-campaign stats + delivery feed.
 *
 * Shows SVG bar chart + per-stat counters.
 * Polling stub: setInterval every 10s updates stats in mock mode.
 *
 * Gate: R10+
 * Spec reference: SPEC-INSURANCE-001 §5.5, §32
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';

interface Props {
  campaignId: string;
}

const STAT_COLORS: Record<string, string> = {
  sent: '#6366f1',
  delivered: '#10b981',
  read: '#3b82f6',
  replied: '#f59e0b',
  optedOut: '#ef4444',
  failed: '#94a3b8',
};

export function CampaignDetailView({ campaignId }: Props) {
  const campaigns = useInsuranceStore((s) => s.campaigns);
  const campaign = campaigns.find((c) => c.campaignId === campaignId);

  // Polling stub: in real implementation, this would fetch delivery status updates.
  // For v1 mock mode — stats are already seeded from fixture.
  useEffect(() => {
    if (!campaign || campaign.status === 'completed' || campaign.status === 'cancelled') return;
    const interval = setInterval(() => {
      // In production: fetch updated stats from BSP webhook handler
      // For v1 mock: no-op — stats are fixture-seeded
    }, 10_000);
    return () => clearInterval(interval);
  }, [campaign]);

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-full text-ink-muted text-[14px]">
        Campaign not found.
      </div>
    );
  }

  const { stats } = campaign;
  const maxVal = Math.max(stats.sent, stats.delivered, stats.read, 1);

  const statItems = [
    { key: 'sent', label: 'Sent', value: stats.sent },
    { key: 'delivered', label: 'Delivered', value: stats.delivered },
    { key: 'read', label: 'Read', value: stats.read },
    { key: 'replied', label: 'Replied', value: stats.replied },
    { key: 'optedOut', label: 'Opted Out', value: stats.optedOut },
    { key: 'failed', label: 'Failed', value: stats.failed },
  ] as const;

  return (
    <Gate role="R10" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        <div className="px-6 py-5 border-b border-line shrink-0">
          <Link
            href="/insurance/marketing/whatsapp"
            className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink-primary mb-3"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Back to campaigns
          </Link>
          <h1 className="text-[22px] font-semibold text-ink-primary">{campaign.name}</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Targeted: {stats.targeted} · Status: {campaign.status}
            {campaign.scheduledAt && ` · Scheduled: ${new Date(campaign.scheduledAt).toLocaleDateString('en-IN')}`}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* SVG bar chart */}
          <div className="rounded-lg border border-line bg-bg-surface p-5">
            <h2 className="text-[14px] font-semibold text-ink-primary mb-4">Delivery Stats</h2>
            <div className="flex items-end gap-4 h-40">
              {statItems.map((s) => {
                const pct = maxVal > 0 ? (s.value / maxVal) * 100 : 0;
                const color = STAT_COLORS[s.key] ?? '#6b7280';
                return (
                  <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[12px] text-ink-secondary font-medium">{s.value}</span>
                    <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                      <svg
                        width="100%"
                        height={`${Math.max(pct, 4)}%`}
                        style={{ minHeight: '4px' }}
                        aria-label={`${s.label}: ${s.value}`}
                      >
                        <rect
                          x="0"
                          y="0"
                          width="100%"
                          height="100%"
                          fill={color}
                          rx="3"
                          opacity="0.85"
                        />
                      </svg>
                    </div>
                    <span className="text-[10px] text-ink-muted text-center leading-tight">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audience filter summary */}
          <div className="rounded-lg border border-line bg-bg-surface p-4">
            <h3 className="text-[13px] font-semibold text-ink-primary mb-2">Audience Filter</h3>
            <div className="space-y-1 text-[12px] text-ink-secondary">
              {campaign.audienceFilter.cities && (
                <p>Cities: {campaign.audienceFilter.cities.join(', ')}</p>
              )}
              {campaign.audienceFilter.expiryWindowDays && (
                <p>Expiry window: ≤{campaign.audienceFilter.expiryWindowDays} days</p>
              )}
              <p className="text-success">Marketing consent: required (L10)</p>
              <p className="text-success">Opt-outs: excluded at send time (L14 / L_P3_1)</p>
            </div>
          </div>
        </div>
      </div>
    </Gate>
  );
}
