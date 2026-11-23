import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';

const PUBLIC = ['/', '/login', '/api/auth/login', '/api/auth/seed', '/api/health', '/socket.io', '/api/public'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get('perpus_session')?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me'));
      valid = true;
    } catch {
      valid = false;
    }
  }

  // Sudah login? Tidak perlu melihat form login lagi.
  if (pathname === '/login' && valid) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (valid) return NextResponse.next();

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
