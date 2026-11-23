import { NextResponse } from 'next/server';
import { callGS } from '@/lib/gs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cover buku untuk halaman publik. Apps Script memastikan ID-nya memang cover buku. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: 'ID kosong' }, { status: 400 });

  try {
    const r = await callGS('public.cover', { id });
    if (!r.ok || !r.data) {
      return NextResponse.json({ ok: false, error: r.error || 'Cover tidak ditemukan' }, { status: 404 });
    }
    const mime = String(r.data.mime || '');
    if (!mime.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'Bukan file gambar' }, { status: 415 });
    }
    return new Response(Buffer.from(r.data.data, 'base64'), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Gagal memuat cover' }, { status: 500 });
  }
}
