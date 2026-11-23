/** Label aktivitas Indonesian. Kode `action` tetap disimpan apa adanya di log. */
export const ACTION_LABEL: Record<string, string> = {
  'books.create': 'Menambah buku',
  'books.update': 'Memperbarui data buku',
  'books.remove': 'Menghapus buku',
  'exemplars.add': 'Menambah eksemplar',
  'exemplars.remove': 'Menghapus eksemplar',
  'loans.borrow': 'Meminjamkan buku',
  'loans.return': 'Menerima pengembalian buku',
  'users.create': 'Menambah pengguna',
  'users.update': 'Memperbarui pengguna',
  'users.remove': 'Menghapus pengguna',
  'media.upload': 'Mengunggah media',
  'media.remove': 'Menghapus media',
};

export function activityLabel(action: string) {
  return ACTION_LABEL[action] || action || '-';
}

export const KATEGORI_LABEL: Record<string, string> = {
  siswa: 'Siswa',
  gukar: 'Guru/Karyawan',
  guest: 'Tamu',
};

export function kategoriLabel(kategori: string) {
  return KATEGORI_LABEL[kategori] || kategori || '-';
}
