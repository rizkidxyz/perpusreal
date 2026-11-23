import { NextResponse } from 'next/server';
import { callGS } from '@/lib/gs';
import { COOKIE, signToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const result = await callGS('auth.login', { username, password });
    if (!result.ok || !result.data) {
      return NextResponse.json({ ok: false, error: result.error || 'Login gagal' }, { status: 401 });
    }
    // Tentukan Secure dari proto asli request, bukan NODE_ENV.
    // Aman untuk http://localhost (dev/start lokal) dan https:// (Render).
    const forwarded = req.headers.get('x-forwarded-proto');
    const proto = (forwarded || new URL(req.url).protocol.replace(':', '')).split(',')[0].trim();

    const res = NextResponse.json({ ok: true, data: result.data });
    res.cookies.set(COOKIE, await signToken(result.data), {
      httpOnly: true,
      sameSite: 'lax',
      secure: proto === 'https',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Login gagal' }, { status: 500 });
  }
}
