'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Pagination, paginate } from '@/components/pagination';
import { TableToolbar } from '@/components/table-toolbar';
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { fetcher, type SwrKey } from '@/lib/api';
import { activityLabel } from '@/lib/log-label';
import { matches, waktuLengkap } from '@/lib/utils';

type Log = { id: string; waktu: string; actor: string; action: string; detail: string };

export default function LogPage() {
  const { data: logs = [] } = useSWR<Log[]>(['logs.list', { limit: 200 }] as SwrKey, fetcher);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const actionOptions = useMemo(() =>
    Array.from(new Set(logs.map((l) => l.action).filter(Boolean)))
      .sort().map((v) => ({ value: v, label: activityLabel(v) })), [logs]);

  const list = useMemo(() => logs.filter((l) =>
    matches(q, [l.waktu, l.actor, l.action, activityLabel(l.action), l.detail]) &&
    (action === 'all' || l.action === action)
  ), [logs, q, action]);
  const paged = paginate(list, page, pageSize);

  useEffect(() => { setPage(1); }, [q, action, pageSize]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Log Aktivitas</h1><p className="text-sm text-muted-foreground">Riwayat 200 aktivitas terakhir</p></div>
      <Card>
        <CardHeader><CardTitle>Riwayat</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TableToolbar
            search={q}
            onSearch={setQ}
            placeholder="Cari petugas / aktivitas / detail…"
            filters={[{ key: 'action', label: 'Aksi', options: actionOptions }]}
            values={{ action }}
            onFilter={(_, v) => setAction(v)}
            onReset={() => { setQ(''); setAction('all'); }}
          />
          <Table>
            <TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Petugas</TableHead><TableHead>Aksi</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
            <TableBody>
              {paged.items.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{waktuLengkap(l.waktu)}</TableCell>
                  <TableCell className="text-sm font-medium">{l.actor || 'system'}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[11px]">{activityLabel(l.action)}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.detail}</TableCell>
                </TableRow>
              ))}
              {!paged.items.length && <TableRow><TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">Belum ada log yang cocok</TableCell></TableRow>}
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
