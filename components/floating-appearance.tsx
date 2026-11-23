'use client';

import { usePathname } from 'next/navigation';
import { AppearanceMenu } from './appearance-menu';

/** Panel aksen melayang. Di halaman publik tombol tema sudah tersedia di navbar. */
export function FloatingAppearance() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return (
    <div className="no-print fixed bottom-4 right-4 z-40 lg:bottom-6 lg:right-6">
      <AppearanceMenu />
    </div>
  );
}
