import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const rupiah = (n: number | string) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID');

export const tgl = (v?: string) =>
  v ? new Date(v.replace(' ', 'T')).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const waktu = (v?: string) =>
  v ? new Date(v.replace(' ', 'T')).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

/** Waktu lengkap untuk log & trafik transaksi. */
export const waktuLengkap = (v?: string) =>
  v ? new Date(v.replace(' ', 'T')).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '-';

/** Cocokkan query dengan beberapa field (digunakan toolbar pencarian). */
export const matches = (query: string, fields: (string | number | null | undefined)[]) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return fields.some((v) => String(v ?? '').toLowerCase().includes(q));
};

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Kompres gambar di browser, file non-gambar langsung base64 (maks 3.5MB). */
export async function prepareFile(file: File): Promise<{ data: string; mime: string; name: string; public: boolean }> {
  if (!file.type.startsWith('image/')) {
    if (file.size > 3.5 * 1024 * 1024) throw new Error('File maksimal 3.5MB');
    return { data: await blobToBase64(file), mime: file.type || 'application/octet-stream', name: file.name, public: false };
  }
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.75));
  return {
    data: await blobToBase64(blob),
    mime: 'image/jpeg',
    name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
    public: true,
  };
}
