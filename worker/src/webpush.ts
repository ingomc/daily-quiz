/**
 * Web Push with WebCrypto only: message encryption per RFC 8291 (aes128gcm)
 * and VAPID authentication per RFC 8292.
 */

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface VapidKeys {
  /** Uncompressed P-256 public key, base64url (65 bytes). */
  publicKey: string;
  /** Private key as JWK JSON. */
  privateJwk: string;
  /** Contact for the push service: an https: or mailto: URL. */
  subject: string;
}

type Bytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();
const utf8 = (text: string): Bytes => new Uint8Array(encoder.encode(text));
const RECORD_SIZE = 4096;
const TTL_SECONDS = 4 * 60 * 60;

export function b64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(text: string): Bytes {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/** Encrypts a payload for one subscription; returns the aes128gcm request body. */
export async function encryptPayload(
  subscription: PushSubscriptionData,
  payload: Uint8Array,
): Promise<Bytes> {
  const clientPublic = b64urlDecode(subscription.keys.p256dh);
  const authSecret = b64urlDecode(subscription.keys.auth);
  if (payload.length > RECORD_SIZE - 86 - 17) throw new Error('Payload too large');

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const serverKeys = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const serverPublic = new Uint8Array(
    (await crypto.subtle.exportKey('raw', serverKeys.publicKey)) as ArrayBuffer,
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      // Workers types call this field `$public`; the runtime name is `public`.
      { name: 'ECDH', public: clientKey } as unknown as SubtleCryptoDeriveKeyAlgorithm,
      serverKeys.privateKey,
      256,
    ),
  );

  const keyInfo = concat(utf8('WebPush: info\0'), clientPublic, serverPublic);
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentKey = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
  // 0x02 marks the last (here: only) record.
  const plaintext = concat(payload, new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext),
  );

  const header = new Uint8Array(16 + 4 + 1 + serverPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = serverPublic.length;
  header.set(serverPublic, 21);
  return concat(header, ciphertext);
}

/** Builds the `Authorization: vapid ...` header value for a push endpoint. */
export async function vapidAuthorization(
  endpoint: string,
  vapid: VapidKeys,
  nowSeconds: number,
): Promise<string> {
  const header = b64urlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64urlEncode(
    encoder.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: nowSeconds + 12 * 60 * 60,
        sub: vapid.subject,
      }),
    ),
  );
  const key = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(vapid.privateJwk) as JsonWebKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      encoder.encode(`${header}.${claims}`),
    ),
  );
  return `vapid t=${header}.${claims}.${b64urlEncode(signature)}, k=${vapid.publicKey}`;
}

/** Sends one push message; resolves with the push service's response. */
export async function sendPush(
  subscription: PushSubscriptionData,
  payload: string,
  vapid: VapidKeys,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const body = await encryptPayload(subscription, encoder.encode(payload));
  return fetchImpl(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(
        subscription.endpoint,
        vapid,
        Math.floor(Date.now() / 1000),
      ),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(TTL_SECONDS),
      Urgency: 'normal',
    },
    body,
  });
}
