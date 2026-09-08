"use client";

import { motion } from "framer-motion";

export function StreakHeatmap({ cells }: { cells: { date: string; logged: boolean }[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((cell, i) => (
        <motion.div
          key={cell.date}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.01 }}
          className="aspect-square rounded-md"
          style={{ backgroundColor: cell.logged ? "var(--accent)" : "var(--surface-2)" }}
          title={new Date(cell.date).toLocaleDateString()}
        />
      ))}
    </div>
  );
}
