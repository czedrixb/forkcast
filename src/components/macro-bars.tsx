"use client";

import { motion } from "framer-motion";
import { clampPercent } from "@/lib/nutrition";

type Macro = { label: string; value: number; target: number; color: string };

export function MacroBars({
  protein,
  proteinTarget,
  carbs,
  carbTarget,
  fat,
  fatTarget,
}: {
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbTarget: number;
  fat: number;
  fatTarget: number;
}) {
  const macros: Macro[] = [
    { label: "Protein", value: protein, target: proteinTarget, color: "var(--protein)" },
    { label: "Carbs", value: carbs, target: carbTarget, color: "var(--carbs)" },
    { label: "Fat", value: fat, target: fatTarget, color: "var(--fat)" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {macros.map((macro) => (
        <div key={macro.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-medium">{macro.label}</span>
            <span className="text-muted tabular-nums">
              {Math.round(macro.value)}g / {Math.round(macro.target)}g
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: macro.color }}
              initial={{ width: 0 }}
              animate={{ width: `${clampPercent(macro.value, macro.target)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
