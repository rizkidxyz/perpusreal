import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { getToken } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Perpus Realtime',
  description: 'Peminjaman & pengembalian buku paket siswa',
};

// Terapkan warna aksen sebelum paint supaya tidak berkedip.
// Ditempatkan sebagai child pertama Providers → berjalan setelah script next-themes.
const accentScript = `
(function () {
  try {
    var hex = localStorage.getItem('perpus_accent');
    if (!hex) return;
    var m = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
    if (!m) return;
    var rgb = [m[1], m[2], m[3]].map(function (v) { return parseInt(v, 16) / 255; });
    var max = Math.max.apply(null, rgb), min = Math.min.apply(null, rgb), d = max - min;
    var h = 0;
    if (d) {
      if (max === rgb[0]) h = ((rgb[1] - rgb[2]) / d) % 6;
      else if (max === rgb[1]) h = (rgb[2] - rgb[0]) / d + 2;
      else h = (rgb[0] - rgb[1]) / d + 4;
    }
    h = Math.round(h * 60); if (h < 0) h += 360;
    var l = (max + min) / 2;
    var s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    h = Math.round(h); s = Math.round(s * 100); l = Math.round(l * 100);
    var dark = document.documentElement.classList.contains('dark');
    var st = document.documentElement.style;
    st.setProperty('--primary', h + ' ' + s + '% ' + l + '%');
    st.setProperty('--ring', h + ' ' + s + '% ' + l + '%');
    st.setProperty('--primary-foreground', l > 62 ? '222 47% 11%' : '210 40% 98%');
    st.setProperty('--accent', dark ? h + ' ' + Math.min(s, 70) + '% 20%' : h + ' ' + Math.min(s, 95) + '% 94%');
    st.setProperty('--accent-foreground', dark ? h + ' 80% 92%' : h + ' 60% 20%');
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Providers token={token}>
          <script dangerouslySetInnerHTML={{ __html: accentScript }} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
