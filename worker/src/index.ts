import { b64urlDecode, sendPush, type PushSubscriptionData, type VapidKeys } from './webpush';

/** The part of Workers KV this worker uses. */
export interface Store {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string }): Promise<{ keys: { name: string }[] }>;
}

export interface Env {
  SUBS: Store;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_JWK: string;
  VAPID_SUBJECT: string;
  /** Comma-separated origins that may call the API from a browser. */
  ALLOWED_ORIGINS: string;
}

interface Device {
  subscription: PushSubscriptionData;
  /** Local day (YYYY-MM-DD) of the last finished round, as reported by the app. */
  lastDone: string | null;
  /** Epoch ms of the last test message. */
  lastTest: number;
}

/** Sends a payload to one device; returns the push service's HTTP status. */
export type Sender = (subscription: PushSubscriptionData, payload: string) => Promise<number>;

export const REMINDER_HOUR = 22;
export const MAX_DEVICES = 20;
const MAX_BODY_BYTES = 4096;
const TEST_INTERVAL_MS = 10_000;
const PREFIX = 'dev:';

const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

const REMINDER = JSON.stringify({
  title: 'Daily Quiz',
  body: 'Dein Quiz für heute wartet noch. 10 Fragen, dann ist die Serie sicher.',
});
const TEST = JSON.stringify({
  title: 'Daily Quiz',
  body: 'Test: So sieht deine Erinnerung um 22 Uhr aus.',
});

const berlin = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

/** Calendar day and hour in Germany for a point in time. */
export function berlinTime(now: Date): { date: string; hour: number } {
  const parts = Object.fromEntries(berlin.formatToParts(now).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function decodedLength(value: unknown): number {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value)) return -1;
  try {
    return b64urlDecode(value).length;
  } catch {
    return -1;
  }
}

/** Accepts only well-formed subscriptions at known push services. */
export function parseSubscription(value: unknown): PushSubscriptionData | null {
  if (typeof value !== 'object' || value === null) return null;
  const { endpoint, keys } = value as Record<string, unknown>;
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return null;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username !== '' || url.password !== '') {
    return null;
  }
  if (!PUSH_HOSTS.some((host) => host.test(url.hostname))) return null;
  if (typeof keys !== 'object' || keys === null) return null;
  const { p256dh, auth } = keys as Record<string, unknown>;
  if (decodedLength(p256dh) !== 65 || decodedLength(auth) !== 16) return null;
  return { endpoint, keys: { p256dh: p256dh as string, auth: auth as string } };
}

async function loadDevice(store: Store, id: string): Promise<Device | null> {
  const raw = await store.get(PREFIX + id);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as Device;
  } catch {
    return null;
  }
}

function saveDevice(store: Store, id: string, device: Device): Promise<void> {
  return store.put(PREFIX + id, JSON.stringify(device));
}

export function vapidSender(env: Env): Sender {
  const vapid: VapidKeys = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateJwk: env.VAPID_PRIVATE_JWK,
    subject: env.VAPID_SUBJECT,
  };
  return async (subscription, payload) => (await sendPush(subscription, payload, vapid)).status;
}

/** Push services answer 404 or 410 once a subscription is gone for good. */
function isGone(status: number): boolean {
  return status === 404 || status === 410;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function handleRequest(
  request: Request,
  env: Env,
  send: Sender = vapidSender(env),
  now: () => number = Date.now,
): Promise<Response> {
  const origin = request.headers.get('Origin');
  const allowed = origin !== null && env.ALLOWED_ORIGINS.split(',').includes(origin);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Vary: 'Origin' };
  if (allowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (origin !== null && !allowed) return reply(403, { error: 'origin' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'method' });

  const body = await readJson(request);
  if (!body || !isDeviceId(body.id)) return reply(400, { error: 'invalid' });
  const id = body.id;
  const path = new URL(request.url).pathname;

  if (path === '/subscribe') {
    const subscription = parseSubscription(body.subscription);
    if (!subscription) return reply(400, { error: 'subscription' });
    const existing = await loadDevice(env.SUBS, id);
    if (!existing) {
      const { keys } = await env.SUBS.list({ prefix: PREFIX });
      if (keys.length >= MAX_DEVICES) return reply(429, { error: 'full' });
    }
    await saveDevice(env.SUBS, id, {
      subscription,
      lastDone: isDate(body.lastDone) ? body.lastDone : (existing?.lastDone ?? null),
      lastTest: existing?.lastTest ?? 0,
    });
    return reply(200, { ok: true });
  }

  if (path === '/unsubscribe') {
    await env.SUBS.delete(PREFIX + id);
    return reply(200, { ok: true });
  }

  const device = await loadDevice(env.SUBS, id);
  if (!device) return reply(404, { error: 'unknown' });

  if (path === '/done') {
    if (!isDate(body.date)) return reply(400, { error: 'date' });
    if (device.lastDone !== body.date) {
      await saveDevice(env.SUBS, id, { ...device, lastDone: body.date });
    }
    return reply(200, { ok: true });
  }

  if (path === '/test') {
    if (now() - device.lastTest < TEST_INTERVAL_MS) return reply(429, { error: 'wait' });
    await saveDevice(env.SUBS, id, { ...device, lastTest: now() });
    const status = await send(device.subscription, TEST);
    if (isGone(status)) {
      await env.SUBS.delete(PREFIX + id);
      return reply(410, { error: 'gone' });
    }
    return status >= 200 && status < 300
      ? reply(200, { ok: true })
      : reply(502, { error: 'push', status });
  }

  return reply(404, { error: 'route' });
}

/** Reminds every device that has not reported today's round; returns the number sent. */
export async function runReminder(env: Env, now: Date, send: Sender): Promise<number> {
  const { date, hour } = berlinTime(now);
  // Two crons cover summer and winter time; only one of them is 22:00 in Berlin.
  if (hour !== REMINDER_HOUR) return 0;
  const { keys } = await env.SUBS.list({ prefix: PREFIX });
  let sent = 0;
  for (const { name } of keys) {
    const id = name.slice(PREFIX.length);
    const device = await loadDevice(env.SUBS, id);
    if (!device || device.lastDone === date) continue;
    try {
      const status = await send(device.subscription, REMINDER);
      if (isGone(status)) await env.SUBS.delete(name);
      else if (status >= 200 && status < 300) sent++;
      else console.warn(`push failed with ${status}`);
    } catch (error) {
      console.warn('push failed', error);
    }
  }
  return sent;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
  scheduled(controller: { scheduledTime: number }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): void {
    ctx.waitUntil(runReminder(env, new Date(controller.scheduledTime), vapidSender(env)));
  },
};
