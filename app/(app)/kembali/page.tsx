'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, ShoppingCart, Undo2, UserRound, X } from 'lucide-react';
import { AsyncButton } from '@/components/async-button';
import { BarcodeInput } from '@/components/barcode-input';
import { Pagination, paginate } from '@/components/pagination';
import { TableToolbar } from '@/components/table-toolbar';
import { notify } from '@/lib/toast';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { api, fetcher, type SwrKey } from '@/lib/api';
import { cn, matches, tgl } from '@/lib/utils';

type Loan = {
  id_pinjam: string; group_id: string; id_exemplar: string; kategori: string; nama: string;
  kelas: string; alamat: string; no_telp: string; tgl_pinjam: string; tgl_kembali: string;
  status: string; judul: string;
};
type CartEntry = {
  code: string; judul: string; nama: string; kelas: string; kategori: string; group_id: string;
};

export default function KembaliPage() {
  const { data: active = [], mutate } = useSWR<Loan[]>(['loans.active'] as SwrKey, fetcher);
  const [q, setQ] = useState('');
  const [kategori, setKategori] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [groupId, setGroupId] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [cartQ, setCartQ] = useState('');

  const groups = useMemo(() => {
    const m = new Map<string, Loan[]>();
    active.forEach((l) => m.set(l.group_id, [...(m.get(l.group_id) || []), l]));
    return Array.from(m.entries());
  }, [active]);

  const filteredGroups = groups.filter(([, items]) =>
    (kategori === 'all' || items[0].kategori === kategori) &&
    matches(q, items.flatMap((i) => [i.nama, i.kelas, i.group_id, i.id_exemplar, i.judul]))
  );
  const paged = paginate(filteredGroups, page, pageSize);
  const selectedItems = groups.find(([g]) => g === groupId)?.[1] || [];

  useEffect(() => { setPage(1); }, [q, kategori, pageSize]);

  const strukHref = (r: any, fallback: string[]) => {
    const codes = Array.isArray(r?.codes) && r.codes.length ? r.codes : fallback;
    return `/struk/kembali?kode=${encodeURIComponent(r?.kode || '')}&codes=${encodeURIComponent(codes.join(','))}`;
  };

  const doReturn = async (codes: string[]) => {
    if (!codes.length) throw new Error('Pilih buku dulu.');
    const r = await api<any>('loans.return', { codes });
    return { count: Number(r?.returned) || codes.length, kode: r?.kode || '', codes };
  };

  const selesaiReturn = () => {
    setPicked([]); setGroupId(''); setCart([]);
    mutate();
  };

  const scanUser = (code: string) => {
    const item = selectedItems.find((i) => i.id_exemplar === code);
    if (!item) return notify.error('Barcode ini tidak termasuk pinjaman yang dipilih.');
    if (picked.includes(code)) return notify.error('Sudah ditandai.');
    setPicked([...picked, code]);
    notify.success(item.judul + ' ditandai');
  };

  const scanCart = (code: string) => {
    const clean = String(code || '').trim();
    const item = active.find((l) => l.id_exemplar === clean);
    if (!item) return notify.error('Tidak ada pinjaman aktif dengan barcode itu.');
    if (cart.some((c) => c.code === clean)) return notify.error('Barcode sudah masuk keranjang.');
    setCart((prev) => [...prev, {
      code: clean, judul: item.judul, nama: item.nama, kelas: item.kelas,
      kategori: item.kategori, group_id: item.group_id,
    }]);
    notify.success(item.judul + ' masuk keranjang');
  };

  const daftarCart = useMemo(() => active.filter((l) =>
    matches(cartQ, [l.nama, l.kelas, l.judul, l.id_exemplar, l.group_id])
  ), [active, cartQ]);

  const cartGroups = useMemo(() => {
    const m = new Map<string, CartEntry[]>();
    cart.forEach((c) => {
      const key = `${c.group_id}|${c.nama}|${c.kelas}`;
      m.set(key, [...(m.get(key) || []), c]);
    });
    return Array.from(m.entries());
  }, [cart]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengembalian Buku</h1>
        <p className="text-sm text-muted-foreground">Kembalikan lewat peminjam atau keranjang cepat — scan barcode buku.</p>
      </div>

      <Tabs defaultValue="user">
        <TabsList>
          <TabsTrigger value="user"><UserRound className="mr-2 h-4 w-4" /> By User</TabsTrigger>
          <TabsTrigger value="cart"><ShoppingCart className="mr-2 h-4 w-4" /> Keranjang Cepat</TabsTrigger>
        </TabsList>

        {/* By User: kiri = cari peminjam, kanan = buku pinjamannya */}
        <TabsContent value="user">
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Cari Peminjam</CardTitle><CardDescription>Pilih grup peminjaman lalu scan buku yang dikembalikan.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <TableToolbar
                  search={q}
                  onSearch={setQ}
                  placeholder="Nama / kelas / kode pinjam / barcode…"
                  filters={[{ key: 'kategori', label: 'Kategori', options: [
                    { value: 'siswa', label: 'Siswa' },
                    { value: 'gukar', label: 'Gukar' },
                    { value: 'guest', label: 'Guest' },
                  ] }]}
                  values={{ kategori }}
                  onFilter={(_, v) => setKategori(v)}
                  onReset={() => { setQ(''); setKategori('all'); }}
                />
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {paged.items.map(([g, items]) => (
                    <button key={g} onClick={() => { setGroupId(g); setPicked([]); }}
                      className={cn('rounded-lg border p-3 text-left transition', groupId === g ? 'border-primary bg-accent ring-1 ring-primary' : 'hover:bg-muted')}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{items[0].nama}</p>
                        <Badge variant="secondary">{items.length} buku</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground capitalize">
                        {items[0].kategori}{items[0].kelas ? ` · ${items[0].kelas}` : ''} · {g}
                      </p>
                    </button>
                  ))}
                  {!paged.items.length && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">Tidak ada peminjaman yang cocok</p>}
                </div>
                <Pagination
                  page={paged.current} pages={paged.pages} total={paged.total} from={paged.from} to={paged.to}
                  pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}
                />
              </CardContent>
            </Card>

            {!!selectedItems.length ? (
              <Card>
                <CardHeader><CardTitle>Buku Pinjaman — {selectedItems[0].nama}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <BarcodeInput onDetect={scanUser} placeholder="Scan barcode buku pinjaman ini…" />
                  <Table>
                    <TableHeader><TableRow><TableHead>Barcode</TableHead><TableHead>Judul</TableHead><TableHead>Jatuh Tempo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selectedItems.map((i) => {
                        const done = picked.includes(i.id_exemplar);
                        return (
                          <TableRow key={i.id_pinjam} className={done ? 'bg-green-50' : ''}>
                            <TableCell className="barcode-text text-xs">{i.id_exemplar}</TableCell>
                            <TableCell className="text-sm font-medium">{i.judul}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{tgl(i.tgl_kembali)}</TableCell>
                            <TableCell>
                              {done ? <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Siap kembali</Badge> : <Badge variant="destructive">Dipinjam</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">{picked.length} dari {selectedItems.length} ditandai</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setPicked(selectedItems.map((i) => i.id_exemplar))}>Tandai semua</Button>
                      <AsyncButton
                        action={() => doReturn(picked)}
                        disabled={!picked.length}
                        loadingText="Mengembalikan…"
                        successText="Dikembalikan"
                        toast={{
                          loading: 'Memproses pengembalian…',
                          success: (r: any) => (
                            <span>
                              {r.count} buku berhasil dikembalikan ·{' '}
                              <a className="font-semibold underline" target="_blank" rel="noreferrer" href={strukHref(r, picked)}>Lihat struk</a>
                            </span>
                          ),
                        }}
                        onSuccess={selesaiReturn}
                      >
                        <Undo2 className="h-4 w-4" /> Kembalikan
                      </AsyncButton>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full">
                <CardHeader><CardTitle>Buku Peminjam</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <UserRound className="h-8 w-8 opacity-50" />
                    Pilih peminjam dulu untuk melihat buku pinjamannya.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Keranjang Cepat: kiri = daftar buku aktif, kanan = isi keranjang */}
        <TabsContent value="cart">
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Keranjang Pengembalian</CardTitle>
                <CardDescription>Scan barcode atau pilih buku aktif. Boleh mencampur banyak peminjam, lalu proses sekaligus.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BarcodeInput onDetect={scanCart} placeholder="Scan barcode buku untuk masuk keranjang…" />
                <TableToolbar
                  search={cartQ}
                  onSearch={setCartQ}
                  placeholder="Cari judul / peminjam / barcode untuk ditambahkan…"
                  onReset={() => setCartQ('')}
                />
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {daftarCart.slice(0, 30).map((l) => {
                    const masuk = cart.some((c) => c.code === l.id_exemplar);
                    return (
                      <div key={l.id_pinjam} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{l.judul}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {l.nama}{l.kelas ? ` · ${l.kelas}` : ''} · <span className="barcode-text">{l.id_exemplar}</span>
                          </p>
                        </div>
                        <Button size="sm" variant="outline" disabled={masuk} onClick={() => scanCart(l.id_exemplar)}>
                          {masuk ? 'Di keranjang' : 'Tambah'}
                        </Button>
                      </div>
                    );
                  })}
                  {!daftarCart.length && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada pinjaman aktif.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Keranjang ({cart.length})</CardTitle>
                  <CardDescription>Klik X untuk menghapus item dari keranjang.</CardDescription>
                </div>
                {!!cart.length && <Button variant="ghost" size="sm" onClick={() => setCart([])}>Kosongkan</Button>}
              </CardHeader>
              <CardContent className="space-y-3">
                {!cart.length ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 opacity-50" />
                    Belum ada buku di keranjang. Scan barcode atau pilih buku aktif di sebelah kiri.
                  </div>
                ) : (
                  <>
                    {cartGroups.map(([key, items]) => (
                      <div key={key} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{items[0].nama}</p>
                            <p className="truncate text-xs text-muted-foreground capitalize">
                              {items[0].kategori}{items[0].kelas ? ` · ${items[0].kelas}` : ''} · {items[0].group_id}
                            </p>
                          </div>
                          <Badge variant="secondary">{items.length} buku</Badge>
                        </div>
                        <div className="space-y-1">
                          {items.map((c) => (
                            <div key={c.code} className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1.5">
                              <div className="min-w-0">
                                <p className="truncate text-sm">{c.judul}</p>
                                <p className="barcode-text text-[11px] text-muted-foreground">{c.code}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Hapus dari keranjang"
                                onClick={() => setCart((prev) => prev.filter((x) => x.code !== c.code))}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <p className="text-sm text-muted-foreground">{cart.length} buku siap diproses</p>
                      <AsyncButton
                        action={() => doReturn(cart.map((c) => c.code))}
                        loadingText="Memproses…"
                        successText="Selesai"
                        toast={{
                          loading: `Mengembalikan ${cart.length} buku…`,
                          success: (r: any) => (
                            <span>
                              {r.count} buku berhasil dikembalikan ·{' '}
                              <a className="font-semibold underline" target="_blank" rel="noreferrer"
                                href={strukHref(r, cart.map((c) => c.code))}>
                                Lihat struk
                              </a>
                            </span>
                          ),
                        }}
                        onSuccess={selesaiReturn}
                      >
                        <Undo2 className="h-4 w-4" /> Proses Semua
                      </AsyncButton>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
