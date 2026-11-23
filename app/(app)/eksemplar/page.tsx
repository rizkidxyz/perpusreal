'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AsyncButton } from '@/components/async-button';
import { Pagination, paginate } from '@/components/pagination';
import { TableToolbar } from '@/components/table-toolbar';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { api, fetcher, type SwrKey } from '@/lib/api';
import { matches } from '@/lib/utils';

type Ex = { id_exemplar: string; id_buku: string; sumber_peroleh: string; lokasi: string; status: string; judul?: string };

export default function EksemplarPage() {
  const { data: all = [], mutate } = useSWR<Ex[]>(['exemplars.list'] as SwrKey, fetcher);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const list = useMemo(() => all.filter((e) =>
    matches(q, [e.id_exemplar, e.judul, e.sumber_peroleh, e.lokasi, e.status]) &&
    (status === 'all' || e.status === status)
  ), [all, q, status]);
  const paged = paginate(list, page, pageSize);

  useEffect(() => { setPage(1); }, [q, status, pageSize]);

  const hapus = async (code: string) => {
    await api('exemplars.remove', { code });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eksemplar Buku</h1>
          <p className="text-sm text-muted-foreground">Tiap eksemplar punya ID unik / barcode yang dipakai saat transaksi</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/buku">Tambah di Data Buku</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Eksemplar</CardTitle>
          <Badge variant="secondary">{list.length} total</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableToolbar
            search={q}
            onSearch={setQ}
            placeholder="Cari barcode / judul / sumber / lokasi…"
            filters={[{ key: 'status', label: 'Status', options: [
              { value: 'available', label: 'Tersedia' },
              { value: 'dipinjam', label: 'Dipinjam' },
            ] }]}
            values={{ status }}
            onFilter={(_, v) => setStatus(v)}
            onReset={() => { setQ(''); setStatus('all'); }}
          />
          <Table>
            <TableHeader><TableRow>
              <TableHead>Barcode / ID</TableHead><TableHead>Buku</TableHead><TableHead>Sumber</TableHead>
              <TableHead>Lokasi</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paged.items.map((e) => (
                <TableRow key={e.id_exemplar}>
                  <TableCell className="barcode-text text-xs font-medium">{e.id_exemplar}</TableCell>
                  <TableCell className="text-sm">{e.judul || e.id_buku}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.sumber_peroleh || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.lokasi || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === 'available' ? 'default' : 'destructive'} className="capitalize">
                      {e.status === 'available' ? 'Tersedia' : 'Dipinjam'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {e.status === 'available' && (
                      <AsyncButton
                        variant="ghost"
                        size="sm"
                        action={() => hapus(e.id_exemplar)}
                        loadingText="…"
                        successText="Terhapus"
                        toast={{ loading: 'Menghapus eksemplar…', success: 'Eksemplar dihapus' }}
                        onSuccess={() => { mutate(); }}
                      >
                        Hapus
                      </AsyncButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!paged.items.length && (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Belum ada eksemplar yang cocok</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            page={paged.current} pages={paged.pages} total={paged.total} from={paged.from} to={paged.to}
            pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}
