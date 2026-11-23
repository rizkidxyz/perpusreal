'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { api, fetcher, type SwrKey } from '@/lib/api';
import { AsyncButton } from './async-button';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea } from './ui';

type Ex = { id_exemplar: string };

/** Popup tambah eksemplar yang dipanggil dari baris Data Buku (id_buku sudah pasti). */
export function ExemplarAddDialog({
  book,
  open,
  onOpenChange,
  onSuccess,
}: {
  book: { id_buku: string; judul: string } | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSuccess?: () => void;
}) {
  const { data: all = [] } = useSWR<Ex[]>(open ? ['exemplars.list'] as SwrKey : null, fetcher);
  const [jumlah, setJumlah] = useState('1');
  const [sumber, setSumber] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [ids, setIds] = useState('');

  useEffect(() => {
    if (!open) return;
    setJumlah('1'); setSumber(''); setLokasi(''); setMode('auto'); setIds('');
  }, [open, book?.id_buku]);

  const year = new Date().getFullYear();
  const maxSeq = useMemo(() => Math.max(0, ...all.map((e) => {
    const m = e.id_exemplar.match(new RegExp(`^EXM-${year}-(\\d+)$`));
    return m ? Number(m[1]) : 0;
  })), [all, year]);

  const n = Math.max(1, Math.min(500, Number(jumlah) || 1));
  const preview = Array.from({ length: Math.min(5, n) }, (_, i) =>
    `EXM-${year}-${String(maxSeq + i + 1).padStart(4, '0')}`
  );

  const manualIds = ids.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const existing = useMemo(() => new Set(all.map((e) => e.id_exemplar)), [all]);
  const duplicate = [...new Set(manualIds.filter((x, i) => manualIds.indexOf(x) !== i || existing.has(x)))];

  const simpan = async () => {
    if (mode === 'manual' && duplicate.length) {
      throw new Error('ID duplikat: ' + duplicate.slice(0, 3).join(', '));
    }
    return api<{ ids: string[] }>('exemplars.add', {
      bookId: book?.id_buku,
      mode,
      jumlah: n,
      sumber_peroleh: sumber,
      lokasi,
      ids: manualIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Eksemplar</DialogTitle>
          <DialogDescription>
            Buku: <span className="font-medium text-foreground">{book?.judul || '-'}</span>
            {book?.id_buku ? ` · ${book.id_buku}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="ex-lokasi">Lokasi</Label><Input id="ex-lokasi" value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Rak A-1" /></div>
            <div className="space-y-2"><Label htmlFor="ex-sumber">Sumber Peroleh</Label><Input id="ex-sumber" value={sumber} onChange={(e) => setSumber(e.target.value)} placeholder="Pembelian / hibah / donasi" /></div>
          </div>

          <div className="space-y-2">
            <Label>Generate ID</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={mode === 'auto' ? 'default' : 'outline'} onClick={() => setMode('auto')}>Otomatis</Button>
              <Button type="button" variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')}>Manual</Button>
            </div>
          </div>

          {mode === 'auto' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ex-jumlah">Jumlah</Label>
                <Input id="ex-jumlah" inputMode="numeric" value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Preview ID:</p>
                {preview.map((p) => <p key={p} className="barcode-text text-xs">{p}</p>)}
                {n > 5 && <p className="text-xs text-muted-foreground">…dan {n - 5} lagi</p>}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ex-ids">ID unik (1 per baris)</Label>
              <Textarea id="ex-ids" value={ids} onChange={(e) => setIds(e.target.value)} placeholder={'EXM-CUSTOM-001\nEXM-CUSTOM-002'} className="barcode-text" />
              <p className="text-xs text-muted-foreground">
                {manualIds.length} ID terdeteksi · jumlah eksemplar mengikuti jumlah ID
              </p>
              {!!duplicate.length && (
                <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                  Duplikat: {duplicate.slice(0, 5).join(', ')}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <AsyncButton
              type="button"
              disabled={!book || (mode === 'manual' && (!manualIds.length || !!duplicate.length))}
              action={simpan}
              loadingText="Menyimpan…"
              successText="Tersimpan"
              toast={{
                loading: 'Menambahkan eksemplar…',
                success: (r: any) => `${r.ids.length} eksemplar berhasil ditambahkan`,
              }}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
            >
              Simpan Eksemplar
            </AsyncButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
