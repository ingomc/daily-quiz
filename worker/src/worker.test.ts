import { describe, expect, it } from 'vitest';
import {
  berlinTime,
  handleRequest,
  MAX_DEVICES,
  parseSubscription,
  runReminder,
  type Env,
  type Sender,
  type Store,
} from './index';
import {
  b64urlDecode,
  b64urlEncode,
  encryptPayload,
  vapidAuthorization,
  type PushSubscriptionData,
} from './webpush';

const encoder = new TextEncoder();
const ORIGIN = 'https://quiz.example';

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8),
  );
}

/** A browser-side subscription with the private parts needed to decrypt. */
async function makeReceiver(endpoint = 'https://fcm.googleapis.com/fcm/send/abc') {
  const keys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const subscription: PushSubscriptionData = {
    endpoint,
    keys: { p256dh: b64urlEncode(publicKey), auth: b64urlEncode(auth) },
  };
  return { subscription, privateKey: keys.privateKey, publicKey, auth };
}

/** Decrypts an aes128gcm body the way a browser would (RFC 8291). */
async function decrypt(body: Uint8Array<ArrayBuffer>, receiver: Awaited<ReturnType<typeof makeReceiver>>) {
  const salt = body.slice(0, 16);
  const keyLength = body[20]!;
  const serverPublic = body.slice(21, 21 + keyLength);
  const ciphertext = body.slice(21 + keyLength);
  const serverKey = await crypto.subtle.importKey('raw', serverPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: serverKey }, receiver.privateKey, 256),
  );
  const ikm = await hkdf(
    receiver.auth,
    shared,
    concat(encoder.encode('WebPush: info\0'), receiver.publicKey, serverPublic),
    32,
  );
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext));
}

describe('webpush', () => {
  it('encrypts so that the subscriber can decrypt', async () => {
    const receiver = await makeReceiver();
    const message = 'Dein Quiz wartet – äöü 🔥';
    const body = await encryptPayload(receiver.subscription, encoder.encode(message));
    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    expect(body[20]).toBe(65);
    const plain = await decrypt(body, receiver);
    expect(plain.at(-1)).toBe(2);
    expect(new TextDecoder().decode(plain.slice(0, -1))).toBe(message);
  });

  it('uses a fresh salt and key for every message', async () => {
    const receiver = await makeReceiver();
    const a = await encryptPayload(receiver.subscription, encoder.encode('x'));
    const b = await encryptPayload(receiver.subscription, encoder.encode('x'));
    expect(b64urlEncode(a)).not.toBe(b64urlEncode(b));
  });

  it('signs a VAPID token the push service can verify', async () => {
    const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const publicKey = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
    const privateJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', keys.privateKey));
    const value = await vapidAuthorization(
      'https://web.push.apple.com/some/long/path',
      { publicKey, privateJwk, subject: 'https://quiz.example/' },
      1_800_000_000,
    );
    const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(value)!;
    expect(match[4]).toBe(publicKey);
    expect(JSON.parse(new TextDecoder().decode(b64urlDecode(match[1]!)))).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(JSON.parse(new TextDecoder().decode(b64urlDecode(match[2]!)))).toEqual({
      aud: 'https://web.push.apple.com',
      exp: 1_800_000_000 + 43_200,
      sub: 'https://quiz.example/',
    });
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      keys.publicKey,
      b64urlDecode(match[3]!),
      encoder.encode(`${match[1]}.${match[2]}`),
    );
    expect(valid).toBe(true);
  });
});

describe('berlinTime', () => {
  it('maps both cron times to 22:00 in the matching season', () => {
    expect(berlinTime(new Date('2026-07-01T20:00:00Z'))).toEqual({ date: '2026-07-01', hour: 22 });
    expect(berlinTime(new Date('2026-07-01T21:00:00Z')).hour).toBe(23);
    expect(berlinTime(new Date('2026-12-01T21:00:00Z'))).toEqual({ date: '2026-12-01', hour: 22 });
    expect(berlinTime(new Date('2026-12-01T20:00:00Z')).hour).toBe(21);
  });

  it('rolls the date at German midnight', () => {
    expect(berlinTime(new Date('2026-12-01T23:30:00Z'))).toEqual({ date: '2026-12-02', hour: 0 });
  });
});

