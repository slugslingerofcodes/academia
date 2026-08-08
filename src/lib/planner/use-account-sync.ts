"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PlannerData } from "./types";
import {
  getAccount,
  serverAccount,
  signIn as doSignIn,
  signOut as doSignOut,
  silentToken,
  subscribeAccount,
  type Account,
} from "./google-auth";
import { isConfigured, lastSyncedAt, syncWithDrive } from "./google-drive";

export type SyncState = "idle" | "syncing" | "synced" | "error";

/**
 * Ties the signed-in Google account to the planner stored in Drive.
 *
 * Once signed in, the planner is pulled on load and pushed again shortly after
 * any change, so two devices converge without anyone pressing a button. Every
 * write is a merge, so a device that was offline contributes its work rather
 * than being overwritten.
 */
export function useAccountSync(
  data: PlannerData,
  replaceAll: (d: PlannerData) => void
) {
  const account = useSyncExternalStore(subscribeAccount, getAccount, serverAccount);
  const [state, setState] = useState<SyncState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  // the sync callbacks read the latest planner through refs, so they stay
  // stable instead of being rebuilt on every edit. Updated in an effect, since
  // writing a ref during render is not allowed.
  const dataRef = useRef(data);
  const replaceRef = useRef(replaceAll);
  useEffect(() => {
    dataRef.current = data;
    replaceRef.current = replaceAll;
  }, [data, replaceAll]);

  const run = useCallback(async (token?: string) => {
    setState("syncing");
    setError(null);
    try {
      const result = await syncWithDrive(dataRef.current, token);
      replaceRef.current(result.merged);
      setSyncedAt(lastSyncedAt());
      setState("synced");
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
      setState("error");
      return null;
    }
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const { token } = await doSignIn();
      await run(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setState("error");
    }
  }, [run]);

  const signOut = useCallback(() => {
    doSignOut();
    setState("idle");
    setSyncedAt(null);
  }, []);

  const syncNow = useCallback(async () => {
    const token = (await silentToken()) ?? undefined;
    await run(token);
  }, [run]);

  // pull once on load, if already signed in and Google will issue a token quietly
  const pulled = useRef(false);
  useEffect(() => {
    if (!isConfigured() || !account || pulled.current) return;
    pulled.current = true;
    void (async () => {
      const token = await silentToken();
      if (token) await run(token);
    })();
  }, [account, run]);

  // push changes after a pause, rather than on every keystroke
  const firstRender = useRef(true);
  useEffect(() => {
    if (!isConfigured() || !account) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        const token = await silentToken();
        if (token) await run(token);
      })();
    }, 4000);
    return () => window.clearTimeout(id);
  }, [data, account, run]);

  return {
    account: account as Account | null,
    configured: isConfigured(),
    state,
    error,
    syncedAt: syncedAt ?? (typeof window !== "undefined" ? lastSyncedAt() : null),
    signIn,
    signOut,
    syncNow,
  };
}

export type AccountSync = ReturnType<typeof useAccountSync>;
