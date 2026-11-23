import { NextResponse } from 'next/server';
import { COOKIE, secureCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true, data: true });
  res.cookies.set(COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie(req),
    path: '/',
    maxAge: 0,
  });
  return res;
}