describe('parseSubscription', () => {
  const keys = { p256dh: b64urlEncode(new Uint8Array(65)), auth: b64urlEncode(new Uint8Array(16)) };

  it('accepts the known push services', () => {
    for (const endpoint of [
      'https://fcm.googleapis.com/fcm/send/x',
      'https://web.push.apple.com/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/x',
      'https://db5p.notify.windows.com/w/?token=x',
    ]) {
      expect(parseSubscription({ endpoint, keys }), endpoint).toEqual({ endpoint, keys });
    }
  });

  it('rejects other hosts, schemes and malformed keys', () => {
    for (const endpoint of [
      'https://evil.example/push',
      'http://fcm.googleapis.com/fcm/send/x',
      'https://fcm.googleapis.com.evil.example/x',
      'https://fcm.googleapis.com:8443/x',
      'https://user@fcm.googleapis.com/x',
      'https://push.apple.com/x',
      'not a url',
    ]) {
      expect(parseSubscription({ endpoint, keys }), endpoint).toBeNull();
    }
    const endpoint = 'https://fcm.googleapis.com/fcm/send/x';
    expect(parseSubscription({ endpoint, keys: { ...keys, auth: 'AAAA' } })).toBeNull();
    expect(parseSubscription({ endpoint, keys: { ...keys, p256dh: '!!' } })).toBeNull();
    expect(parseSubscription({ endpoint })).toBeNull();
    expect(parseSubscription(null)).toBeNull();
  });
});

function memoryStore(): Store & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get: async (key) => map.get(key) ?? null,
    put: async (key, value) => void map.set(key, value),
    delete: async (key) => void map.delete(key),
    list: async ({ prefix }) => ({
      keys: [...map.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
    }),
  };
}

