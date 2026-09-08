"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Droplet } from "lucide-react";
import { addWater } from "@/actions/tracking";

const GOAL_ML = 2000;
const STEP_ML = 250;

export function WaterTracker({ totalMl }: { totalMl: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const filledCups = Math.min(8, Math.round(totalMl / STEP_ML));

  function addCup() {
    startTransition(async () => {
      await addWater(STEP_ML);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between rounded-[28px] border border-border bg-surface p-5">
      <div>
        <p className="text-sm text-muted">Water</p>
        <p className="font-display text-xl font-semibold tabular-nums">
          {(totalMl / 1000).toFixed(2)}L <span className="text-sm font-normal text-muted">/ {(GOAL_ML / 1000).toFixed(1)}L</span>
        </p>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ scale: i < filledCups ? 1 : 0.9, opacity: i < filledCups ? 1 : 0.35 }}
              transition={{ duration: 0.25 }}
            >
              <Droplet
                className="h-4 w-4"
                fill={i < filledCups ? "var(--protein)" : "transparent"}
                stroke="var(--protein)"
              />
            </motion.div>
          ))}
        </div>
      </div>
      <button
        onClick={addCup}
        disabled={isPending}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-fg disabled:opacity-60"
        aria-label="Add 250ml water"
      >
        <Droplet className="h-5 w-5" />
      </button>
    </div>
  );
}
