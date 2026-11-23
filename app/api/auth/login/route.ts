import { NextResponse } from 'next/server';
import { callGS } from '@/lib/gs';
import { COOKIE, secureCookie, signToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const result = await callGS('auth.login', { username, password });
    if (!result.ok || !result.data) {
      return NextResponse.json({ ok: false, error: result.error || 'Login gagal' }, { status: 401 });
    }
    // Secure ditentukan dari host, bukan x-forwarded-proto yang nilainya bisa
    // berbeda di balik edge Vercel. localhost tetap bisa dipakai untuk dev.
    const res = NextResponse.json({ ok: true, data: result.data });
    res.cookies.set(COOKIE, await signToken(result.data), {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie(req),
      path: '/',
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Login gagal' }, { status: 500 });
  }
}
