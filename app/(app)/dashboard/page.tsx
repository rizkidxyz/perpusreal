'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowUpRight, BarChart3, BookOpen, Layers3, Undo2, PackageCheck, Clock3, ArrowRight } from 'lucide-react';
import type { Timeseries } from '@/components/analytics-charts';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { fetcher, type SwrKey } from '@/lib/api';
import { activityLabel } from '@/lib/log-label';
import { waktuLengkap } from '@/lib/utils';

const AnalyticsCharts = dynamic(
  () => import('@/components/analytics-charts').then((m) => m.AnalyticsCharts),
  { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-xl bg-muted" /> }
);

type Stats = { books: number; exemplars: number; available: number; borrowed: number; activeLoans: number; today: number };
type LogRow = { id: string; waktu: string; actor: string; action: string; detail: string };

const CARDS = [
  { key: 'books', label: 'Judul Buku', icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
  { key: 'exemplars', label: 'Total Eksemplar', icon: Layers3, color: 'text-violet-600 bg-violet-50' },
  { key: 'borrowed', label: 'Sedang Dipinjam', icon: ArrowUpRight, color: 'text-amber-600 bg-amber-50' },
  { key: 'available', label: 'Tersedia', icon: PackageCheck, color: 'text-emerald-600 bg-emerald-50' },
] as const;

export default function DashboardPage() {
  const [days, setDays] = useState<7 | 30>(7);
  const { data: stats } = useSWR<Stats>(['dashboard.stats'] as SwrKey, fetcher);
  const { data: logs } = useSWR<LogRow[]>(['logs.list', { limit: 8 }] as SwrKey, fetcher);
  const { data: series } = useSWR<Timeseries>(['stats.timeseries', { days }] as SwrKey, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ringkasan kondisi perpustakaan hari ini</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/kembali"><Undo2 className="h-4 w-4" /> Kembalikan</Link></Button>
          <Button asChild><Link href="/pinjam"><ArrowUpRight className="h-4 w-4" /> Pinjam Buku</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${c.color}`}><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-2xl font-bold leading-none">{stats?.[c.key] ?? '–'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Statistik Realtime</CardTitle>
            <CardDescription>Tren pinjam & kembali, kategori peminjam, dan jam tersibuk</CardDescription>
          </div>
          <div className="flex gap-1 rounded-md border p-1">
            {([7, 30] as const).map((d) => (
              <Button key={d} size="sm" variant={days === d ? 'default' : 'ghost'} onClick={() => setDays(d)}>
                {d} hari
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent><AnalyticsCharts data={series} /></CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Petugas</TableHead><TableHead>Aktivitas</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs?.length ? logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{waktuLengkap(l.waktu)}</TableCell>
                    <TableCell className="text-sm font-medium">{l.actor || 'system'}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[11px]">{activityLabel(l.action)}</Badge></TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{l.detail}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Belum ada aktivitas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Aksi Cepat</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Link href="/pinjam" className="flex items-center justify-between rounded-lg border p-4 transition hover:border-primary hover:bg-accent">
              <div><p className="font-medium text-sm">Peminjaman</p><p className="text-xs text-muted-foreground">{stats?.today ?? 0} transaksi hari ini</p></div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/eksemplar" className="flex items-center justify-between rounded-lg border p-4 transition hover:border-primary hover:bg-accent">
              <div><p className="font-medium text-sm">Tambah Eksemplar</p><p className="text-xs text-muted-foreground">Generate ID otomatis / manual</p></div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <div className="rounded-lg bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
              Setiap perubahan data langsung tersebar ke semua perangkat yang terbuka <span className="font-semibold text-green-600">tanpa refresh</span>.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
