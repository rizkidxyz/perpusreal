'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { AsyncButton } from '@/components/async-button';
import { Pagination, paginate } from '@/components/pagination';
import { TableToolbar } from '@/components/table-toolbar';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useUser } from '@/components/user-context';
import { api, fetcher, type SwrKey } from '@/lib/api';
import { cn, matches } from '@/lib/utils';

type U = { id: string; username: string; nama: string; role: 'admin' | 'petugas'; aktif: boolean; created_at: string };

export default function PenggunaPage() {
  const me = useUser();
  const { data: users = [], mutate } = useSWR<U[]>(['users.list'] as SwrKey, fetcher);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', nama: '', role: 'petugas' });

  const list = useMemo(() => users.filter((u) =>
    matches(q, [u.nama, u.username, u.role]) &&
    (role === 'all' || u.role === role) &&
    (status === 'all' || (status === 'aktif' ? u.aktif : !u.aktif))
  ), [users, q, role, status]);
  const paged = paginate(list, page, pageSize);

  useEffect(() => { setPage(1); }, [q, role, status, pageSize]);

  const simpan = async () => {
    await api('users.create', form);
  };

  const update = async (u: U, patch: Partial<U>) => {
    await api('users.update', { id: u.id, ...patch });
  };

  const hapus = async (u: U) => {
    await api('users.remove', { id: u.id, selfId: me?.id });
  };

  if (me?.role !== 'admin') {
    return (
      <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">Akses ditolak</p>
        <p className="text-sm text-muted-foreground">Hanya admin yang bisa mengelola pengguna.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Pengguna</h1><p className="text-sm text-muted-foreground">Kelola akun admin & petugas</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Tambah</Button>
      </div>
      <Card>
        <CardContent className="space-y-4">
          <TableToolbar
            search={q}
            onSearch={setQ}
            placeholder="Cari nama / username…"
            filters={[
              { key: 'role', label: 'Role', options: [{ value: 'admin', label: 'Admin' }, { value: 'petugas', label: 'Petugas' }] },
              { key: 'status', label: 'Status', options: [{ value: 'aktif', label: 'Aktif' }, { value: 'nonaktif', label: 'Nonaktif' }] },
            ]}
            values={{ role, status }}
            onFilter={(key, v) => { if (key === 'role') setRole(v); else setStatus(v); }}
            onReset={() => { setQ(''); setRole('all'); setStatus('all'); }}
          />
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {paged.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nama}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.username}</TableCell>
                  <TableCell><Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">{u.role}</Badge></TableCell>
                  <TableCell>
                    <AsyncButton
                      variant="ghost"
                      size="sm"
                      action={() => update(u, { aktif: !u.aktif })}
                      loadingText="…"
                      successText="Diperbarui"
                      toast={{ loading: 'Memperbarui status…', success: u.aktif ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan' }}
                      onSuccess={() => { mutate(); }}
                    >
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', u.aktif ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground')}>
                        {u.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </AsyncButton>
                  </TableCell>
                  <TableCell className="text-right">
                    <AsyncButton
                      variant="ghost"
                      size="icon"
                      action={() => hapus(u)}
                      loadingText="…"
                      successText="Terhapus"
                      toast={{ loading: 'Menghapus pengguna…', success: 'Pengguna dihapus' }}
                      onSuccess={() => { mutate(); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </AsyncButton>
                  </TableCell>
                </TableRow>
              ))}
              {!paged.items.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Belum ada pengguna yang cocok</TableCell></TableRow>}
            </TableBody>
          </Table>
          <Pagination
            page={paged.current} pages={paged.pages} total={paged.total} from={paged.from} to={paged.to}
            pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Pengguna</DialogTitle><CardDescription>Akun baru langsung aktif.</CardDescription></DialogHeader>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="space-y-2"><Label>Nama</Label><Input required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
            <div className="space-y-2"><Label>Username</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="space-y-2"><Label>Password</Label><Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-2"><Label>Role</Label><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="petugas">Petugas</option><option value="admin">Admin</option></Select></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <AsyncButton
                type="button"
                action={simpan}
                loadingText="Menyimpan…"
                successText="Tersimpan"
                toast={{ loading: 'Menambahkan pengguna…', success: 'Pengguna ditambahkan' }}
                onSuccess={() => {
                  setOpen(false);
                  setForm({ username: '', password: '', nama: '', role: 'petugas' });
                  mutate();
                }}
              >
                Simpan
              </AsyncButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
