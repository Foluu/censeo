"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";

/** Counts up from 0 when scrolled into view — used on KPI cards. */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const fmt = format ?? ((n: number) => Math.round(n).toLocaleString());
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = fmt(latest);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString());
  return <span ref={ref}>{fmt(value)}</span>;
}
