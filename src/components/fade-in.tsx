"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Staggered entrance wrapper for dashboard/page sections. */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      // min-w-0: as a grid/flex child, let wide content (charts, long names)
      // shrink to the screen instead of pushing the page sideways.
      className={cn("min-w-0", className)}
    >
      {children}
    </motion.div>
  );
}
