import { PUSH_API, VAPID_PUBLIC_KEY } from './push-config';

/**
 * Daily reminder via Web Push. The worker (see worker/) stores this device's
 * push subscription and the day of the last finished round, nothing else.
 */

const KEY = 'daily-quiz:push';

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

interface Saved {
  /** Random device id; also the secret that lets this device change its entry. */
  id: string;
  endpoint: string;
  /** Last finished day the worker knows about. */
  reported: string | null;
}

function readSaved(): Saved | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (typeof value !== 'object' || value === null) return null;
    const { id, endpoint, reported } = value as Record<string, unknown>;
    if (typeof id !== 'string' || typeof endpoint !== 'string') return null;
    return { id, endpoint, reported: typeof reported === 'string' ? reported : null };
  } catch {
    return null;
  }
}

function writeSaved(saved: Saved | null): void {
  try {
    if (saved) localStorage.setItem(KEY, JSON.stringify(saved));
    else localStorage.removeItem(KEY);
  } catch {
    // Without storage the reminder cannot stay switched on.
  }
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushState(): PushState {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.permission === 'granted' && readSaved() ? 'on' : 'off';
}

function randomId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

function decodeKey(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function call(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(PUSH_API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

/** The active service worker registration, or null where none is installed (dev server). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!(await navigator.serviceWorker.getRegistration())) return null;
  return navigator.serviceWorker.ready;
}

async function subscribe(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  const options = { userVisibleOnly: true, applicationServerKey: decodeKey(VAPID_PUBLIC_KEY) };
  try {
    return await reg.pushManager.subscribe(options);
  } catch (error) {
    // A subscription made with another server key blocks a new one.
    const existing = await reg.pushManager.getSubscription();
    if (!existing) throw error;
    await existing.unsubscribe();
    return reg.pushManager.subscribe(options);
  }
}

/**
 * Asks for permission and registers this device. Must be called from a tap.
 * Resolves with the resulting state; rejects if the worker cannot be reached.
 */
export async function enablePush(lastDone: string | null): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if ((await Notification.requestPermission()) !== 'granted') return pushState();
  const reg = await registration();
  if (!reg) throw new Error('No service worker');
  const subscription = await subscribe(reg);
  const id = readSaved()?.id ?? randomId();
  const response = await call('/subscribe', { id, subscription: subscription.toJSON(), lastDone });
  if (!response.ok) throw new Error(`Subscribe failed with ${response.status}`);
  writeSaved({ id, endpoint: subscription.endpoint, reported: lastDone });
  return 'on';
}

export async function disablePush(): Promise<void> {
  const saved = readSaved();
  writeSaved(null);
  try {
    const reg = await registration();
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
  } finally {
    if (saved) await call('/unsubscribe', { id: saved.id }).catch(() => undefined);
  }
}

export async function sendTestPush(): Promise<'sent' | 'wait' | 'failed'> {
  const saved = readSaved();
  if (!saved) return 'failed';
  try {
    const response = await call('/test', { id: saved.id });
    if (response.status === 404 || response.status === 410) writeSaved(null);
    return response.ok ? 'sent' : response.status === 429 ? 'wait' : 'failed';
  } catch {
    return 'failed';
  }
}

/** Tells the worker that the round of `date` is finished, once per day. */
export async function reportDone(date: string): Promise<void> {
  const saved = readSaved();
  if (!saved || saved.reported === date) return;
  try {
    const response = await call('/done', { id: saved.id, date });
    if (response.ok) writeSaved({ ...saved, reported: date });
    else if (response.status === 404) writeSaved(null);
  } catch {
    // Offline: syncPush retries on the next start.
  }
}

/** On start: follow a changed or vanished subscription and catch up on reporting. */
export async function syncPush(doneToday: string | null): Promise<void> {
  if (pushState() !== 'on') return;
  const saved = readSaved();
  const reg = await registration();
  if (!saved || !reg) return;
  try {
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      writeSaved(null);
      return;
    }
    if (subscription.endpoint !== saved.endpoint) {
      const response = await call('/subscribe', {
        id: saved.id,
        subscription: subscription.toJSON(),
        lastDone: doneToday,
      });
      if (response.ok) writeSaved({ ...saved, endpoint: subscription.endpoint, reported: doneToday });
    }
    if (doneToday) await reportDone(doneToday);
  } catch {
    // Not reachable right now; the next start tries again.
  }
}
