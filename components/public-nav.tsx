'use client';

import Link from 'next/link';
import { Home, LibraryBig, LogIn, Search } from 'lucide-react';
import { AppearanceMenu } from './appearance-menu';
import { Button } from './ui';
import { cn } from '@/lib/utils';

const ITEM = 'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition';

export function PublicNav() {
  const fokusCari = () => {
    const el = document.getElementById('katalog-search') as HTMLInputElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  };

  return (
    <>
      {/* Desktop */}
      <header className="no-print sticky top-0 z-40 hidden border-b bg-background/90 backdrop-blur sm:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <LibraryBig className="h-6 w-6 text-primary" />
            Perpus<span className="text-primary">Ku</span>
          </Link>
          <Button asChild variant="secondary" size="sm" className="ml-4">
            <Link href="/"><Home className="h-4 w-4" /> Home</Link>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fokusCari} title="Cari buku" aria-label="Cari buku">
              <Search className="h-5 w-5" />
            </Button>
            <AppearanceMenu placement="below" />
            <Button asChild variant="outline" size="sm">
              <Link href="/login"><LogIn className="h-4 w-4" /> Login Petugas</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile — mudah dijangkau jempol */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-4">
          <Link href="/" className={cn(ITEM, 'text-primary')}>
            <Home className="h-5 w-5" /><span>Home</span>
          </Link>
          <button type="button" onClick={fokusCari} className={cn(ITEM, 'text-muted-foreground')}>
            <Search className="h-5 w-5" /><span>Cari</span>
          </button>
          <div className={cn(ITEM, 'text-muted-foreground')}>
            <AppearanceMenu variant="sheet" /><span>Tema</span>
          </div>
          <Link href="/login" className={cn(ITEM, 'text-muted-foreground')}>
            <LogIn className="h-5 w-5" /><span>Login</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
