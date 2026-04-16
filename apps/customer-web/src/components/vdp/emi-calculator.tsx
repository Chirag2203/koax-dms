'use client';

import * as React from 'react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmiCalculatorProps {
  vehiclePrice: number;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

/**
 * Computes EMI using the standard reducing-balance formula.
 *
 * P = principal (vehiclePrice - downPayment)
 * r = monthly interest rate (annualRate / 12 / 100)
 * n = tenure in months
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 *
 * Edge case: if r ≈ 0 (i.e. 0% interest), EMI = P / n.
 */
function computeEmi(
  vehiclePrice: number,
  downPaymentPercent: number,
  tenureMonths: number,
  annualRate: number,
): { emi: number; totalInterest: number; principal: number } {
  const downPayment = Math.round((downPaymentPercent / 100) * vehiclePrice);
  const principal = vehiclePrice - downPayment;

  if (principal <= 0) {
    return { emi: 0, totalInterest: 0, principal: 0 };
  }

  const r = annualRate / 12 / 100;

  let emi: number;
  if (r < 0.0000001) {
    emi = principal / tenureMonths;
  } else {
    const factor = Math.pow(1 + r, tenureMonths);
    emi = (principal * r * factor) / (factor - 1);
  }

  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    principal,
  };
}

function formatTenureLabel(months: number): string {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${months} months`;
  if (rem === 0) return `${months} months (${years} ${years === 1 ? 'year' : 'years'})`;
  return `${months} months (${years}y ${rem}m)`;
}

// ─── Slider Row ───────────────────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  displayValue: string;
}

function SliderRow({
  label,
  id,
  min,
  max,
  step,
  value,
  onChange,
  displayValue,
}: SliderRowProps) {
  return (
    <div className="mb-8">
      <div className="flex items-end justify-between mb-2">
        <label
          htmlFor={id}
          className="font-mono text-[11px] uppercase tracking-widest text-ink-muted"
        >
          {label}
        </label>
        <span className="font-mono text-sm text-ink-primary tabular-nums">
          {displayValue}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'w-full h-[2px] rounded-none appearance-none cursor-pointer',
          'bg-line',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4',
          '[&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-accent',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:border-0',
          '[&::-moz-range-thumb]:w-4',
          '[&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-accent',
          '[&::-moz-range-thumb]:cursor-pointer',
          '[&::-moz-range-thumb]:border-0',
          'focus-visible:outline-none',
          'focus-visible:[&::-webkit-slider-thumb]:ring-2',
          'focus-visible:[&::-webkit-slider-thumb]:ring-accent',
          'focus-visible:[&::-webkit-slider-thumb]:ring-offset-2',
        )}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className="flex justify-between mt-1">
        <span className="font-mono text-[10px] text-ink-muted">{min}</span>
        <span className="font-mono text-[10px] text-ink-muted">{max}</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmiCalculator({ vehiclePrice, className }: EmiCalculatorProps) {
  const [downPaymentPercent, setDownPaymentPercent] = React.useState(30);
  const [tenureMonths, setTenureMonths] = React.useState(48);
  const [annualRate, setAnnualRate] = React.useState(10.5);

  const { emi, totalInterest, principal } = computeEmi(
    vehiclePrice,
    downPaymentPercent,
    tenureMonths,
    annualRate,
  );

  const downPaymentAmount = Math.round((downPaymentPercent / 100) * vehiclePrice);

  return (
    <section
      id="emi-calculator"
      className={cn(
        'bg-bg-paper py-16 md:py-24 px-6 md:px-12 lg:px-24',
        className,
      )}
      aria-labelledby="emi-calculator-heading"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h2
          id="emi-calculator-heading"
          className="font-display text-3xl md:text-[48px] tracking-[-0.04em] mb-4 text-ink-primary"
        >
          Financing Estimate
        </h2>
        <p className="text-ink-secondary mb-8 md:mb-12">
          Understand your monthly commitment.
        </p>

        {/* Sliders */}
        <SliderRow
          label="Down Payment"
          id="emi-down-payment"
          min={10}
          max={90}
          step={5}
          value={downPaymentPercent}
          onChange={setDownPaymentPercent}
          displayValue={`${downPaymentPercent}% · ${formatINR(downPaymentAmount)}`}
        />

        <SliderRow
          label="Tenure"
          id="emi-tenure"
          min={12}
          max={84}
          step={6}
          value={tenureMonths}
          onChange={setTenureMonths}
          displayValue={formatTenureLabel(tenureMonths)}
        />

        <SliderRow
          label="Interest Rate"
          id="emi-rate"
          min={8}
          max={14}
          step={0.25}
          value={annualRate}
          onChange={setAnnualRate}
          displayValue={`${annualRate.toFixed(2)}% p.a.`}
        />

        {/* Output */}
        <div
          className="border-t border-line mt-8 pt-8"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="mb-2">
            <span className="font-display text-4xl md:text-5xl text-accent tabular-nums">
              {formatINR(emi)}
            </span>
          </div>
          <p className="font-mono text-[11px] text-ink-muted uppercase tracking-widest mb-3">
            Estimated monthly EMI
          </p>
          <p className="text-sm text-ink-secondary">
            Total interest:{' '}
            <span className="text-ink-primary tabular-nums font-mono">
              {formatINR(totalInterest)}
            </span>{' '}
            over {tenureMonths} months on a principal of{' '}
            <span className="text-ink-primary tabular-nums font-mono">
              {formatINR(principal)}
            </span>
          </p>
        </div>

        {/* Disclaimer */}
        <p className="font-mono text-[10px] text-ink-muted mt-6 leading-relaxed">
          Indicative calculation only. Actual rates depend on credit assessment
          and lender terms. BN Automobiles does not provide financing directly.
        </p>
      </div>
    </section>
  );
}
