"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "academia:install-dismissed";

/** Chrome's deferred install event; not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function subscribeDisplayMode(cb: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates display-mode and uses its own flag
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function noopSubscribe() {
  return () => {};
}

/* Dismissal lives in a module store so it can be read without a setState-in-
   effect, matching how the planner's other browser state is wired. */
let dismissedCache: boolean | null = null;
const dismissListeners = new Set<() => void>();

function subscribeDismissed(cb: () => void) {
  dismissListeners.add(cb);
  return () => dismissListeners.delete(cb);
}

function getDismissed(): boolean {
  if (dismissedCache === null) {
    dismissedCache = window.localStorage.getItem(DISMISSED_KEY) === "1";
  }
  return dismissedCache;
}

function markDismissed() {
  window.localStorage.setItem(DISMISSED_KEY, "1");
  dismissedCache = true;
  dismissListeners.forEach((l) => l());
}

function isIosDevice(): boolean {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && "ontouchend" in window);
}

/** Treat as installed while server-rendering so the banner never flashes. */
const serverInstalled = () => true;
const serverFalse = () => false;

export function InstallPrompt() {
  const installed = useSyncExternalStore(
    subscribeDisplayMode,
    isInstalled,
    serverInstalled
  );
  const ios = useSyncExternalStore(noopSubscribe, isIosDevice, serverFalse);
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissed,
    serverInstalled
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }, [deferred]);

  const dismiss = useCallback(() => {
    markDismissed();
  }, []);

  // nothing to offer once installed, dismissed, or on a desktop browser that
  // never fired an install event
  if (installed || dismissed || (!ios && !deferred)) return null;

  return (
    <div className="relative mb-6 rounded-2xl border border-accent/40 bg-accent-faint p-4 pr-10">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Add Academia to your home screen
          </p>
          {ios ? (
            <p className="mt-1 text-sm text-muted">
              Tap the Share button in Safari, then choose{" "}
              <span className="font-medium text-foreground">Add to Home Screen</span>. It
              opens like a normal app, with no address bar.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Install it as an app so it opens straight from your home screen.
            </p>
          )}
          {deferred && (
            <Button size="sm" className="mt-3 rounded-full px-4" onClick={install}>
              <Download data-icon="inline-start" />
              Install app
            </Button>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute top-3 right-3 rounded p-1 text-muted hover:bg-secondary hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
