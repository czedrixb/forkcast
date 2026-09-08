"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trash2, Camera, Search, Pencil } from "lucide-react";
import { deleteLogEntry } from "@/actions/log";

const SOURCE_ICON = { manual: Pencil, search: Search, scan: Camera } as const;

export type MealEntry = {
  id: string;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "manual" | "search" | "scan";
  food: { name: string } | null;
};

export function MealEntryCard({ entry }: { entry: MealEntry }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);
  const Icon = SOURCE_ICON[entry.source];

  function handleDelete() {
    setRemoved(true);
    startTransition(async () => {
      await deleteLogEntry(entry.id);
      router.refresh();
    });
  }

  if (removed) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.food?.name ?? "Logged food"}</p>
        <p className="text-xs text-muted">{entry.unit}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-sm font-semibold tabular-nums">{Math.round(entry.kcal)} kcal</p>
        <p className="text-xs text-muted tabular-nums">
          P{Math.round(entry.protein)} C{Math.round(entry.carbs)} F{Math.round(entry.fat)}
        </p>
      </div>
      <button
        onClick={handleDelete}
        disabled={isPending}
        aria-label="Delete entry"
        className="ml-1 rounded-full p-2 text-muted hover:bg-surface hover:text-fat disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
