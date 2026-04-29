/**
 * CompareView — comparison engine input + results page.
 *
 * Gate: R09+. S1, S2, S15.
 * Spec reference: SPEC-INSURANCE-001 §5.1, §13
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { Gate } from '@/src/components/primitives/gate';
import { QuoteCard } from './quote-card';
import { sortQuotes, type SortKey } from '@/src/lib/insurance/comparison';
import type { InsuranceQuote, InsuranceLead, Customer, VehicleMaster } from '@dms/types';
import { Search, SortAsc, MessageCircle, Link2, Plus, X, Check, UserPlus, Car } from 'lucide-react';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useToast } from '@/src/hooks/use-toast';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'total', label: 'Total Premium' },
  { key: 'csr', label: 'Claim Settlement' },
  { key: 'network', label: 'Network Garages' },
];

export function CompareView() {
  const router = useRouter();
  const providers = useInsuranceStore((s) => s.providers);
  const computeComparison = useInsuranceStore((s) => s.computeComparison);
  const saveQuote = useInsuranceStore((s) => s.saveQuote);
  const allLeads = useInsuranceStore((s) => s.leads);
  const customersMap = useCustomersStore((s) => s.customers);
  const vehiclesMap = useVehiclesStore((s) => s.vehicles);
  const ownershipIdByCustomer = useVehiclesStore((s) => s.ownershipIdByCustomer);
  const ownershipsMap = useVehiclesStore((s) => s.ownerships);
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  // Customer picker state
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    age: 35,
  });

  // Vehicle picker state
  const [vehicleMode, setVehicleMode] = useState<'linked' | 'manual'>('linked');
  const [selectedVin, setSelectedVin] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [quotes, setQuotes] = useState<InsuranceQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  const [vehicleInput, setVehicleInput] = useState({
    vin: 'WP0AB2A91MS247831',
    make: 'Porsche',
    model: '911',
    variant: '',
    year: 2021,
    color: '',
    fuelType: 'petrol' as 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid',
    registrationState: 'KA',
    exShowroomValue: 12800000,
    odometer: 18400,
    priorClaimsCount: 0,
  });
  const [customerInput, setCustomerInput] = useState({
    noClaimBonusYears: 2,
    customerAge: 35,
    panLast4: '',
    city: 'bangalore' as 'bangalore' | 'mumbai' | 'chennai',
  });

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const list = Object.values(customersMap).filter((c) => !c.id.startsWith('cust-bn'));
    if (!customerSearch.trim()) return list.slice(0, 30);
    const q = customerSearch.toLowerCase();
    return list
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q),
      )
      .slice(0, 30);
  }, [customersMap, customerSearch]);

  // Vehicles linked to selected customer
  const linkedVehicles = useMemo<VehicleMaster[]>(() => {
    if (!selectedCustomerId) return [];
    const ids = ownershipIdByCustomer[selectedCustomerId] ?? [];
    const vins = new Set<string>();
    for (const id of ids) {
      const o = ownershipsMap[id];
      if (o && o.state === 'ACTIVE') {
        vins.add(o.vin);
      }
    }
    return Array.from(vins)
      .map((vin) => vehiclesMap[vin])
      .filter(Boolean) as VehicleMaster[];
  }, [selectedCustomerId, ownershipIdByCustomer, ownershipsMap, vehiclesMap]);

  function selectExistingCustomer(c: Customer) {
    setSelectedCustomerId(c.id);
    setCustomerInput((ci) => ({
      ...ci,
      // age not on Customer type — keep existing or default
      panLast4: c.pan ? c.pan.slice(-4) : ci.panLast4,
      city: (c.preferredCity as 'bangalore' | 'mumbai' | 'chennai') ?? ci.city,
    }));
  }

  function selectLinkedVehicle(v: VehicleMaster) {
    setSelectedVin(v.vin);
    setVehicleInput((vi) => ({
      ...vi,
      vin: v.vin,
      make: v.make,
      model: v.model,
      variant: v.variant ?? '',
      year: v.year,
      color: v.color,
      odometer: v.lastKnownKm ?? vi.odometer,
    }));
  }

  const handleCompare = () => {
    setLoading(true);
    setError(null);
    try {
      const results = computeComparison(vehicleInput, customerInput);
      setQuotes(results);
    } catch (e) {
      setError('Could not generate quotes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sorted = useMemo(
    () => sortQuotes(quotes, sortKey, providers),
    [quotes, sortKey, providers],
  );

  // Open leads (not closed) — eligible to attach quotes to
  const openLeads = useMemo(
    () => allLeads.filter((l) => l.stage !== 'closed-won' && l.stage !== 'closed-lost'),
    [allLeads],
  );

  function handleAttachToLead(leadId: string) {
    if (!user) {
      toast('Sign in required', 'error');
      return;
    }
    let attached = 0;
    for (const q of quotes) {
      try {
        saveQuote(leadId, { ...q, leadId });
        attached += 1;
      } catch {
        // ignore individual failures; final toast summarizes
      }
    }
    setAttachOpen(false);
    toast(`${attached} quote(s) attached to lead`, 'success');
    router.push(`/insurance/leads/${leadId}`);
  }

  function handleSaveAsNewLead() {
    // Stash the comparison to sessionStorage so /leads/new can pick it up.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'bn-insurance-comparison-handoff',
        JSON.stringify({ vehicleInput, customerInput, quotes }),
      );
    }
    router.push('/insurance/leads/new?from=compare');
  }

  function buildWhatsAppText(): string {
    const top3 = sorted.slice(0, 3);
    const lines: string[] = [
      `Hi! Here's the insurance comparison for your ${vehicleInput.year} ${vehicleInput.make} ${vehicleInput.model}:`,
      '',
    ];
    top3.forEach((q, i) => {
      const provider = providers.find((p) => p.id === q.providerId);
      if (!provider) return;
      lines.push(
        `${i + 1}. ${provider.name} — ₹${q.totalPremium.toLocaleString('en-IN')} (CSR ${provider.claimSettlementRatio}%)`,
      );
    });
    lines.push('', 'Reply to this message and we\'ll help you finalise the policy.', '— BN Automobiles');
    return lines.join('\n');
  }

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">Compare Quotes</h1>
            <p className="mt-0.5 text-[13px] text-ink-muted leading-[1.5]">
              Compare insurance rates from {providers.length} providers
            </p>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Input panel ── */}
          <div className="w-96 flex-shrink-0 border-r border-line p-6 overflow-y-auto">
            {/* ─── Customer picker ─────────────────────────────────────── */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-semibold text-ink-primary">Customer</h2>
                <div className="flex items-center bg-bg-subtle rounded-md p-0.5 border border-line">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    aria-pressed={customerMode === 'existing'}
                    className={`px-2.5 h-6 rounded text-[11px] font-medium transition-colors ${
                      customerMode === 'existing'
                        ? 'bg-bg-surface text-ink-primary shadow-sm'
                        : 'text-ink-muted'
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('new');
                      setSelectedCustomerId(null);
                      setSelectedVin(null);
                      setVehicleMode('manual');
                    }}
                    aria-pressed={customerMode === 'new'}
                    className={`px-2.5 h-6 rounded text-[11px] font-medium transition-colors ${
                      customerMode === 'new'
                        ? 'bg-bg-surface text-ink-primary shadow-sm'
                        : 'text-ink-muted'
                    }`}
                  >
                    New
                  </button>
                </div>
              </div>

              {customerMode === 'existing' ? (
                <div>
                  {selectedCustomerId ? (
                    <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink-primary truncate">
                            {customersMap[selectedCustomerId]?.name}
                          </p>
                          <p className="text-[11px] text-ink-muted font-mono truncate">
                            {customersMap[selectedCustomerId]?.phone}
                          </p>
                          <p className="text-[11px] text-ink-muted capitalize truncate mt-0.5">
                            {customersMap[selectedCustomerId]?.preferredCity}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(null);
                            setSelectedVin(null);
                          }}
                          className="text-[11px] text-accent hover:underline shrink-0"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative mb-2">
                        <Search
                          size={12}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          type="search"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search by name, phone, email…"
                          className="w-full h-9 pl-8 pr-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                      <p className="text-[10px] text-ink-muted mb-1.5">
                        {filteredCustomers.length} customer
                        {filteredCustomers.length === 1 ? '' : 's'}
                        {customerSearch.trim()
                          ? ' match'
                          : ` (showing ${filteredCustomers.length} of ${
                              Object.values(customersMap).filter(
                                (c) => !c.id.startsWith('cust-bn'),
                              ).length
                            } — type to search)`}
                      </p>
                      <div className="max-h-72 overflow-y-auto rounded-md border border-line bg-bg-surface">
                        {filteredCustomers.length === 0 ? (
                          <p className="p-3 text-[12px] text-ink-muted text-center">
                            No customers match.
                          </p>
                        ) : (
                          <ul>
                            {filteredCustomers.map((c) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => selectExistingCustomer(c)}
                                  className="w-full text-left px-3 py-2 hover:bg-bg-subtle border-b border-line last:border-0"
                                >
                                  <p className="text-[13px] text-ink-primary font-medium truncate">
                                    {c.name}
                                  </p>
                                  <p className="text-[11px] text-ink-muted truncate flex items-center gap-2">
                                    <span className="font-mono">{c.phone}</span>
                                    <span className="capitalize">· {c.preferredCity}</span>
                                  </p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))}
                      placeholder="+91 phone"
                      className="h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="number"
                      value={newCustomer.age}
                      onChange={(e) =>
                        setNewCustomer((c) => ({ ...c, age: Number(e.target.value) }))
                      }
                      placeholder="Age"
                      className="h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-[10px] text-ink-muted">
                    Customer record will be created if you save the quote as a new lead.
                  </p>
                </div>
              )}
            </div>

            {/* ─── Vehicle picker ─────────────────────────────────────── */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-semibold text-ink-primary">Vehicle</h2>
                {selectedCustomerId && (
                  <div className="flex items-center bg-bg-subtle rounded-md p-0.5 border border-line">
                    <button
                      type="button"
                      onClick={() => setVehicleMode('linked')}
                      aria-pressed={vehicleMode === 'linked'}
                      className={`px-2.5 h-6 rounded text-[11px] font-medium transition-colors ${
                        vehicleMode === 'linked'
                          ? 'bg-bg-surface text-ink-primary shadow-sm'
                          : 'text-ink-muted'
                      }`}
                    >
                      Linked
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleMode('manual')}
                      aria-pressed={vehicleMode === 'manual'}
                      className={`px-2.5 h-6 rounded text-[11px] font-medium transition-colors ${
                        vehicleMode === 'manual'
                          ? 'bg-bg-surface text-ink-primary shadow-sm'
                          : 'text-ink-muted'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                )}
              </div>

              {vehicleMode === 'linked' && selectedCustomerId ? (
                linkedVehicles.length === 0 ? (
                  <div className="rounded-md border border-dashed border-line p-3 text-center">
                    <Car size={14} className="text-ink-muted mx-auto mb-1.5" aria-hidden />
                    <p className="text-[12px] text-ink-muted">
                      No linked vehicles. Switch to Manual.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {linkedVehicles.map((v) => (
                      <li key={v.vin}>
                        <button
                          type="button"
                          onClick={() => selectLinkedVehicle(v)}
                          className={`w-full text-left p-3 rounded-md border transition-colors ${
                            selectedVin === v.vin
                              ? 'border-accent/40 bg-accent/5'
                              : 'border-line bg-bg-surface hover:bg-bg-subtle'
                          }`}
                        >
                          <p className="text-[13px] font-medium text-ink-primary">
                            {v.year} {v.make} {v.model}
                          </p>
                          <p className="text-[11px] text-ink-muted font-mono truncate">
                            {v.vin}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={vehicleInput.vin}
                    onChange={(e) => setVehicleInput((v) => ({ ...v, vin: e.target.value }))}
                    placeholder="VIN (17 chars)"
                    className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={vehicleInput.make}
                      onChange={(e) => setVehicleInput((v) => ({ ...v, make: e.target.value }))}
                      placeholder="Make"
                      className="h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      value={vehicleInput.model}
                      onChange={(e) => setVehicleInput((v) => ({ ...v, model: e.target.value }))}
                      placeholder="Model"
                      className="h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={vehicleInput.variant}
                      onChange={(e) =>
                        setVehicleInput((v) => ({ ...v, variant: e.target.value }))
                      }
                      placeholder="Variant"
                      className="h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="number"
                      value={vehicleInput.year}
                      onChange={(e) =>
                        setVehicleInput((v) => ({ ...v, year: Number(e.target.value) }))
                      }
                      placeholder="Year"
                      className="h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ─── Underwriting fields (always visible) ─────────────── */}
            <div className="space-y-3">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Underwriting Inputs
              </h3>
              <div>
                <label className="block text-[11px] text-ink-muted mb-1" htmlFor="exShowroom">
                  Ex-Showroom Value (₹)
                </label>
                <input
                  id="exShowroom"
                  type="number"
                  value={vehicleInput.exShowroomValue}
                  onChange={(e) =>
                    setVehicleInput((v) => ({ ...v, exShowroomValue: Number(e.target.value) }))
                  }
                  className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-ink-muted mb-1" htmlFor="fuel">
                    Fuel
                  </label>
                  <select
                    id="fuel"
                    value={vehicleInput.fuelType}
                    onChange={(e) =>
                      setVehicleInput((v) => ({
                        ...v,
                        fuelType: e.target.value as typeof vehicleInput.fuelType,
                      }))
                    }
                    className="w-full h-9 px-2 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="cng">CNG</option>
                    <option value="electric">Electric</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-ink-muted mb-1" htmlFor="regState">
                    Reg State
                  </label>
                  <input
                    id="regState"
                    type="text"
                    maxLength={2}
                    value={vehicleInput.registrationState}
                    onChange={(e) =>
                      setVehicleInput((v) => ({
                        ...v,
                        registrationState: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary uppercase font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-ink-muted mb-1" htmlFor="ncbYears">
                    NCB Years
                  </label>
                  <input
                    id="ncbYears"
                    type="number"
                    min={0}
                    max={5}
                    value={customerInput.noClaimBonusYears}
                    onChange={(e) =>
                      setCustomerInput((c) => ({
                        ...c,
                        noClaimBonusYears: Number(e.target.value),
                      }))
                    }
                    className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-muted mb-1" htmlFor="priorClaims">
                    Prior Claims
                  </label>
                  <input
                    id="priorClaims"
                    type="number"
                    min={0}
                    value={vehicleInput.priorClaimsCount}
                    onChange={(e) =>
                      setVehicleInput((v) => ({
                        ...v,
                        priorClaimsCount: Number(e.target.value),
                      }))
                    }
                    className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-ink-muted mb-1" htmlFor="age">
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    value={customerInput.customerAge}
                    onChange={(e) =>
                      setCustomerInput((c) => ({
                        ...c,
                        customerAge: Number(e.target.value),
                      }))
                    }
                    className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-muted mb-1" htmlFor="odometer">
                    Odometer (km)
                  </label>
                  <input
                    id="odometer"
                    type="number"
                    value={vehicleInput.odometer}
                    onChange={(e) =>
                      setVehicleInput((v) => ({ ...v, odometer: Number(e.target.value) }))
                    }
                    className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompare}
              disabled={loading}
              className="mt-6 w-full h-10 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {loading ? 'Generating...' : 'Generate Quotes'}
            </button>
          </div>

          {/* ── Results panel ── */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-[13px] text-danger mb-4">
                {error}
              </div>
            )}

            {quotes.length === 0 && !loading && !error && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Search size={40} className="text-ink-muted mb-4" aria-hidden="true" />
                <p className="text-[15px] font-medium text-ink-primary mb-1">No quotes yet</p>
                <p className="text-[13px] text-ink-muted">Adjust inputs above and click Generate Quotes</p>
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-line bg-bg-surface p-4 animate-pulse">
                    <div className="h-12 bg-bg-subtle rounded mb-3" />
                    <div className="h-4 bg-bg-subtle rounded w-3/4 mb-2" />
                    <div className="h-4 bg-bg-subtle rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {sorted.length > 0 && !loading && (
              <>
                {/* Action bar — attach / share / save as lead */}
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-line bg-bg-surface">
                  <span className="text-[13px] text-ink-secondary mr-auto">
                    {sorted.length} quotes generated
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachOpen(true)}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-[13px] text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    <Link2 size={14} aria-hidden="true" />
                    Attach to existing lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhatsAppOpen(true)}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-[13px] font-medium text-[#25D366] hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    <MessageCircle size={14} aria-hidden="true" />
                    Send via WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAsNewLead}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  >
                    <Plus size={14} aria-hidden="true" />
                    Save as new lead
                  </button>
                </div>

                {/* Sort controls */}
                <div className="flex items-center gap-2 mb-4">
                  <SortAsc size={16} className="text-ink-muted" aria-hidden="true" />
                  <span className="text-[12px] text-ink-muted">Sort by:</span>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSortKey(opt.key)}
                      className={`px-3 h-7 rounded-full text-[12px] font-medium transition-colors ${
                        sortKey === opt.key
                          ? 'bg-accent text-white'
                          : 'bg-bg-subtle text-ink-secondary hover:bg-bg-hover'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {sorted.map((quote) => {
                    const provider = providers.find((p) => p.id === quote.providerId);
                    if (!provider) return null;
                    return (
                      <QuoteCard
                        key={quote.quoteId}
                        provider={provider}
                        quote={quote}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── IRDAI disclaimer ── */}
        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-[11px] text-ink-muted">
            BN Automobiles is a registered motor insurance web aggregator. Insurance is the subject matter of solicitation.
          </p>
        </div>
      </div>

      {/* Attach-to-lead dialog */}
      {attachOpen && (
        <AttachToLeadDialog
          leads={openLeads}
          onSelect={handleAttachToLead}
          onClose={() => setAttachOpen(false)}
        />
      )}

      {/* WhatsApp share dialog */}
      {whatsAppOpen && (
        <WhatsAppShareDialog
          messageText={buildWhatsAppText()}
          onClose={() => {
            setWhatsAppOpen(false);
            toast('WhatsApp opened in new tab', 'info');
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </Gate>
  );
}

// ─── Attach to lead dialog ───────────────────────────────────────────────────

function AttachToLeadDialog({
  leads,
  onSelect,
  onClose,
}: {
  leads: InsuranceLead[];
  onSelect: (leadId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.vin.toLowerCase().includes(q) ||
        l.customerId.toLowerCase().includes(q) ||
        l.leadId.toLowerCase().includes(q),
    );
  }, [leads, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Attach quotes to existing lead"
    >
      <div className="w-full max-w-lg rounded-xl bg-bg-surface border border-line p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-ink-primary">Attach to existing lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-bg-subtle rounded"
            aria-label="Close"
          >
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by VIN, customer ID, or lead ID…"
            className="w-full h-9 pl-9 pr-3 text-sm bg-bg-canvas border border-line rounded-md text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-2">
          {filtered.length === 0 ? (
            <p className="text-[13px] text-ink-muted text-center py-8">
              No open leads match.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((lead) => (
                <li key={lead.leadId}>
                  <button
                    type="button"
                    onClick={() => onSelect(lead.leadId)}
                    className="w-full px-3 py-2.5 rounded-md text-left hover:bg-bg-subtle border border-transparent hover:border-line transition-colors flex items-center gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-ink-primary truncate">
                          {lead.customerId}
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wide bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded">
                          {lead.stage.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted mt-0.5 font-mono truncate">
                        {lead.vin} · {lead.outlet} · {lead.quotes.length} existing quote(s)
                      </div>
                    </div>
                    <Check
                      size={14}
                      className="text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-line flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-sm rounded-md border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp share dialog ───────────────────────────────────────────────────

function WhatsAppShareDialog({
  messageText,
  onClose,
}: {
  messageText: string;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [editableText, setEditableText] = useState(messageText);

  function handleSend() {
    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    const url = cleanedPhone
      ? `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(editableText)}`
      : `https://wa.me/?text=${encodeURIComponent(editableText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Send comparison via WhatsApp"
    >
      <div className="w-full max-w-lg rounded-xl bg-bg-surface border border-line p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-ink-primary flex items-center gap-2">
            <MessageCircle size={18} className="text-[#25D366]" aria-hidden="true" />
            Share comparison via WhatsApp
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-bg-subtle rounded"
            aria-label="Close"
          >
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        <label className="flex flex-col gap-1 mb-3">
          <span className="text-[11px] text-ink-muted">Customer phone (optional — opens chooser if blank)</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-ink-muted">Message preview (editable)</span>
          <textarea
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            rows={9}
            className="px-3 py-2 rounded-md border border-line bg-bg-canvas text-[13px] text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent font-mono"
          />
        </label>

        <p className="mt-3 text-[10px] text-ink-muted">
          Opens WhatsApp Web / app in a new tab. Note: this is a one-off share, not a DLT-approved
          template campaign. Bulk marketing must use the DLT-approved templates flow.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-sm rounded-md border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-4 h-9 text-sm font-medium rounded-md bg-[#25D366] text-white hover:bg-[#1ea855] transition-colors"
          >
            Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
