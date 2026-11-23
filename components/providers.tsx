'use client';

import { useEffect } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { io } from 'socket.io-client';
import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import { fetcher } from '@/lib/api';
import { AppearanceProvider } from './appearance-provider';
import { FloatingAppearance } from './floating-appearance';

function SocketBridge({ token }: { token: string }) {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      auth: token ? { token } : { public: true },
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 5000,
    });
    // Untuk pengunjung publik, hanya SWR publik yang aktif — aman.
    const revalidate = () => mutate(() => true);
    socket.on('library:changed', revalidate);
    socket.on('connect', revalidate);
    return () => { socket.disconnect(); };
  }, [token, mutate]);

  return null;
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={(resolvedTheme as 'light' | 'dark') || 'system'} richColors closeButton position="top-right" />;
}

export function Providers({ children, token = '' }: { children: React.ReactNode; token?: string }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: true, dedupingInterval: 800 }}>
      <AppearanceProvider>
        <SocketBridge token={token} />
        {children}
        {/* Tema & aksen: di navbar publik, melayang di halaman lain. */}
        <FloatingAppearance />
        <ThemedToaster />
      </AppearanceProvider>
    </SWRConfig>
  );
}
