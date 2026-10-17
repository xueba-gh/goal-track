import { NextResponse } from 'next/server';
import { checkPassword, createSessionToken, LOGIN_TIME_COOKIE, safeNext, SESSION_COOKIE, SESSION_DAYS } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const base = new URL(req.url);
  let password = '';
  let nextRaw = '/';
  try {
    const form = await req.formData();
    password = String(form.get('password') ?? '');
    nextRaw = String(form.get('next') ?? '/');
  } catch {}
  const next = safeNext(nextRaw);
  const secure = base.protocol === 'https:';

  if (await checkPassword(password)) {
    const res = NextResponse.redirect(new URL(next, base), 303);
    res.cookies.set(SESSION_COOKIE, await createSessionToken(), { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400 });
    // Readable by the app so the auto-lock timer starts fresh after each unlock.
    res.cookies.set(LOGIN_TIME_COOKIE, String(Date.now()), { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400 });
    return res;
  }

  // Slow down guessing.
  await new Promise((r) => setTimeout(r, 900));
  const back = new URL('/login', base);
  back.searchParams.set('e', '1');
  if (next !== '/') back.searchParams.set('next', next);
  return NextResponse.redirect(back, 303);
}