function makeEnv(): Env & { SUBS: ReturnType<typeof memoryStore> } {
  return {
    SUBS: memoryStore(),
    VAPID_PUBLIC_KEY: 'unused',
    VAPID_PRIVATE_JWK: '{}',
    VAPID_SUBJECT: 'https://quiz.example/',
    ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173`,
  };
}

const id = (n: number) => n.toString(16).padStart(32, '0');
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/x',
  keys: { p256dh: b64urlEncode(new Uint8Array(65)), auth: b64urlEncode(new Uint8Array(16)) },
};

function post(path: string, body: unknown, origin: string | null = ORIGIN): Request {
  return new Request(`https://push.example${path}`, {
    method: 'POST',
    headers: origin ? { Origin: origin, 'Content-Type': 'application/json' } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function recorder(status = 201): Sender & { calls: { endpoint: string; payload: string }[] } {
  const calls: { endpoint: string; payload: string }[] = [];
  const send: Sender = async (sub, payload) => {
    calls.push({ endpoint: sub.endpoint, payload });
    return status;
  };
  return Object.assign(send, { calls });
}

describe('handleRequest', () => {
  it('stores, updates and removes a device', async () => {
    const env = makeEnv();
    const send = recorder();
    expect((await handleRequest(post('/subscribe', { id: id(1), subscription, lastDone: '2026-11-13' }), env, send)).status).toBe(200);
    expect(JSON.parse(env.SUBS.map.get(`dev:${id(1)}`)!)).toMatchObject({ lastDone: '2026-11-13' });

    expect((await handleRequest(post('/done', { id: id(1), date: '2026-11-14' }), env, send)).status).toBe(200);
    expect(JSON.parse(env.SUBS.map.get(`dev:${id(1)}`)!).lastDone).toBe('2026-11-14');

    // Re-subscribing without a date keeps what is known.
    await handleRequest(post('/subscribe', { id: id(1), subscription }), env, send);
    expect(JSON.parse(env.SUBS.map.get(`dev:${id(1)}`)!).lastDone).toBe('2026-11-14');

    expect((await handleRequest(post('/unsubscribe', { id: id(1) }), env, send)).status).toBe(200);
    expect(env.SUBS.map.size).toBe(0);
  });

  it('answers CORS for allowed origins only', async () => {
    const env = makeEnv();
    const ok = await handleRequest(post('/subscribe', { id: id(1), subscription }), env, recorder());
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    const preflight = await handleRequest(
      new Request('https://push.example/subscribe', { method: 'OPTIONS', headers: { Origin: ORIGIN } }),
      env,
      recorder(),
    );
    expect(preflight.status).toBe(204);
    const foreign = await handleRequest(post('/subscribe', { id: id(2), subscription }, 'https://evil.example'), env, recorder());
    expect(foreign.status).toBe(403);
    expect(foreign.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(env.SUBS.map.size).toBe(1);
  });

  it('rejects bad input', async () => {
    const env = makeEnv();
    const send = recorder();
    expect((await handleRequest(post('/subscribe', { id: 'short', subscription }), env, send)).status).toBe(400);
    expect((await handleRequest(post('/subscribe', { id: id(1), subscription: { endpoint: 'https://evil.example/x', keys: subscription.keys } }), env, send)).status).toBe(400);
    expect((await handleRequest(post('/subscribe', 'not json'), env, send)).status).toBe(400);
    expect((await handleRequest(post('/subscribe', JSON.stringify({ id: id(1), pad: 'x'.repeat(5000) })), env, send)).status).toBe(400);
    expect((await handleRequest(post('/done', { id: id(9), date: '2026-11-14' }), env, send)).status).toBe(404);
    expect((await handleRequest(new Request('https://push.example/subscribe'), env, send)).status).toBe(405);
    await handleRequest(post('/subscribe', { id: id(1), subscription }), env, send);
    expect((await handleRequest(post('/done', { id: id(1), date: 'heute' }), env, send)).status).toBe(400);
    expect((await handleRequest(post('/nope', { id: id(1) }), env, send)).status).toBe(404);
  });

  it('caps the number of devices but lets known devices update', async () => {
    const env = makeEnv();
    const send = recorder();
    for (let n = 0; n < MAX_DEVICES; n++) {
      expect((await handleRequest(post('/subscribe', { id: id(n), subscription }), env, send)).status).toBe(200);
    }
    expect((await handleRequest(post('/subscribe', { id: id(999), subscription }), env, send)).status).toBe(429);
    expect((await handleRequest(post('/subscribe', { id: id(3), subscription }), env, send)).status).toBe(200);
  });

  it('sends a test message, rate-limited', async () => {
    const env = makeEnv();
    const send = recorder();
    let clock = 1_000_000;
    await handleRequest(post('/subscribe', { id: id(1), subscription }), env, send);
    expect((await handleRequest(post('/test', { id: id(1) }), env, send, () => clock)).status).toBe(200);
    expect(send.calls).toHaveLength(1);
    expect(JSON.parse(send.calls[0]!.payload).body).toContain('Test');
    clock += 5_000;
    expect((await handleRequest(post('/test', { id: id(1) }), env, send, () => clock)).status).toBe(429);
    clock += 6_000;
    expect((await handleRequest(post('/test', { id: id(1) }), env, send, () => clock)).status).toBe(200);
    expect(send.calls).toHaveLength(2);
  });

  it('drops a device whose subscription is gone', async () => {
    const env = makeEnv();
    await handleRequest(post('/subscribe', { id: id(1), subscription }), env, recorder());
    const response = await handleRequest(post('/test', { id: id(1) }), env, recorder(410));
    expect(response.status).toBe(410);
    expect(env.SUBS.map.size).toBe(0);
  });
});

describe('runReminder', () => {
  const at22 = new Date('2026-11-14T21:00:00Z');

  async function seed(env: ReturnType<typeof makeEnv>) {
    const send = recorder();
    await handleRequest(post('/subscribe', { id: id(1), subscription, lastDone: '2026-11-14' }), env, send);
    await handleRequest(post('/subscribe', { id: id(2), subscription, lastDone: '2026-11-13' }), env, send);
    await handleRequest(post('/subscribe', { id: id(3), subscription }), env, send);
  }

  it('reminds only devices that have not played today', async () => {
    const env = makeEnv();
    await seed(env);
    const send = recorder();
    expect(await runReminder(env, at22, send)).toBe(2);
    expect(send.calls).toHaveLength(2);
    expect(JSON.parse(send.calls[0]!.payload).body).toContain('wartet');
  });

  it('does nothing when it is not 22:00 in Berlin', async () => {
    const env = makeEnv();
    await seed(env);
    const send = recorder();
    expect(await runReminder(env, new Date('2026-11-14T20:00:00Z'), send)).toBe(0);
    expect(send.calls).toHaveLength(0);
  });

  it('removes expired subscriptions and survives failures', async () => {
    const env = makeEnv();
    await seed(env);
    expect(await runReminder(env, at22, recorder(410))).toBe(0);
    expect([...env.SUBS.map.keys()]).toEqual([`dev:${id(1)}`]);

    const env2 = makeEnv();
    await seed(env2);
    const failing: Sender = async () => {
      throw new Error('network');
    };
    expect(await runReminder(env2, at22, failing)).toBe(0);
    expect(env2.SUBS.map.size).toBe(3);
  });
});
