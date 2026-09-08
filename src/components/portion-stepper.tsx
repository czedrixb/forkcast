"use client";

import { Minus, Plus } from "lucide-react";

export function PortionStepper({
  multiplier,
  onChange,
}: {
  multiplier: number;
  onChange: (next: number) => void;
}) {
  const step = 0.25;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0.25, Math.round((multiplier - step) * 100) / 100))}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-muted hover:text-fg"
        aria-label="Decrease portion"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-10 text-center text-sm tabular-nums">{multiplier.toFixed(2)}×</span>
      <button
        type="button"
        onClick={() => onChange(Math.round((multiplier + step) * 100) / 100)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-muted hover:text-fg"
        aria-label="Increase portion"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
