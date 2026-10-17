import { NextResponse } from 'next/server';
import { LOGIN_TIME_COOKIE, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(LOGIN_TIME_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
