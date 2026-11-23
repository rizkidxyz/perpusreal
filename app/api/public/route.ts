import { NextResponse } from 'next/server';
import { callGS } from '@/lib/gs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Khusus data publik: hanya action yang ada di sini yang boleh dipanggil tanpa login. */
const ALLOWED = new Set(['public.catalog', 'public.activity']);

export async function POST(req: Request) {
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body tidak valid' }, { status: 400 });
  }

  const action = String(body.action || '');
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ ok: false, error: 'Action tidak diizinkan' }, { status: 403 });
  }

  const limit = action === 'public.activity'
    ? Math.min(50, Math.max(1, Number(body.limit) || 20))
    : 0;

  try {
    const payload = action === 'public.activity' ? { limit } : {};
    const result = await callGS(action, payload);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error || 'Gagal' }, { status: 400 });
    }
    return NextResponse.json(
      { ok: true, data: result.data },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Gagal menghubungi server' }, { status: 500 });
  }
}
