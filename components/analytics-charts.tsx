'use client';

import { useTheme } from 'next-themes';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler, type ChartOptions,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useAppearance } from './appearance-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

export type Timeseries = {
  range: { from: string; to: string; days: number };
  labels: string[];
  dates: string[];
  pinjam: number[];
  kembali: number[];
  aktif: number[];
  kategori: { name: string; value: number }[];
  jamSibuk: { label: string; value: number }[];
  ringkasan: {
    pinjam: number; kembali: number; aktif: number;
    hariIniPinjam: number; hariIniKembali: number;
  };
};

const NAMA_KATEGORI: Record<string, string> = {
  siswa: 'Siswa', gukar: 'Gukar', guest: 'Guest', lain: 'Lain',
};
const PALETTE = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

function StatMini({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold leading-none tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Placeholder() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl bg-muted lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

export function AnalyticsCharts({ data }: { data?: Timeseries }) {
  const { resolvedTheme } = useTheme();
  const { accent } = useAppearance();
  const dark = resolvedTheme === 'dark';
  const primary = accent || '#2563eb';
  const text = dark ? 'rgb(203 213 225)' : 'rgb(71 85 105)';
  const grid = dark ? 'rgba(148,163,184,0.16)' : 'rgba(100,116,139,0.16)';
  const tooltip = {
    backgroundColor: dark ? '#0f172a' : '#ffffff',
    titleColor: text,
    bodyColor: text,
    borderColor: grid,
    borderWidth: 1,
  };

  if (!data) return <Placeholder />;

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: text, usePointStyle: true, boxWidth: 8, padding: 16 } },
      tooltip,
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: text, maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: grid }, ticks: { color: text } },
    },
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { color: text, usePointStyle: true, boxWidth: 10, padding: 12 } },
      tooltip,
    },
  };

  const lineData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Pinjam', data: data.pinjam,
        borderColor: primary, backgroundColor: `${primary}22`,
        pointBackgroundColor: primary, pointRadius: 3, tension: 0.35, fill: true,
      },
      {
        label: 'Kembali', data: data.kembali,
        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)',
        pointBackgroundColor: '#10b981', pointRadius: 3, tension: 0.35, fill: true,
      },
    ],
  };

  const adaKategori = data.kategori.length > 0;
  const cats = adaKategori ? data.kategori : [{ name: 'Belum ada transaksi', value: 1 }];
  const doughnutData = {
    labels: cats.map((c) => NAMA_KATEGORI[c.name] || c.name),
    datasets: [{
      data: cats.map((c) => c.value),
      backgroundColor: adaKategori ? cats.map((_, i) => PALETTE[i % PALETTE.length]) : [grid],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatMini label={`Pinjam ${data.range.days} hari`} value={data.ringkasan.pinjam}
          sub={`Hari ini ${data.ringkasan.hariIniPinjam}`} />
        <StatMini label={`Kembali ${data.range.days} hari`} value={data.ringkasan.kembali}
          sub={`Hari ini ${data.ringkasan.hariIniKembali}`} />
        <StatMini label="Sedang dipinjam" value={data.ringkasan.aktif} sub="Saat ini" />
        <StatMini label="Jam tersibuk" value={data.jamSibuk[0]?.label || '–'}
          sub={data.jamSibuk[0] ? `${data.jamSibuk[0].value} transaksi` : 'Belum ada data'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tren Peminjaman</CardTitle>
            <CardDescription>{data.range.from} s.d. {data.range.to} · ikut berubah saat ada transaksi baru</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <Line data={lineData} options={lineOptions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kategori Peminjam</CardTitle>
            <CardDescription>Berdasarkan transaksi pinjam pada periode ini</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </CardContent>
        </Card>
      </div>

      {data.jamSibuk.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Jam Paling Sibuk</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.jamSibuk.map((h) => (
              <div key={h.label} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
                <span className="font-semibold">{h.label}</span>
                <span className="text-muted-foreground">{h.value}x</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
