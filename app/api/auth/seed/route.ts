import { NextResponse } from 'next/server';
import { callGS } from '@/lib/gs';

export const runtime = 'nodejs';

// Hanya dipakai saat pertama kali (belum ada user sama sekali).
export async function GET() {
  const r = await callGS('auth.count');
  return NextResponse.json({ ok: r.ok, data: r.data, error: r.error });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const r = await callGS('auth.bootstrap', body);
    return NextResponse.json({ ok: r.ok, data: r.data, error: r.error }, { status: r.ok ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
