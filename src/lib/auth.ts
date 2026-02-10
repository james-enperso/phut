import { Env, SessionUser } from '../types';

const ENTRA_AUTHORITY = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}`;

export function getAuthorizationUrl(env: Env, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.ENTRA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state,
  });
  return `${ENTRA_AUTHORITY(env.ENTRA_TENANT_ID)}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCodeForTokens(
  env: Env,
  code: string,
  redirectUri: string
): Promise<{ id_token: string; access_token: string }> {
  const body = new URLSearchParams({
    client_id: env.ENTRA_CLIENT_ID,
    client_secret: env.ENTRA_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    scope: 'openid profile email',
  });

  const res = await fetch(
    `${ENTRA_AUTHORITY(env.ENTRA_TENANT_ID)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${err}`);
  }

  return res.json();
}

// Decode JWT payload without verification (we trust Entra's token endpoint response)
export function decodeJwtPayload(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(payload);
  return JSON.parse(decoded);
}

// Create a signed session cookie value
export async function createSessionToken(
  user: SessionUser,
  secret: string
): Promise<string> {
  const payload = JSON.stringify(user);
  const key = await getHmacKey(secret);
  const sig = await sign(payload, key);
  // base64url(payload).base64url(sig)
  return `${btoa(payload)}.${sig}`;
}

// Verify and decode session cookie
export async function verifySessionToken(
  token: string,
  secret: string
): Promise<SessionUser | null> {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;

    const payload = atob(payloadB64);
    const key = await getHmacKey(secret);
    const valid = await verify(payload, sig, key);
    if (!valid) return null;

    const user: SessionUser = JSON.parse(payload);
    if (user.exp && Date.now() / 1000 > user.exp) return null;

    return user;
  } catch {
    return null;
  }
}

// --- HMAC helpers ---

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function sign(data: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return arrayBufferToBase64Url(sig);
}

async function verify(data: string, sig: string, key: CryptoKey): Promise<boolean> {
  const enc = new TextEncoder();
  const sigBuf = base64UrlToArrayBuffer(sig);
  return crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(data));
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToArrayBuffer(b64: string): ArrayBuffer {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}
