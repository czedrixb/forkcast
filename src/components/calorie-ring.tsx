"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type CalorieRingProps = {
  consumed: number;
  target: number;
  size?: number;
};

export function CalorieRing({ consumed, target, size = 220 }: CalorieRingProps) {
  const reduceMotion = useReducedMotion();
  const remaining = Math.max(0, target - consumed);
  const percent = target > 0 ? Math.min(1, consumed / target) : 0;
  const over = consumed > target;

  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const [displayValue, setDisplayValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const duration = 900;
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(Math.round(from + (consumed - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumed]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={over ? "var(--fat)" : "var(--accent-ink)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - percent) }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span data-testid="calorie-consumed" className="font-display text-4xl font-bold tabular-nums">
          {(reduceMotion ? consumed : displayValue).toLocaleString()}
        </span>
        <span data-testid="calorie-remaining" className="text-sm text-muted">
          {over ? `${(consumed - target).toLocaleString()} over` : `${remaining.toLocaleString()} left`}
        </span>
      </div>
    </div>
  );
}
