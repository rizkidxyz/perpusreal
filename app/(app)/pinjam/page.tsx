'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw, UserRound, X } from 'lucide-react';
import { AsyncButton } from '@/components/async-button';
import { BarcodeInput } from '@/components/barcode-input';
import { Pagination, paginate } from '@/components/pagination';
import { TableToolbar } from '@/components/table-toolbar';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { api, fetcher, type SwrKey } from '@/lib/api';
import { notify } from '@/lib/toast';
import { cn, matches, tgl } from '@/lib/utils';

type Kategori = 'siswa' | 'gukar' | 'guest';
type CartStatus = 'ready' | 'checking' | 'invalid';
type CartItem = { code: string; judul: string; lokasi: string; status: CartStatus; note?: string };
type CatalogItem = { code: string; judul: string; lokasi: string; peminjam?: string; kelas?: string };
type Catalog = { available: CatalogItem[]; borrowed: CatalogItem[]; tooLarge: boolean };
type CheckResult = { found: boolean; status: string; judul: string; lokasi: string; peminjam: string };
type LoanAktif = { id_pinjam: string; group_id: string; id_exemplar: string; kategori: string; nama: string; kelas: string; judul: string; tgl_kembali: string };
type PeminjamNama = { value: string; label: string; kelas?: string; baris: number };
type PeminjamOptions = {
  siswa: { kelas: string[]; names: PeminjamNama[] };
  gukar: { names: PeminjamNama[] };
};

const KATEGORI: { id: Kategori; label: string; desc: string }[] = [
  { id: 'siswa', label: 'Siswa', desc: 'Kelas + nama' },
  { id: 'gukar', label: 'Gukar', desc: 'Nama guru/karyawan' },
  { id: 'guest', label: 'Guest', desc: 'Nama + alamat + no. telp' },
];

const STATUS_LABEL: Record<CartStatus, string> = {
  ready: 'Siap', checking: 'Memeriksa…', invalid: 'Tidak valid',
};

