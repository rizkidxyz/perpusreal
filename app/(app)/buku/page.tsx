'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { FileText, PackagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { AsyncButton } from '@/components/async-button';
import { CoverImage } from '@/components/cover-image';
import { ExemplarAddDialog } from '@/components/exemplar-add-dialog';
import { Pagination, paginate } from '@/components/pagination';
import { TableToolbar, type ToolbarFilter } from '@/components/table-toolbar';
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { api, fetcher, type SwrKey } from '@/lib/api';
import { matches, prepareFile, rupiah } from '@/lib/utils';

type Book = {
  id_buku: string; judul: string; penulis: string; penerbit: string; tahun_terbit: string | number;
  harga: number; cover_id: string; bukti_ids: string[] | string;
};

const EMPTY = { judul: '', penulis: '', penerbit: '', tahun_terbit: '', harga: '' };

export default function BukuPage() {
  const { data = [], mutate } = useSWR<Book[]>(['books.list'] as SwrKey, fetcher);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Record<string, string>>({ tahun: 'all', cover: 'all' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Book | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [buktiFiles, setBuktiFiles] = useState<File[]>([]);
  const [hapus, setHapus] = useState<Book | null>(null);
  const [exAdd, setExAdd] = useState<Book | null>(null);

  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const pilihCover = (file?: File) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file || null);
    setCoverPreview(file ? URL.createObjectURL(file) : '');
  };

  const tahunOptions = useMemo(() =>
    Array.from(new Set(data.map((b) => String(b.tahun_terbit || '').trim()).filter(Boolean)))
      .sort((a, b) => b.localeCompare(a))
      .map((v) => ({ value: v, label: v })), [data]);

  const filters: ToolbarFilter[] = useMemo(() => [
    { key: 'tahun', label: 'Tahun', options: tahunOptions },
    { key: 'cover', label: 'Cover', options: [
      { value: 'ada', label: 'Ada cover' },
      { value: 'kosong', label: 'Tanpa cover' },
    ] },
  ], [tahunOptions]);

  const list = useMemo(() => data.filter((b) =>
    matches(q, [b.id_buku, b.judul, b.penulis, b.penerbit]) &&
    (filter.tahun === 'all' || String(b.tahun_terbit || '') === filter.tahun) &&
    (filter.cover === 'all' || (filter.cover === 'ada' ? !!b.cover_id : !b.cover_id))
  ), [data, q, filter]);

  const paged = paginate(list, page, pageSize);

  useEffect(() => { setPage(1); }, [q, filter, pageSize]);

  const setF = (key: string, value: string) => setFilter((f) => ({ ...f, [key]: value }));
  const reset = () => { setQ(''); setFilter({ tahun: 'all', cover: 'all' }); };

  const bukaTambah = () => {
    setEdit(null); setForm(EMPTY); pilihCover(); setBuktiFiles([]); setOpen(true);
  };
  const bukaEdit = (b: Book) => {
    setEdit(b);
    setForm({ judul: b.judul, penulis: b.penulis, penerbit: b.penerbit, tahun_terbit: String(b.tahun_terbit || ''), harga: String(b.harga || '') });
    pilihCover(); setBuktiFiles([]); setOpen(true);
  };

  const simpan = async () => {
    let cover_id = edit?.cover_id || '';
    if (coverFile) {
      const up = await api<{ id: string }>('media.upload', { ...(await prepareFile(coverFile)), keterangan: 'Cover buku ' + form.judul });
      if (cover_id) await api('media.remove', { id: cover_id, keterangan: 'Cover lama buku ' + form.judul });
      cover_id = up.id;
    }
    let bukti_ids: string[] = edit?.bukti_ids ? (Array.isArray(edit.bukti_ids) ? edit.bukti_ids : [edit.bukti_ids]) : [];
    for (const file of buktiFiles) {
      const up = await api<{ id: string }>('media.upload', { ...(await prepareFile(file)), keterangan: 'Bukti buku ' + form.judul });
      bukti_ids.push(up.id);
    }
    const payload = {
      ...(edit ? { id_buku: edit.id_buku } : {}),
      judul: form.judul, penulis: form.penulis, penerbit: form.penerbit,
      tahun_terbit: form.tahun_terbit, harga: Number(form.harga || 0),
      cover_id, bukti_ids,
    };
    await api(edit ? 'books.update' : 'books.create', payload);
  };

  const hapusBuku = async () => {
    if (!hapus) return;
    await api('books.remove', { id_buku: hapus.id_buku });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Buku</h1>
          <p className="text-sm text-muted-foreground">Kelola judul, cover, dan bukti pendukung buku</p>
        </div>
        <Button onClick={bukaTambah}><Plus className="h-4 w-4" /> Tambah Buku</Button>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <TableToolbar
            className="mb-4"
            search={q}
            onSearch={setQ}
            placeholder="Cari judul / penulis / penerbit / ID…"
            filters={filters}
            values={filter}
            onFilter={setF}
            onReset={reset}
          />
          <Table>
            <TableHeader><TableRow>
              <TableHead>Cover</TableHead><TableHead>Judul</TableHead><TableHead>Penulis</TableHead>
              <TableHead>Penerbit</TableHead><TableHead>Thn</TableHead><TableHead>Harga</TableHead><TableHead>Bukti</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paged.items.map((b) => {
                const bukti = Array.isArray(b.bukti_ids) ? b.bukti_ids : [];
                return (
                  <TableRow key={b.id_buku}>
                    <TableCell>
                      <CoverImage src={b.cover_id ? `/api/media/${b.cover_id}` : undefined} alt={b.judul} className="h-12 w-9" />
                    </TableCell>
                    <TableCell className="font-medium">{b.judul}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.penulis || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.penerbit || '-'}</TableCell>
                    <TableCell className="text-sm">{b.tahun_terbit || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{rupiah(b.harga)}</TableCell>
                    <TableCell>
                      {bukti.length ? <Badge variant="secondary"><FileText className="mr-1 h-3 w-3" />{bukti.length}</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Tambah Eksemplar" onClick={() => setExAdd(b)}><PackagePlus className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => bukaEdit(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Hapus" onClick={() => setHapus(b)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!paged.items.length && <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Belum ada buku yang cocok</TableCell></TableRow>}
            </TableBody>
          </Table>
          <Pagination
            page={paged.current} pages={paged.pages} total={paged.total} from={paged.from} to={paged.to}
            pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit Buku' : 'Tambah Buku Baru'}</DialogTitle>
            <DialogDescription>Data master buku. Eksemplar ditambahkan terpisah.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="judul">Judul *</Label><Input id="judul" required value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="penulis">Penulis</Label><Input id="penulis" value={form.penulis} onChange={(e) => setForm({ ...form, penulis: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="penerbit">Penerbit</Label><Input id="penerbit" value={form.penerbit} onChange={(e) => setForm({ ...form, penerbit: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="thn">Tahun Terbit</Label><Input id="thn" inputMode="numeric" value={form.tahun_terbit} onChange={(e) => setForm({ ...form, tahun_terbit: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="harga">Harga</Label><Input id="harga" inputMode="numeric" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} placeholder="0" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cover">Cover (gambar)</Label>
                <div className="flex items-start gap-3">
                  <CoverImage
                    src={coverPreview || (edit?.cover_id ? `/api/media/${edit.cover_id}` : undefined)}
                    alt="Preview cover"
                    className="h-24 w-20"
                  />
                  <Input id="cover" type="file" accept="image/*" className="flex-1 pt-2" onChange={(e) => pilihCover(e.target.files?.[0])} />
                </div>
                <p className="text-[11px] text-muted-foreground">Klik preview untuk memperbesar</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bukti">Bukti Tambahan (bisa banyak)</Label>
                <Input id="bukti" type="file" multiple onChange={(e) => setBuktiFiles(Array.from(e.target.files || []))} />
                {!!edit?.bukti_ids && <p className="text-xs text-muted-foreground">{buktiFiles.length} file baru akan ditambahkan</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <AsyncButton
                type="button"
                action={simpan}
                loadingText="Menyimpan…"
                successText="Tersimpan"
                toast={{ loading: 'Menyimpan buku…', success: edit ? 'Buku diperbarui' : 'Buku ditambahkan' }}
                onSuccess={() => { setOpen(false); mutate(); }}
              >
                Simpan
              </AsyncButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!hapus} onOpenChange={(v) => !v && setHapus(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus buku?</DialogTitle><DialogDescription>“{hapus?.judul}” dan semua eksemplarnya akan dihapus. Pastikan tidak ada yang sedang dipinjam.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHapus(null)}>Batal</Button>
            <AsyncButton
              variant="destructive"
              action={hapusBuku}
              loadingText="Menghapus…"
              successText="Terhapus"
              toast={{ loading: 'Menghapus buku…', success: 'Buku dihapus' }}
              onSuccess={() => { setHapus(null); mutate(); }}
            >
              Ya, hapus
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExemplarAddDialog
        book={exAdd}
        open={!!exAdd}
        onOpenChange={(v) => !v && setExAdd(null)}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
