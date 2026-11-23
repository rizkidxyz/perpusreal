'use client';

export type User = { id: string; username: string; nama: string; role: 'admin' | 'petugas' };

async function parse(res: Response) {
  const json = await res.json().catch(() => ({ ok: false, error: 'Respons tidak valid' }));
  if (!res.ok || json.ok === false) throw new Error(json.error || 'Permintaan gagal');
  return json.data;
}

/** Satu pintu untuk semua aksi Apps Script. */
export async function api<T = any>(action: string, payload: Record<string, any> = {}): Promise<T> {
  return parse(
    await fetch('/api/gs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
  );
}

export type SwrKey = [string, Record<string, any>?];
export const fetcher = ([action, payload]: SwrKey) => api(action, payload);

/** Fetcher untuk halaman publik — route /api/public sudah membatasi action-nya. */
export async function publicApi<T = any>(action: string, payload: Record<string, any> = {}): Promise<T> {
  return parse(
    await fetch('/api/public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
  );
}
export const publicFetcher = ([action, payload]: SwrKey) => publicApi(action, payload);

export async function login(username: string, password: string): Promise<User> {
  return parse(
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  );
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export const seedStatus = async (): Promise<{ count: number }> =>
  parse(await fetch('/api/auth/seed'));

export async function seedAdmin(payload: { username: string; password: string; nama: string }) {
  return parse(
    await fetch('/api/auth/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  );
}
