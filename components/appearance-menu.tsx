'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Check, Moon, Palette, RotateCcw, Sun } from 'lucide-react';
import { ACCENT_PRESETS, useAppearance } from './appearance-provider';
import { cn } from '@/lib/utils';

export function AppearanceMenu({ placement = 'above', variant = 'popover' }: { placement?: 'above' | 'below'; variant?: 'popover' | 'sheet' }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const { accent, setAccent } = useAppearance();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Tampilan"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        <Palette className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className={cn(
          variant === 'sheet'
            ? 'fixed inset-x-4 bottom-20 z-50 space-y-3 rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl'
            : cn('absolute right-0 z-50 w-64 space-y-3 rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl', placement === 'above' ? 'bottom-12' : 'top-12')
        )}>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tema</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTheme('light')}
                className={cn('flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition', !isDark ? 'border-primary bg-accent font-medium' : 'hover:bg-muted')}>
                <Sun className="h-4 w-4" /> Terang
              </button>
              <button type="button" onClick={() => setTheme('dark')}
                className={cn('flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition', isDark ? 'border-primary bg-accent font-medium' : 'hover:bg-muted')}>
                <Moon className="h-4 w-4" /> Gelap
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Warna aksen</p>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((p) => (
                <button key={p.hex} type="button" title={p.name} onClick={() => setAccent(p.hex)}
                  className={cn('flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 ring-offset-popover transition hover:scale-110',
                    accent.toLowerCase() === p.hex.toLowerCase() && 'ring-2 ring-primary')}
                  style={{ backgroundColor: p.hex }}>
                  {accent.toLowerCase() === p.hex.toLowerCase() && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
              <label className="relative flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border bg-background" title="Warna custom">
                <Palette className="h-3.5 w-3.5" />
                <input type="color" value={accent || '#2563eb'} onChange={(e) => setAccent(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </label>
              <button type="button" title="Kembalikan ke bawaan" onClick={() => setAccent('')}
                className="flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition hover:bg-muted">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
