import { NextResponse } from 'next/server';
import { getUser } from './auth';

/** Server → Apps Script. Secret tidak pernah dikirim ke browser. */
export async function callGS(action: string, payload: Record<string, any> = {}) {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) throw new Error('APPS_SCRIPT_URL belum di-set di environment.');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: process.env.API_SECRET || '', action, ...payload }),
    cache: 'no-store',
  });
  return (await res.json()) as { ok: boolean; data?: any; error?: string };
}

const ADMIN_ONLY = new Set([
  'books.create', 'books.update', 'books.remove',
  'exemplars.add', 'exemplars.remove',
  'media.upload', 'media.remove',
  'users.list', 'users.create', 'users.update', 'users.remove',
]);

export const ENTITY: Record<string, string> = {
  'books.': 'books', 'exemplars.': 'exemplars', 'loans.': 'loans', 'users.': 'users',
};

export function entityOf(action: string) {
  const prefix = Object.keys(ENTITY).find((p) => action.startsWith(p));
  return prefix ? ENTITY[prefix] : 'data';
}

/** Dipakai route handler /api/gs — auth + role + forward + broadcast socket. */
export async function handleGS(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body tidak valid' }, { status: 400 });
  }

  const action = String(body.action || '');
  if (!action) return NextResponse.json({ ok: false, error: 'Action wajib' }, { status: 400 });
  if (ADMIN_ONLY.has(action) && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya admin yang bisa melakukan ini' }, { status: 403 });
  }

  delete body.action;
  try {
    const result = await callGS(action, { ...body, actor: user.nama });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error || 'Gagal' }, { status: 400 });

    if (action.includes('.create') || action.includes('.update') || action.includes('.remove') ||
        action === 'exemplars.add' || action === 'loans.borrow' || action === 'loans.return') {
      const io = (globalThis as any).io;
      if (io) {
        const entity = entityOf(action);
        const at = Date.now();
        // Klien login: sinyal lengkap. Klien publik: tanpa nama petugas.
        io.to('library').emit('library:changed', { entity, at, actor: user.nama });
        io.to('public').emit('library:changed', { entity, at });
      }
    }
    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Gagal menghubungi server' }, { status: 500 });
  }
}
