import type { ReactNode } from 'react';
import { toast } from 'sonner';

export const TOAST_DURATION = 2600;

export const notify = {
  success: (message: string) => toast.success(message, { duration: TOAST_DURATION }),
  error: (message: string) => toast.error(message, { duration: TOAST_DURATION + 1200 }),
  info: (message: string) => toast.info(message, { duration: TOAST_DURATION }),
};

export type ToastValue = ReactNode | ((arg: any) => ReactNode);
export type ToastMessages = {
  loading?: ToastValue;
  success?: ToastValue;
  error?: ToastValue;
};

export function messageOf(value: ToastValue | undefined, fallback: string, arg?: any): ReactNode {
  if (typeof value === 'function') return value(arg);
  return value ?? fallback;
}

export { toast };
