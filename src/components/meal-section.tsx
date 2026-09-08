"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MealEntryCard, type MealEntry } from "@/components/meal-entry-card";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export function MealSection({
  mealType,
  entries,
}: {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  entries: MealEntry[];
}) {
  const totalKcal = entries.reduce((sum, e) => sum + e.kcal, 0);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">{MEAL_LABELS[mealType]}</h2>
        <div className="flex items-center gap-3">
          {totalKcal > 0 && (
            <span className="text-xs text-muted tabular-nums">{Math.round(totalKcal)} kcal</span>
          )}
          <Link
            href={`/search?meal=${mealType}`}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted hover:text-accent-ink"
            aria-label={`Add to ${MEAL_LABELS[mealType]}`}
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          Nothing logged yet.
        </p>
      ) : (
        <motion.div layout className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <MealEntryCard entry={entry} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
