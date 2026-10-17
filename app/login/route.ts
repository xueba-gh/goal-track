import { NextResponse } from 'next/server';
import { isConfigured, safeNext, SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { loginPage, setupPage } from '@/lib/gatePages';

export const dynamic = 'force-dynamic';

const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

export async function GET(req: Request) {
  if (!isConfigured()) return new NextResponse(setupPage(), { status: 503, headers });
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get('next'));
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (await verifySessionToken(token)) return NextResponse.redirect(new URL(next, url), 303);
  return new NextResponse(loginPage({ error: url.searchParams.get('e') === '1', next }), { headers });
}
