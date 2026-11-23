'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { LibraryBig, Loader2 } from 'lucide-react';
import { CoverImage } from '@/components/cover-image';
import { Pagination, paginate } from '@/components/pagination';
import { PublicNav } from '@/components/public-nav';
import { TableToolbar } from '@/components/table-toolbar';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { publicFetcher, type SwrKey } from '@/lib/api';
import { kategoriLabel } from '@/lib/log-label';
import { matches, waktuLengkap } from '@/lib/utils';

type Katalog = {
  id_buku: string; judul: string; penulis: string; penerbit: string; tahun_terbit: string | number;
  cover_url: string; total: number; tersedia: number;
};
type Aktivitas = {
  judul: string; nama: string; kelas: string; kategori: string; status: string;
  tgl_pinjam: string; tgl_kembali: string; tgl_kembali_aktual: string;
};
type EventAktivitas = {
  id: string; teks: string; judul: string; nama: string; kelas: string;
  kategori: string; status: string; waktu: string;
};

export default function Home() {
  const { data: katalog = [], isValidating } = useSWR<Katalog[]>(
    ['public.catalog'] as SwrKey, publicFetcher
  );
  const { data: aktivitas = [] } = useSWR<Aktivitas[]>(
    ['public.activity', { limit: 50 }] as SwrKey, publicFetcher
  );

  const [q, setQ] = useState('');
  const [tersedia, setTersedia] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [qAkt, setQAkt] = useState('');
  const [statusAkt, setStatusAkt] = useState('all');
  const [pageAkt, setPageAkt] = useState(1);
  const [pageSizeAkt, setPageSizeAkt] = useState(10);

  const buku = useMemo(() => katalog.filter((b) =>
    matches(q, [b.judul, b.penulis, b.penerbit, b.tahun_terbit]) &&
    (tersedia === 'all' || (tersedia === 'ya' ? b.tersedia > 0 : b.tersedia === 0))
  ), [katalog, q, tersedia]);
  const paged = paginate(buku, page, pageSize);

  // Satu pinjaman bisa memunculkan dua kejadian: dipinjam & dikembalikan.
  const events = useMemo(() => {
    const out: EventAktivitas[] = [];
    aktivitas.forEach((a, i) => {
      const judul = a.judul || '-';
      const nama = a.nama || '-';
      const kelas = a.kelas ? ' kelas ' + a.kelas : '';
      if (a.tgl_pinjam) out.push({
        id: 'pinjam-' + i,
        teks: 'Meminjamkan "' + judul + '" kepada ' + nama + kelas,
        judul, nama, kelas: a.kelas || '', kategori: a.kategori || '',
        status: 'dipinjam', waktu: a.tgl_pinjam,
      });
      if (a.tgl_kembali_aktual) out.push({
        id: 'kembali-' + i,
        teks: 'Menerima pengembalian "' + judul + '" dari ' + nama + kelas,
        judul, nama, kelas: a.kelas || '', kategori: a.kategori || '',
        status: 'dikembalikan', waktu: a.tgl_kembali_aktual,
      });
    });
    return out.sort((x, y) => String(y.waktu).localeCompare(String(x.waktu)));
  }, [aktivitas]);

  const laluLintas = useMemo(() => events.filter((a) =>
    matches(qAkt, [a.teks, a.judul, a.nama, a.kelas, a.kategori]) &&
    (statusAkt === 'all' || a.status === statusAkt)
  ), [events, qAkt, statusAkt]);
  const pagedAkt = paginate(laluLintas, pageAkt, pageSizeAkt);

  useEffect(() => { setPage(1); }, [q, tersedia, pageSize]);
  useEffect(() => { setPageAkt(1); }, [qAkt, statusAkt, pageSizeAkt]);

  return (
    <>
      <PublicNav />
      <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 pb-24 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
        <div>
          <Badge variant="secondary" className="mb-2 gap-1">
            <LibraryBig className="h-3 w-3" /> Katalog Publik
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Buku Paket Perpustakaan</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            Ketersediaan buku & lalu lintas peminjaman dan pengembalian.
            {isValidating && <Loader2 className="h-3 w-3 animate-spin" />}
            <span className="text-xs">· langsung diperbarui saat ada transaksi</span>
          </p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Buku</CardTitle>
          <CardDescription>Cari berdasarkan judul, penulis, penerbit, atau tahun</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableToolbar
            inputId="katalog-search"
            search={q}
            onSearch={setQ}
            placeholder="Cari judul / penulis / penerbit…"
            filters={[{ key: 'tersedia', label: 'Ketersediaan', options: [
              { value: 'ya', label: 'Masih ada' },
              { value: 'tidak', label: 'Habis' },
            ] }]}
            values={{ tersedia }}
            onFilter={(_, v) => setTersedia(v)}
            onReset={() => { setQ(''); setTersedia('all'); }}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paged.items.map((b) => (
              <Card key={b.id_buku} className="overflow-hidden">
                <div className="flex gap-3 p-3">
                  <CoverImage src={b.cover_url || undefined} alt={b.judul} className="h-24 w-16" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{b.judul}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{b.penulis || '-'}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {[b.penerbit, b.tahun_terbit].filter(Boolean).join(' · ') || '-'}
                    </p>
                  </div>
                </div>
                <CardContent className="flex items-center justify-between pt-0">
                  <Badge variant={b.tersedia > 0 ? 'default' : 'secondary'}>
                    {b.tersedia > 0 ? `${b.tersedia} tersedia` : 'Habis'}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{b.total} eksemplar</span>
                </CardContent>
              </Card>
            ))}
            {!paged.items.length && (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                Tidak ada buku yang cocok
              </p>
            )}
          </div>
          <Pagination
            page={paged.current} pages={paged.pages} total={paged.total} from={paged.from} to={paged.to}
            pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lalu Lintas Peminjaman & Pengembalian</CardTitle>
          <CardDescription>Pantau transaksi sirkulasi buku paket secara realtime</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableToolbar
            search={qAkt}
            onSearch={setQAkt}
            placeholder="Cari aktivitas / judul / nama peminjam / kelas…"
            filters={[{ key: 'status', label: 'Status', options: [
              { value: 'dipinjam', label: 'Dipinjam' },
              { value: 'dikembalikan', label: 'Dikembalikan' },
            ] }]}
            values={{ status: statusAkt }}
            onFilter={(_, v) => setStatusAkt(v)}
            onReset={() => { setQAkt(''); setStatusAkt('all'); }}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aktivitas</TableHead><TableHead>Kategori</TableHead>
                <TableHead>Status</TableHead><TableHead>Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedAkt.items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">{a.teks}</TableCell>
                  <TableCell><Badge variant="secondary">{kategoriLabel(a.kategori)}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={a.status === 'dipinjam' ? 'default' : 'secondary'}>
                      {a.status === 'dipinjam' ? 'Dipinjam' : 'Dikembalikan'}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{waktuLengkap(a.waktu)}</TableCell>
                </TableRow>
              ))}
              {!pagedAkt.items.length && (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Belum ada transaksi yang cocok</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            page={pagedAkt.current} pages={pagedAkt.pages} total={pagedAkt.total}
            from={pagedAkt.from} to={pagedAkt.to}
            pageSize={pageSizeAkt} onPage={setPageAkt} onPageSize={setPageSizeAkt}
          />
        </CardContent>
      </Card>
      </main>
    </>
  );
}
