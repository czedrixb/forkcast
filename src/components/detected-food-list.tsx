"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { PortionStepper } from "@/components/portion-stepper";
import type { DetectedFood } from "@/lib/ai/types";

export type EditableFood = DetectedFood & { multiplier: number };

export function scaleFood(item: EditableFood): DetectedFood {
  const { multiplier, ...base } = item;
  return {
    ...base,
    kcal: Math.round(base.kcal * multiplier),
    protein: Math.round(base.protein * multiplier * 10) / 10,
    carbs: Math.round(base.carbs * multiplier * 10) / 10,
    fat: Math.round(base.fat * multiplier * 10) / 10,
  };
}

export function DetectedFoodList({
  items,
  onChange,
  onRemove,
}: {
  items: EditableFood[];
  onChange: (index: number, multiplier: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const scaled = scaleFood(item);
        return (
          <motion.div
            key={`${item.name}-${i}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 24 }}
            className="rounded-2xl bg-surface-2 p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted">
                  {Math.round(item.confidence * 100)}% confident · {item.servingSize}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove ${item.name}`}
                className="rounded-full p-1.5 text-muted hover:bg-surface hover:text-fat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <PortionStepper multiplier={item.multiplier} onChange={(m) => onChange(i, m)} />
              <p className="font-display text-sm font-semibold tabular-nums">{scaled.kcal} kcal</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