export default function PinjamPage() {
  const [step, setStep] = useState(1);
  const [kategori, setKategori] = useState<Kategori>('siswa');
  const [form, setForm] = useState({ nama: '', kelas: '', alamat: '', noTelp: '' });
  const [pilihSiswa, setPilihSiswa] = useState('');
  const [pilihGukar, setPilihGukar] = useState('');
  const [kelasPilih, setKelasPilih] = useState('');
  const [manual, setManual] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [qAktif, setQAktif] = useState('');
  const [katAktif, setKatAktif] = useState('all');
  const [pageAktif, setPageAktif] = useState(1);
  const [pageSizeAktif, setPageSizeAktif] = useState(10);

  const { data: aktif = [] } = useSWR<LoanAktif[]>(['loans.active'] as SwrKey, fetcher);

  // Satu fetch saat masuk menu; di-refresh otomatis oleh socket library:changed.
  const { data: catalog, isLoading: loadingKatalog, mutate: mutateCatalog } = useSWR<Catalog>(
    ['catalog.borrowable'] as SwrKey,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Sumber nama peminjam; tanpa polling. Gagal → mode manual otomatis.
  const { data: peminjam, error: errorPeminjam, isLoading: loadingPeminjam, mutate: mutatePeminjam } = useSWR<PeminjamOptions>(
    ['peminjam.options'] as SwrKey,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!errorPeminjam) return;
    setManual(true);
    notify.error('Data peminjam dari spreadsheet tidak bisa dimuat. Silakan isi manual.');
  }, [errorPeminjam]);

  const kelasSiswa = useMemo(() => peminjam?.siswa.kelas || [], [peminjam]);
  const namaSiswa = useMemo(() => (peminjam?.siswa.names || []).filter((n) => n.kelas === kelasPilih), [peminjam, kelasPilih]);
  const namaGukar = useMemo(() => peminjam?.gukar.names || [], [peminjam]);

  const availableMap = useMemo(() => {
    const m = new Map<string, CatalogItem>();
    (catalog?.available || []).forEach((i) => m.set(i.code, i));
    return m;
  }, [catalog]);
  const borrowedMap = useMemo(() => {
    const m = new Map<string, CatalogItem>();
    (catalog?.borrowed || []).forEach((i) => m.set(i.code, i));
    return m;
  }, [catalog]);

  /** Scan murni lookup frontend — tidak ada await. */
  const scan = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    if (cart.some((c) => c.code === code)) return notify.error('Buku sudah masuk daftar.');

    if (catalog && !catalog.tooLarge) {
      const avail = availableMap.get(code);
      if (avail) {
        setCart((prev) => [...prev, { code, judul: avail.judul, lokasi: avail.lokasi, status: 'ready' }]);
        notify.success(avail.judul || code);
        return;
      }
      const borrowed = borrowedMap.get(code);
      if (borrowed) {
        return notify.error(`Sedang dipinjam oleh ${borrowed.peminjam || 'orang lain'}.`);
      }
    }

    // Barcode asing (atau katalog terlalu besar) → tampil dulu, cek belakangan.
    setCart((prev) => [...prev, { code, judul: code, lokasi: '', status: 'checking' }]);
    setQueue((q) => (q.includes(code) ? q : [...q, code]));
  };

  /** Debounce 250ms: semua barcode asing dicek dalam SATU request. */
  useEffect(() => {
    if (!queue.length) return;
    const timer = setTimeout(async () => {
      const codes = [...queue];
      setQueue([]);
      try {
        const res = await api<Record<string, CheckResult>>('exemplars.checkMany', { codes });
        setCart((prev) => prev.map((item) => {
          if (!codes.includes(item.code)) return item;
          const r = res[item.code];
          if (!r || !r.found || r.status !== 'available') {
            return {
              ...item,
              status: 'invalid',
              judul: r?.judul || item.judul,
              lokasi: r?.lokasi || item.lokasi,
              note: r?.status === 'dipinjam'
                ? `Dipinjam oleh ${r.peminjam || 'orang lain'}`
                : 'Barcode tidak ditemukan',
            };
          }
          return { ...item, status: 'ready', judul: r.judul || item.judul, lokasi: r.lokasi || item.lokasi };
        }));
        const gagal = codes.filter((c) => !res[c]?.found || res[c].status !== 'available');
        if (gagal.length) notify.error(`${gagal.length} barcode tidak valid`);
      } catch (err: any) {
        setQueue((q) => [...new Set([...q, ...codes])]);
        notify.error(err.message);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [queue]);

  const gantiKategori = (k: Kategori) => {
    setKategori(k);
    setForm({ nama: '', kelas: '', alamat: '', noTelp: '' });
    setPilihSiswa(''); setPilihGukar(''); setKelasPilih('');
  };

  const pilihKelas = (v: string) => {
    setKelasPilih(v); setPilihSiswa('');
    setForm({ ...form, kelas: v, nama: '' });
  };

  const pilihNamaSiswa = (v: string) => {
    const n = namaSiswa.find((x) => x.value === v);
    setPilihSiswa(v);
    setForm({ ...form, nama: n?.label || '', kelas: n?.kelas || kelasPilih });
  };

  const pilihNamaGukar = (v: string) => {
    const n = namaGukar.find((x) => x.value === v);
    setPilihGukar(v);
    setForm({ ...form, nama: n?.label || '', kelas: '' });
  };

  const segarkanPeminjam = async () => {
    try {
      const data = await api<PeminjamOptions>('peminjam.options', { refresh: true });
      await mutatePeminjam(data, { revalidate: false });
      setKelasPilih(''); setPilihSiswa(''); setPilihGukar('');
      setForm({ ...form, nama: '', kelas: '' });
      setManual(false);
      notify.success('Daftar peminjam diperbarui.');
    } catch (err: any) {
      setManual(true);
      notify.error(err?.message || 'Gagal memuat daftar peminjam.');
    }
  };

  const lanjut = () => {
    if (!form.nama.trim()) return notify.error('Nama wajib diisi.');
    if (kategori === 'siswa' && !form.kelas.trim()) return notify.error('Kelas wajib diisi.');
    if (kategori === 'guest' && (!form.alamat.trim() || !form.noTelp.trim())) return notify.error('Alamat & no. telp wajib diisi.');
    setStep(2);
  };

  const simpan = async () => {
    try {
      return await api<{ group_id: string }>('loans.borrow', {
        codes: cart.filter((c) => c.status === 'ready').map((c) => c.code), kategori,
        nama: form.nama, kelas: form.kelas, alamat: form.alamat, no_telp: form.noTelp,
      });
    } catch (err: any) {
      // Bentrok antar petugas → refresh katalog & tandai kode yang bermasalah.
      const msg = String(err.message || '').toLowerCase();
      setCart((prev) => prev.map((c) => msg.includes(c.code.toLowerCase())
        ? { ...c, status: 'invalid', note: 'Bentrok dengan transaksi lain' }
        : c));
      mutateCatalog();
      throw err;
    }
  };

  const selesaiPinjam = () => {
    setCart([]); setQueue([]);
    setForm({ nama: '', kelas: '', alamat: '', noTelp: '' });
    setPilihSiswa(''); setPilihGukar(''); setKelasPilih('');
    setStep(1);
    mutateCatalog();
  };

  const daftarAktif = useMemo(() => aktif.filter((l) =>
    (katAktif === 'all' || l.kategori === katAktif) &&
    matches(qAktif, [l.nama, l.kelas, l.id_exemplar, l.judul, l.group_id])
  ), [aktif, qAktif, katAktif]);
  const pagedAktif = paginate(daftarAktif, pageAktif, pageSizeAktif);

  useEffect(() => { setPageAktif(1); }, [qAktif, katAktif, pageSizeAktif]);

  const siap = cart.filter((c) => c.status === 'ready').length;
  const menunggu = cart.filter((c) => c.status === 'checking').length;
  const gagal = cart.filter((c) => c.status === 'invalid').length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Peminjaman Buku</h1>
        <p className="text-sm text-muted-foreground">Scan barcode buku, bisa lebih dari satu dalam satu transaksi</p>
      </div>

      <div className="flex items-center gap-2">
        {['Identitas Peminjam', 'Scan Buku', 'Konfirmasi'].map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('hidden text-xs font-medium sm:block', step === i + 1 ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>
            {i < 2 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" /> Identitas Peminjam</CardTitle><CardDescription>Pilih kategori lalu isi data sesuai kolom yang muncul.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {KATEGORI.map((k) => (
                <button key={k.id} type="button" onClick={() => gantiKategori(k.id)}
                  className={cn('rounded-lg border p-3 text-left transition', kategori === k.id ? 'border-primary bg-accent ring-1 ring-primary' : 'hover:bg-muted')}>
                  <p className="text-sm font-semibold capitalize">{k.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{k.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {loadingPeminjam ? 'Memuat daftar peminjam…'
                  : manual ? 'Sumber tidak tersedia · isi nama manual di bawah'
                  : kategori === 'guest' ? 'Tamu diisi manual'
                  : 'Nama diambil dari spreadsheet sumber'}
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={segarkanPeminjam} disabled={loadingPeminjam}>
                <RefreshCw className={cn('mr-1 h-3.5 w-3.5', loadingPeminjam && 'animate-spin')} /> Segarkan
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {kategori === 'guest' ? (
                <div className="space-y-2"><Label>Nama *</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" /></div>
              ) : kategori === 'siswa' && !manual ? (
                <>
                  <div className="space-y-2">
                    <Label>Kelas *</Label>
                    <Select value={kelasPilih} onChange={(e) => pilihKelas(e.target.value)} disabled={!kelasSiswa.length}>
                      <option value="">{kelasSiswa.length ? 'Pilih kelas dulu' : 'Tidak ada kelas'}</option>
                      {kelasSiswa.map((k) => <option key={k} value={k}>{k}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nama *</Label>
                    <Select value={pilihSiswa} onChange={(e) => pilihNamaSiswa(e.target.value)} disabled={!kelasPilih || !namaSiswa.length}>
                      <option value="">{!kelasPilih ? 'Pilih kelas dulu' : namaSiswa.length ? 'Pilih nama' : 'Tidak ada nama'}</option>
                      {namaSiswa.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </Select>
                  </div>
                </>
              ) : kategori === 'gukar' && !manual ? (
                <div className="space-y-2">
                  <Label>Nama *</Label>
                  <Select value={pilihGukar} onChange={(e) => pilihNamaGukar(e.target.value)} disabled={!namaGukar.length}>
                    <option value="">{namaGukar.length ? 'Pilih nama' : 'Tidak ada nama'}</option>
                    {namaGukar.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2"><Label>Nama *</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" /></div>
                  {kategori === 'siswa' && <div className="space-y-2"><Label>Kelas *</Label><Input value={form.kelas} onChange={(e) => setForm({ ...form, kelas: e.target.value })} placeholder="mis. X 1" /></div>}
                </>
              )}
            </div>
            {kategori === 'guest' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Alamat *</Label><Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></div>
                <div className="space-y-2"><Label>No. Telepon *</Label><Input value={form.noTelp} onChange={(e) => setForm({ ...form, noTelp: e.target.value })} /></div>
              </div>
            )}
            <div className="flex justify-end"><Button onClick={lanjut}>Lanjut Scan <ArrowRight className="h-4 w-4" /></Button></div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Scan Barcode Buku</CardTitle>
            <CardDescription className="flex items-center gap-1">
              Scanner USB (Enter) atau kamera.
              {loadingKatalog && <><Loader2 className="ml-1 h-3 w-3 animate-spin" /> Memuat katalog…</>}
              {!loadingKatalog && catalog && `${catalog.available.length} buku tersedia · pencocokan instan`}
              {catalog?.tooLarge && ' · mode verifikasi batch aktif'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarcodeInput onDetect={scan} />
            <Table>
              <TableHeader><TableRow>
                <TableHead>Barcode</TableHead><TableHead>Judul</TableHead><TableHead>Lokasi</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {cart.map((c) => (
                  <TableRow key={c.code}>
                    <TableCell className="barcode-text text-xs font-medium">{c.code}</TableCell>
                    <TableCell className="text-sm">
                      {c.judul}
                      {c.note && <p className="text-[11px] text-destructive">{c.note}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.lokasi || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'ready' ? 'default' : c.status === 'checking' ? 'secondary' : 'destructive'}>
                        {c.status === 'checking' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setCart(cart.filter((x) => x.code !== c.code))}><X className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {!cart.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Belum ada buku discan</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {siap} siap{menunggu ? ` · ${menunggu} memeriksa` : ''}{gagal ? ` · ${gagal} tidak valid` : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Kembali</Button>
                <Button disabled={!siap || menunggu > 0 || gagal > 0} onClick={() => setStep(3)}>Konfirmasi <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Konfirmasi Peminjaman</CardTitle><CardDescription>Periksa data sebelum disimpan.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-lg bg-muted p-4 text-sm sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Nama</p><p className="font-medium capitalize">{form.nama}</p></div>
              <div><p className="text-xs text-muted-foreground">Kategori</p><p className="font-medium capitalize">{kategori}</p></div>
              {form.kelas && <div><p className="text-xs text-muted-foreground">Kelas</p><p className="font-medium">{form.kelas}</p></div>}
              {form.alamat && <div><p className="text-xs text-muted-foreground">Alamat</p><p className="font-medium">{form.alamat}</p></div>}
              {form.noTelp && <div><p className="text-xs text-muted-foreground">No. Telp</p><p className="font-medium">{form.noTelp}</p></div>}
              <div><p className="text-xs text-muted-foreground">Jumlah buku</p><p className="font-medium">{siap} eksemplar</p></div>
            </div>
            <div className="space-y-2">
              {cart.filter((c) => c.status === 'ready').map((c) => (
                <div key={c.code} className="flex items-center justify-between rounded border px-3 py-2 text-sm"><span>{c.judul}</span><Badge variant="secondary" className="barcode-text text-[10px]">{c.code}</Badge></div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /> Kembali</Button>
              <AsyncButton
                action={simpan}
                disabled={siap === 0}
                loadingText="Menyimpan…"
                successText="Tersimpan"
                toast={{
                  loading: 'Menyimpan peminjaman…',
                  success: (r: any) => (
                    <span>
                      Peminjaman berhasil · {r.group_id} ·{' '}
                      <a className="font-semibold underline" target="_blank" rel="noreferrer"
                        href={`/struk/pinjam/${encodeURIComponent(r.group_id || '')}`}>
                        Lihat struk
                      </a>
                    </span>
                  ),
                }}
                onSuccess={selesaiPinjam}
              >
                Simpan Peminjaman
              </AsyncButton>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Peminjaman Aktif</CardTitle>
          <CardDescription>Pantau buku yang sedang dipinjam · data ikut ter-update realtime</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableToolbar
            search={qAktif}
            onSearch={setQAktif}
            placeholder="Cari nama / kelas / barcode / judul / kode pinjam…"
            filters={[{ key: 'kategori', label: 'Kategori', options: [
              { value: 'siswa', label: 'Siswa' },
              { value: 'gukar', label: 'Gukar' },
              { value: 'guest', label: 'Guest' },
            ] }]}
            values={{ kategori: katAktif }}
            onFilter={(_, v) => setKatAktif(v)}
            onReset={() => { setQAktif(''); setKatAktif('all'); }}
          />
          <Table>
            <TableHeader><TableRow>
              <TableHead>Barcode</TableHead><TableHead>Judul</TableHead><TableHead>Peminjam</TableHead>
              <TableHead>Kategori</TableHead><TableHead>Jatuh Tempo</TableHead><TableHead>Kode Pinjam</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pagedAktif.items.map((l) => (
                <TableRow key={l.id_pinjam}>
                  <TableCell className="barcode-text text-xs">{l.id_exemplar}</TableCell>
                  <TableCell className="text-sm font-medium">{l.judul || '-'}</TableCell>
                  <TableCell className="text-sm">{l.nama}{l.kelas ? ` · ${l.kelas}` : ''}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{l.kategori}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tgl(l.tgl_kembali)}</TableCell>
                  <TableCell className="barcode-text text-[11px] text-muted-foreground">{l.group_id}</TableCell>
                </TableRow>
              ))}
              {!pagedAktif.items.length && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Tidak ada pinjaman yang cocok</TableCell></TableRow>}
            </TableBody>
          </Table>
          <Pagination
            page={pagedAktif.current} pages={pagedAktif.pages} total={pagedAktif.total}
            from={pagedAktif.from} to={pagedAktif.to}
            pageSize={pageSizeAktif} onPage={setPageAktif} onPageSize={setPageSizeAktif}
          />
        </CardContent>
      </Card>
    </div>
  );
}
