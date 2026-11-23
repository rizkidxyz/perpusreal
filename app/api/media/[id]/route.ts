import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { callGS } from '@/lib/gs';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUser())) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  const { id } = await params;
  const r = await callGS('media.get', { id });
  if (!r.ok || !r.data) return NextResponse.json({ ok: false, error: r.error }, { status: 404 });
  return new Response(Buffer.from(r.data.data, 'base64'), {
    headers: {
      'Content-Type': r.data.mime || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
