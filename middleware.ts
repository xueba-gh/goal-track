import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured, SESSION_COOKIE, verifySessionToken } from './lib/auth';
import { setupPage } from './lib/gatePages';

export async function middleware(req: NextRequest) {
  if (!isConfigured()) {
    return new NextResponse(setupPage(), {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
    });
  }

  if (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'locked' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  const next = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = '/login';
  url.search = '';
  if (next !== '/') url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

// Everything is locked except the lock screen itself and the install icons.
export const config = {
  matcher: ['/((?!login|api/login|manifest\\.webmanifest|icon-192\\.png|icon-512\\.png|apple-icon\\.png|robots\\.txt).*)'],
};
