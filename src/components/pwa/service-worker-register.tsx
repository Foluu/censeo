"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production. In development, any previously installed
 * worker is removed so it can't serve stale bundles during hot reload.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {});
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.warn("Service worker registration failed", error));
  }, []);

  return null;
}
