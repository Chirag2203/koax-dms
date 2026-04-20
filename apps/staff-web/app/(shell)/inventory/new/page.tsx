'use client';

/**
 * /inventory/new — Add Car page.
 *
 * Step 1: Mode chooser (default — no ?mode param)
 * Step 2a: Existing branch — VIN picker → sale fields form
 * Step 2b: New branch — full intake form (owner + vehicle + sale)
 *
 * Mode is managed in component state and reflected in the URL via router.push
 * with ?mode=existing | ?mode=new so browser back-button works correctly.
 *
 * PLAN-VEHICLES-002 §C — Part 2
 */

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AddCarModeChooser } from '@/src/components/inventory/new-flow/add-car-mode-chooser';
import { ExistingVehiclePicker } from '@/src/components/inventory/new-flow/existing-vehicle-picker';
import { ExistingSaleFieldsForm } from '@/src/components/inventory/new-flow/existing-sale-fields-form';
import { NewVehicleIntakeForm } from '@/src/components/inventory/new-flow/new-vehicle-intake-form';
import type { AddCarMode } from '@/src/components/inventory/new-flow/add-car-mode-chooser';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-driven mode
  const modeParam = searchParams.get('mode') as AddCarMode | null;

  // For "existing" branch: track the picked VIN in local state
  const [pickedVin, setPickedVin] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleModeSelect(mode: AddCarMode) {
    router.push(`/inventory/new?mode=${mode}`);
  }

  function handleCancel() {
    // Clear picked VIN and return to chooser
    setPickedVin(null);
    router.push('/inventory/new');
  }

  function handleBackToModeChooser() {
    setPickedVin(null);
    router.push('/inventory/new');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // No mode → show chooser
  if (!modeParam) {
    return <AddCarModeChooser onSelect={handleModeSelect} />;
  }

  // Existing branch: picker → sale fields
  if (modeParam === 'existing') {
    if (!pickedVin) {
      return (
        <ExistingVehiclePicker
          onPick={(vin) => setPickedVin(vin)}
          onCancel={handleBackToModeChooser}
        />
      );
    }
    return (
      <ExistingSaleFieldsForm
        vin={pickedVin}
        onCancel={() => setPickedVin(null)}
      />
    );
  }

  // New branch: full intake form
  if (modeParam === 'new') {
    return <NewVehicleIntakeForm onCancel={handleCancel} />;
  }

  // Fallback to chooser for unknown mode values
  return <AddCarModeChooser onSelect={handleModeSelect} />;
}
