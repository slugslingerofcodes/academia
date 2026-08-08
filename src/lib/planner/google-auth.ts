"use client";

import { DRIVE_SCOPE, isConfigured, requestAccessToken } from "./google-calendar";

/**
 * Account identity via Sign in with Google.
 *
 * Deliberately not a home-grown email/password system: that would mean storing
 * password hashes and running a database, and a hand-rolled auth layer is a
 * liability on a static site. Google already identifies the user, and the
 * planner already lives in their Drive, so signing in is what ties the two
 * together — the account *is* the Google account, and its data follows it to
 * any device.
 */

const PROFILE_KEY = "academia:account";
export const IDENTITY_SCOPE = "openid email profile";
export const ACCOUNT_SCOPE = `${IDENTITY_SCOPE} ${DRIVE_SCOPE}`;

const USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

export interface Account {
  email: string;
  name?: string;
  picture?: string;
}

/* module store so every component sees the same signed-in state */
let cached: Account | null | undefined;
const listeners = new Set<() => void>();

export function subscribeAccount(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getAccount(): Account | null {
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    cached = raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export const serverAccount = () => null;

function store(account: Account | null) {
  cached = account;
  try {
    if (account) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(account));
    else window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // private mode — identity just won't persist past this session
  }
  listeners.forEach((l) => l());
}

async function fetchProfile(token: string): Promise<Account> {
  const res = await fetch(USERINFO, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Could not read your Google profile.");
  const body = (await res.json()) as { email?: string; name?: string; picture?: string };
  if (!body.email) throw new Error("Google didn't return an email address.");
  return { email: body.email, name: body.name, picture: body.picture };
}

/** Interactive sign-in. Asks for identity and the app's private Drive folder. */
export async function signIn(): Promise<{ account: Account; token: string }> {
  if (!isConfigured()) throw new Error("Google client ID is not configured.");
  const token = await requestAccessToken(ACCOUNT_SCOPE);
  const account = await fetchProfile(token);
  store(account);
  return { account, token };
}

export function signOut() {
  store(null);
}

/**
 * Get a token without showing a popup, for background syncing.
 *
 * Access tokens last about an hour and this flow has no refresh token, so a
 * fresh one is needed each session. Google can issue it silently once consent
 * has already been given; if it can't, we return null rather than throwing a
 * popup at someone who didn't ask for one.
 */
export async function silentToken(): Promise<string | null> {
  if (!isConfigured() || !getAccount()) return null;
  try {
    return await requestAccessToken(ACCOUNT_SCOPE, { silent: true });
  } catch {
    return null;
  }
}
