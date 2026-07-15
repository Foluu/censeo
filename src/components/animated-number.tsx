"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";
import { formatNairaCompact, formatNumber } from "@/lib/format";

type Format = "number" | "naira-compact";

// Formatting happens on the client — functions can't cross the RSC boundary.
function fmt(value: number, format: Format) {
  return format === "naira-compact"
    ? formatNairaCompact(value)
    : formatNumber(Math.round(value));
}

/** Counts up from 0 when scrolled into view — used on KPI cards. */
export function AnimatedNumber({
  value,
  format = "number",
}: {
  value: number;
  format?: Format;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = fmt(latest, format);
      },
    });
    return () => controls.stop();
  }, [inView, value, format]);

  return <span ref={ref}>{fmt(value, format)}</span>;
}
