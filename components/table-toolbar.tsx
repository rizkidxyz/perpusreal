'use client';

import { RotateCcw, Search } from 'lucide-react';
import { Button, Input } from './ui';
import { cn } from '@/lib/utils';

export type ToolbarFilter = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export function TableToolbar({
  search,
  onSearch,
  placeholder = 'Cari…',
  filters = [],
  values = {},
  onFilter,
  onReset,
  extra,
  className,
  inputId,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  filters?: ToolbarFilter[];
  values?: Record<string, string>;
  onFilter?: (key: string, value: string) => void;
  onReset?: () => void;
  extra?: React.ReactNode;
  className?: string;
  inputId?: string;
}) {
  const active = Boolean(search.trim()) || Object.values(values).some((v) => v && v !== 'all');

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={inputId} className="pl-9" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} />
      </div>
      {filters.map((f) => (
        <select
          key={f.key}
          aria-label={f.label}
          value={values[f.key] || 'all'}
          onChange={(e) => onFilter?.(f.key, e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">{f.label}: Semua</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {extra}
      {active && onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} title="Reset pencarian & filter">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      )}
    </div>
  );
}
