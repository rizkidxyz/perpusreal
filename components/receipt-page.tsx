'use client';

import useSWR from 'swr';
import { ArrowLeft, LibraryBig, Printer } from 'lucide-react';
import { Badge, Button, Card } from './ui';
import { fetcher, type SwrKey } from '@/lib/api';
import { tgl, waktu } from '@/lib/utils';

type Item = {
  id_exemplar: string; judul: string; nama: string; kelas: string; group_id: string;
  tgl_pinjam: string; tgl_kembali: string; tgl_kembali_aktual: string; status: string;
};
type Receipt = {
  nomor: string; waktu_cetak: string; kategori: string; nama: string; kelas: string;
  alamat: string; no_telp: string; petugas: string; items: Item[];
};

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || '-'}</p>
    </div>
  );
}

export function ReceiptPage({ type, group, codes = [], kode }: {
  type: 'pinjam' | 'kembali';
  group?: string;
  codes?: string[];
  kode?: string;
}) {
  const key: SwrKey | null = type === 'pinjam'
    ? (group ? ['receipt.pinjam', { group }] : null)
    : (codes.length ? ['receipt.kembali', { codes, kode }] : null);
  const { data, isLoading, error } = useSWR<Receipt>(key, fetcher);
  const isPinjam = type === 'pinjam';

  return (
    <div className="min-h-screen bg-muted/40 py-6 sm:py-10">
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between gap-2 px-4">
        <Button variant="ghost" onClick={() => window.history.back()}><ArrowLeft className="h-4 w-4" /> Kembali</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak / Simpan PDF</Button>
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <Card className="print-area p-6 sm:p-10">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LibraryBig className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">PerpusKu</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Peminjaman & Pengembalian Buku Realtime</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">No. Transaksi</p>
              <p className="font-mono text-sm font-semibold">{data?.nomor || '-'}</p>
            </div>
          </header>

          {isLoading && <p className="py-16 text-center text-sm text-muted-foreground">Memuat struk…</p>}
          {error && <p className="py-16 text-center text-sm text-destructive">{error.message}</p>}

          {data && (
            <>
              <div className="my-7 text-center">
                <h1 className="text-xl font-bold tracking-wide">
                  STRUK {isPinjam ? 'PEMINJAMAN' : 'PENGEMBALIAN'} BUKU
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">Dicetak: {waktu(data.waktu_cetak)}</p>
              </div>

              <div className="grid gap-x-8 gap-y-4 rounded-lg border p-4 sm:grid-cols-2">
                <Field label="Nama Peminjam" value={data.nama} />
                <Field label="Kelas" value={data.kelas} />
                <Field label="Kategori" value={data.kategori} />
                <Field label="Petugas" value={data.petugas} />
                <Field label="Alamat" value={data.alamat} />
                <Field label="No. Telp" value={data.no_telp} />
              </div>

              <div className="mt-6">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-y text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-2">No</th>
                      <th className="py-2 pr-2">Barcode</th>
                      <th className="py-2 pr-2">Judul Buku</th>
                      <th className="py-2 pr-2">Peminjam</th>
                      <th className="py-2 text-right">{isPinjam ? 'Jatuh Tempo' : 'Dikembalikan'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((it, i) => (
                      <tr key={`${it.id_exemplar}-${i}`} className="border-b align-top">
                        <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                        <td className="barcode-text py-2 pr-2 text-xs font-medium">{it.id_exemplar}</td>
                        <td className="py-2 pr-2 font-medium">{it.judul || '-'}</td>
                        <td className="py-2 pr-2 text-xs">
                          {it.nama || '-'}{it.kelas ? ` · ${it.kelas}` : ''}
                        </td>
                        <td className="py-2 text-right text-xs text-muted-foreground">
                          {isPinjam ? tgl(it.tgl_kembali) : (it.tgl_kembali_aktual ? waktu(it.tgl_kembali_aktual) : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total buku</span>
                  <Badge variant="secondary">{data.items.length} eksemplar</Badge>
                </div>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-10 text-center text-xs">
                <div>
                  <div className="border-t pt-2 font-medium">Petugas</div>
                  <p className="mt-2 text-muted-foreground">{data.petugas || '________________'}</p>
                </div>
                <div>
                  <div className="border-t pt-2 font-medium">Peminjam</div>
                  <p className="mt-2 text-muted-foreground">{data.nama || '________________'}</p>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
