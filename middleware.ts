import { NextResponse, type NextRequest } from 'next/server';

// Cookie name sengaja ditulis literal supaya Edge bundle tidak menarik
// lib/auth.ts (jose + next/headers). Verifikasi JWT asli ada di Node runtime:
// - app/(app)/layout.tsx  -> getUser() untuk halaman
// - lib/gs.ts            -> getUser() untuk API data
const SESSION_COOKIE = 'perpus_session';

const PUBLIC = ['/', '/login', '/api/auth/login', '/api/auth/seed', '/api/health', '/socket.io', '/api/public'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = !!req.cookies.get(SESSION_COOKIE)?.value;

  // `/login` tidak diredirect di sini. app/login/layout.tsx yang memutuskan
  // (Node runtime), supaya cookie invalid tidak bikin loop login -> dashboard -> login.
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (hasCookie) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)'],
};
