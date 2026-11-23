'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Layers3, ArrowUpRight, Undo2, Users, ScrollText,
  LogOut, Menu, X, LibraryBig, CircleDot,
} from 'lucide-react';
import { AsyncButton } from './async-button';
import { Button } from './ui';
import { cn } from '@/lib/utils';
import { logout, type User } from '@/lib/api';
import { UserContext } from './user-context';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/', label: 'Katalog Publik', icon: LibraryBig },
  { href: '/buku', label: 'Data Buku', icon: BookOpen },
  { href: '/eksemplar', label: 'Eksemplar', icon: Layers3 },
  { href: '/pinjam', label: 'Peminjaman', icon: ArrowUpRight },
  { href: '/kembali', label: 'Pengembalian', icon: Undo2 },
  { href: '/pengguna', label: 'Pengguna', icon: Users, admin: true },
  { href: '/log', label: 'Log Aktivitas', icon: ScrollText, admin: true },
];

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await logout();
  };

  const nav = NAV.filter((n) => !n.admin || user.role === 'admin');

  return (
    <UserContext.Provider value={user}>
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <LibraryBig className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">Perpus<span className="text-primary">Ku</span></span>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = path === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                <Icon className="h-[18px] w-[18px]" />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <CircleDot className="h-3.5 w-3.5 fill-green-500 text-green-500" /> Realtime aktif
          </div>
          <div className="mb-2 px-1">
            <p className="text-sm font-semibold leading-tight">{user.nama}</p>
            <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
          </div>
          <AsyncButton
            variant="outline"
            size="sm"
            className="w-full justify-start"
            action={doLogout}
            loadingText="Keluar…"
            successText="Sampai jumpa"
            toast={{ loading: 'Keluar…', success: 'Berhasil keluar' }}
            onSuccess={() => { setTimeout(() => window.location.assign('/login'), 250); }}
          >
            <LogOut className="h-4 w-4" /> Keluar
          </AsyncButton>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <span className="font-semibold">PerpusKu</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
    </UserContext.Provider>
  );
}
