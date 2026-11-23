'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from './ui';
import { cn } from '@/lib/utils';

const MIN = 0.5;
const MAX = 4;
const clamp = (z: number) => Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));

export function CoverImage({
  src,
  alt = 'Cover buku',
  className,
  imgClassName,
}: {
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const show = Boolean(src) && !failed;

  useEffect(() => { setFailed(false); }, [src]);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setPos({ x: 0, y: 0 });
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clamp(z + (e.deltaY < 0 ? 0.15 : -0.15)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open, src]);

  const reset = () => { setZoom(1); setPos({ x: 0, y: 0 }); };

  return (
    <>
      <button
        type="button"
        onClick={() => show && setOpen(true)}
        disabled={!show}
        title={show ? 'Klik untuk memperbesar' : 'Belum ada cover'}
        className={cn(
          'group relative shrink-0 overflow-hidden rounded border bg-muted transition',
          show ? 'cursor-zoom-in hover:ring-2 hover:ring-primary' : 'cursor-default',
          className || 'h-12 w-9'
        )}
      >
        {show ? (
          <img src={src} alt={alt} onError={() => setFailed(true)} className={cn('h-full w-full object-cover', imgClassName)} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground"><BookOpen className="h-4 w-4" /></span>
        )}
        {show && (
          <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex">
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pr-8 text-base">{alt}</DialogTitle>
          </DialogHeader>
          <div
            ref={areaRef}
            className="relative flex h-[60vh] items-center justify-center overflow-hidden rounded-lg bg-muted"
            onPointerDown={(e) => {
              if (zoom <= 1) return;
              drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              setPos({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y });
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
          >
            {show ? (
              <img
                src={src}
                alt={alt}
                draggable={false}
                onError={() => setFailed(true)}
                className={cn('max-h-full max-w-full select-none object-contain', zoom > 1 && 'cursor-grab active:cursor-grabbing')}
                style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})` }}
              />
            ) : (
              <span className="text-sm text-muted-foreground">Cover tidak tersedia</span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Scroll untuk zoom · geser untuk menggeser gambar</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setZoom((z) => clamp(z - 0.25))} title="Perkecil"><ZoomOut className="h-4 w-4" /></Button>
              <span className="w-14 text-center text-xs font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
              <Button variant="outline" size="icon" onClick={() => setZoom((z) => clamp(z + 0.25))} title="Perbesar"><ZoomIn className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={reset} title="Reset"><RotateCcw className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
