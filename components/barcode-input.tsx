'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, ScanLine } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Input } from './ui';

export function BarcodeInput({
  onDetect,
  placeholder = 'Scan / ketik barcode lalu Enter…',
  autoFocus = true,
}: {
  onDetect: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState('');
  const [camOpen, setCamOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);

  const submit = (code: string) => {
    const c = code.trim();
    if (!c) return;
    onDetect(c);
    setValue('');
    inputRef.current?.focus();
  };

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  useEffect(() => {
    if (!camOpen || !videoRef.current) return;
    let alive = true;
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _err, controls) => {
      if (!alive) return;
      controlsRef.current = controls;
      if (result) {
        submit(result.getText());
        setCamOpen(false);
      }
    }).catch(() => undefined);
    return () => {
      alive = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOpen]);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(value); } }}
          placeholder={placeholder}
          className="pl-9 font-mono"
          autoComplete="off"
        />
      </div>
      <Dialog open={camOpen} onOpenChange={setCamOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" title="Scan dengan kamera"><Camera className="h-4 w-4" /></Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Scan barcode dengan kamera</DialogTitle></DialogHeader>
          <video ref={videoRef} className="w-full rounded-lg bg-black" muted playsInline />
          <p className="text-center text-xs text-muted-foreground">Arahkan kamera ke barcode buku</p>
        </DialogContent>
      </Dialog>
      <Button type="button" onClick={() => submit(value)}>Tambah</Button>
    </div>
  );
}
