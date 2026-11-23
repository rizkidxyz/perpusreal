'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LibraryBig, Loader2 } from 'lucide-react';
import { AsyncButton } from '@/components/async-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { login, seedAdmin, seedStatus } from '@/lib/api';

export default function LoginPage() {
  const [needSeed, setNeedSeed] = useState<boolean | null>(null);
  const [form, setForm] = useState({ username: '', password: '', nama: '' });

  useEffect(() => {
    seedStatus().then((r) => setNeedSeed(r.count === 0)).catch(() => setNeedSeed(false));
  }, []);

  const submit = async () => {
    if (needSeed) {
      await seedAdmin({ username: form.username, password: form.password, nama: form.nama || 'Administrator' });
      setNeedSeed(false);
      setForm((f) => ({ ...f, password: '' }));
      return { seeded: true };
    }
    await login(form.username, form.password);
    return { seeded: false };
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-background to-indigo-100 p-4 dark:from-slate-950 dark:via-background dark:to-slate-900">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><LibraryBig className="h-6 w-6" /></div>
          <CardTitle className="text-2xl">{needSeed ? 'Buat Admin Pertama' : 'Masuk PerpusKu'}</CardTitle>
          <CardDescription>
            {needSeed ? 'Setup awal hanya bisa dilakukan saat database masih kosong.' : 'Peminjaman & pengembalian buku realtime'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needSeed === null ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              {needSeed && (
                <div className="space-y-2">
                  <Label htmlFor="nama">Nama</Label>
                  <Input id="nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Administrator" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="admin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>
              <AsyncButton
                type="button"
                className="w-full"
                action={submit}
                loadingText={needSeed ? 'Membuat admin…' : 'Memverifikasi…'}
                successText="Berhasil"
                toast={{
                  loading: needSeed ? 'Membuat admin pertama…' : 'Memeriksa kredensial…',
                  success: (r: any) => r.seeded ? 'Admin dibuat. Silakan login.' : 'Login berhasil',
                }}
                onSuccess={(r: any) => {
                  // Hard redirect: menghindari race condition router.replace + router.refresh
                  if (!r.seeded) setTimeout(() => window.location.assign('/dashboard'), 300);
                }}
              >
                {needSeed ? 'Buat Admin & Lanjut' : 'Masuk'}
              </AsyncButton>
            </form>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Tanpa akun? <Link href="/" className="font-medium text-primary hover:underline">Lihat katalog publik</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
