'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from './ui';
import { messageOf, toast, TOAST_DURATION, type ToastMessages } from '@/lib/toast';
import { cn } from '@/lib/utils';

type State = 'idle' | 'loading' | 'success';

export type AsyncButtonProps = Omit<ButtonProps, 'onClick'> & {
  /** Satu-satunya aksi async. Dipanggil maksimal sekali per klik. */
  action: () => Promise<any>;
  children: React.ReactNode;
  loadingText?: string;
  successText?: string | ((result: any) => string);
  successMs?: number;
  toast?: ToastMessages;
  /** Dipanggil setelah action berhasil — cocok untuk tutup dialog / mutate / redirect. */
  onSuccess?: (result: any) => void | Promise<void>;
};

export function AsyncButton({
  action,
  children,
  loadingText = 'Memproses…',
  successText = 'Berhasil',
  successMs = 1200,
  toast: messages,
  onSuccess,
  disabled,
  ...props
}: AsyncButtonProps) {
  const [state, setState] = useState<State>('idle');
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const run = useCallback(async () => {
    if (running.current || disabled) return;
    running.current = true;
    if (timer.current) clearTimeout(timer.current);
    setState('loading');

    const task = Promise.resolve().then(action);
    toast.promise(task, {
      loading: messageOf(messages?.loading, loadingText),
      success: (result) => messageOf(messages?.success, 'Berhasil', result),
      error: (error) => messageOf(messages?.error, error?.message || 'Gagal', error),
      duration: TOAST_DURATION,
    });

    try {
      const result = await task;
      setState('success');
      if (onSuccess) await onSuccess(result);
      timer.current = setTimeout(() => setState('idle'), successMs);
    } catch {
      // error sudah ditampilkan toast.promise
      setState('idle');
    } finally {
      running.current = false;
    }
  }, [action, disabled, loadingText, messages, onSuccess, successMs]);

  const busy = state !== 'idle';
  const blocked = disabled || busy;
  const label = state === 'loading' ? loadingText : state === 'success' ? messageOf(successText, 'Berhasil') : children;
  const hint = state === 'loading' ? loadingText : state === 'success' ? 'Selesai' : props.title;

  return (
    <Button
      {...props}
      disabled={blocked}
      aria-disabled={blocked}
      aria-busy={busy}
      title={hint}
      onClick={run}
    >
      {state === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
      {state === 'success' && <Check className="h-4 w-4" />}
      <span className={cn('inline-flex items-center gap-2', busy && '[&_svg]:hidden')}>{label}</span>
    </Button>
  );
}
