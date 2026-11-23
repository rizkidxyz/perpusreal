'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';

export const ACCENT_PRESETS = [
  { name: 'Biru', hex: '#2563eb' },
  { name: 'Ungu', hex: '#7c3aed' },
  { name: 'Hijau', hex: '#059669' },
  { name: 'Kuning', hex: '#d97706' },
  { name: 'Merah', hex: '#e11d48' },
];

const STORAGE_KEY = 'perpus_accent';

type Ctx = { accent: string; setAccent: (hex: string) => void };
const AppearanceContext = createContext<Ctx>({ accent: '', setAccent: () => {} });
export const useAppearance = () => useContext(AppearanceContext);

/** Hex (#rrggbb) → HSL (h, s%, l%). */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => parseInt(v, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Menulis variabel warna ke <html>. Dipakai provider & script anti-flash. */
export function applyAccent(root: HTMLElement, hex: string, dark: boolean) {
  const vars: Record<string, string> = {
    '--primary': '221 83% 53%',
    '--primary-foreground': '210 40% 98%',
    '--ring': '221 83% 53%',
    '--accent': dark ? '217 33% 20%' : '214 95% 93%',
    '--accent-foreground': dark ? '210 40% 96%' : '222 47% 11%',
  };
  const hsl = hexToHsl(hex);
  if (hsl) {
    const { h, s, l } = hsl;
    vars['--primary'] = `${h} ${s}% ${l}%`;
    vars['--ring'] = `${h} ${s}% ${l}%`;
    vars['--primary-foreground'] = l > 62 ? '222 47% 11%' : '210 40% 98%';
    vars['--accent'] = dark ? `${h} ${Math.min(s, 70)}% 20%` : `${h} ${Math.min(s, 95)}% 94%`;
    vars['--accent-foreground'] = dark ? `${h} 80% 92%` : `${h} 60% 20%`;
  }
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

function AccentBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [accent, setAccentState] = useState('');

  useEffect(() => {
    try { setAccentState(localStorage.getItem(STORAGE_KEY) || ''); } catch { /* abaikan */ }
  }, []);

  useEffect(() => {
    applyAccent(document.documentElement, accent, resolvedTheme === 'dark');
  }, [accent, resolvedTheme]);

  const setAccent = useCallback((hex: string) => {
    setAccentState(hex);
    try {
      if (hex) localStorage.setItem(STORAGE_KEY, hex);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* abaikan */ }
  }, []);

  return <AppearanceContext.Provider value={{ accent, setAccent }}>{children}</AppearanceContext.Provider>;
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AccentBridge>{children}</AccentBridge>
    </ThemeProvider>
  );
}
