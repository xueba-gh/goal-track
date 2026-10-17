/**
 * Master password gate. Works in Edge middleware and Node route handlers (Web Crypto only).
 *
 * APP_PASSWORD (required): the master password, set in Vercel environment variables.
 * AUTH_SECRET (optional): signs the session cookie. When absent, the password signs it,
 * so a password change signs out every device.
 */
const enc = new TextEncoder();

export const SESSION_COOKIE = 'gt_session';
export const LOGIN_TIME_COOKIE = 'gt_login';
export const SESSION_DAYS = 30;

export function isConfigured(): boolean {
  return !!process.env.APP_PASSWORD;
}

function signingSecret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || '';
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(`goal-track:${signingSecret()}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return b64url(new Uint8Array(sig));
}

async function digest(s: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(): Promise<string> {
  const exp = String(Date.now() + SESSION_DAYS * 86400000);
  return `${exp}.${await hmac(exp)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !signingSecret()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(await hmac(exp), sig);
}

export async function checkPassword(input: string): Promise<boolean> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return false;
  const [a, b] = await Promise.all([digest(input), digest(pw)]);
  return safeEqual(a, b);
}

/** Only allow same-site relative paths after login. */
export function safeNext(raw: string | null | undefined): string {
  const v = raw || '/';
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/';
}
