"use client";

import { motion } from "framer-motion";

export function ScanOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
      <motion.div
        className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-accent/40 to-transparent"
        initial={{ y: "-100%" }}
        animate={{ y: "300%" }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 border-2 border-accent/60 rounded-[28px]" />
    </div>
  );
}
