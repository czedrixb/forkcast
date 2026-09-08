"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, ScanLine, LineChart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-lg",
        "md:inset-y-0 md:right-auto md:w-20 md:border-r md:border-t-0",
      )}
    >
      <ul className="mx-auto flex max-w-md items-center justify-around py-2 md:h-full md:max-w-none md:flex-col md:justify-center md:gap-6 md:py-0">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="relative">
              <Link
                href={href}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs font-medium transition-colors",
                  active ? "text-accent-fg" : "text-muted hover:text-fg",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-2xl bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                <span className="relative z-10">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
