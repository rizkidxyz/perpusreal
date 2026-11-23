'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './ui';
import { cn } from '@/lib/utils';

export const PAGE_SIZES = [10, 25, 50, 100];

/** Potong array & hitung meta halaman. Dipakai bersama tabel client-side. */
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const from = total ? (current - 1) * pageSize + 1 : 0;
  const to = Math.min(current * pageSize, total);
  return { items: items.slice(from - 1, to), total, pages, current, from, to };
}

export function Pagination({
  page, pages, total, from, to, pageSize,
  onPage, onPageSize,
}: {
  page: number; pages: number; total: number; from: number; to: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
      <p className="text-xs text-muted-foreground">
        Menampilkan <span className="font-semibold text-foreground">{from}–{to}</span> dari{' '}
        <span className="font-semibold text-foreground">{total}</span> data
      </p>
      <div className="flex items-center gap-2">
        <select
          aria-label="Jumlah per halaman"
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
        >
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / hal</option>)}
        </select>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          Hal <span className="font-semibold text-foreground">{page}</span>/{pages}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPage(1)} title="Halaman pertama"><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPage(page - 1)} title="Sebelumnya"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => onPage(page + 1)} title="Berikutnya"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => onPage(pages)} title="Halaman terakhir"><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

/** Versi ringkas untuk ruang sempit. */
export function PaginationCompact({ page, pages, onPage, className }: { page: number; pages: number; onPage: (p: number) => void; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
      <span className="text-xs text-muted-foreground">{page}/{pages}</span>
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );
}
