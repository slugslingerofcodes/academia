"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker.
 *
 * Production only — in development the worker would cache build output and
 * fight with hot reloading. To exercise it locally, run a production build
 * (`npm run build && npm start`) rather than `npm run dev`.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // offline support is a progressive enhancement; failing is non-fatal
      });
    };

    // wait for load so registration never competes with the first paint
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
