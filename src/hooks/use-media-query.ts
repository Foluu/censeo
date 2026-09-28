"use client";

import { useSyncExternalStore } from "react";

/** Subscribes to a CSS media query; false during SSR. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
