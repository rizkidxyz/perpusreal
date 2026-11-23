# PerpusKu — Peminjaman & Pengembalian Buku Realtime

Next.js + Tailwind/shadcn + Socket.IO + Google Apps Script (Spreadsheet + Drive).

## 1. Siapkan Google Spreadsheet & Drive

1. Buat Spreadsheet kosong, lalu **Extensions → Apps Script**.
2. Salin isi `apps-script/code.gs` ke `Code.gs`, dan `apps-script/appsscript.json` ke `appsscript.json`.
3. Di Apps Script: **Project Settings → Script Properties**, tambahkan:
   - `API_KEY` = secret bebas (sama dengan `API_SECRET` di `.env`)
4. Jika memakai Spreadsheet lain, isi `CONFIG.dbSsUrl` dengan URL-nya. Kosongkan jika spreadsheet yang dipakai adalah tempat script ini menempel.
5. Buat folder di Google Drive untuk media, masukkan link-nya ke `CONFIG.gdUrl`.
6. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Salin URL `/exec`-nya.

> Sheet (users, books, exemplars, loans, logs, settings) akan dibuat otomatis beserta header-nya saat pertama kali diakses.

> Daftar nama peminjam dibaca dari spreadsheet eksternal `CONFIG.sourceSsId` (`Sheet1`: nama di kolom A, kelas di kolom D; `Sheet3`: nama di kolom A). Spreadsheet itu **harus dibagikan sebagai Viewer** ke akun Google yang menjalankan Apps Script (*Execute as: Me*). Jika gagal diakses, form `/pinjam` otomatis beralih ke input manual dan tombol **Segarkan** bisa dipakai setelah izin diperbaiki.

## 2. Jalankan aplikasi

```bash
npm install
cp .env.example .env.local   # isi APPS_SCRIPT_URL, API_SECRET, JWT_SECRET
npm run dev                  # http://localhost:3000
```

Saat pertama kali buka `/login`, akan muncul form **Buat Admin Pertama**.

## 3. Deploy ke Vercel

1. Push ke GitHub, lalu **Import Project** di Vercel (framework terdeteksi otomatis sebagai Next.js).
2. **Settings → Environment Variables** — wajib isi, centang **Production, Preview, Development**:
   - `APPS_SCRIPT_URL` = URL Web app `/exec`
   - `API_SECRET` = **sama persis** dengan Script Properties `API_KEY` di Apps Script
   - `JWT_SECRET` = string acak minimal 32 karakter
3. **Deploy ulang setelah menambah env variable.** Env yang ditambahkan setelah build lama tidak otomatis terpakai.
4. `.env.local` tidak ikut ter-upload lewat Git integration — jangan mengandalkannya di Vercel.

> Vercel menjalankan Next.js sebagai serverless function, sehingga `server.js` (custom server + Socket.IO) **tidak dipakai**. Sinyal realtime lintas perangkat belum aktif di Vercel; data tetap ter-update di tab yang melakukan transaksi dan saat jendela kembali fokus. `socket:false` pada `/api/health` di Vercel adalah hal yang normal.

> Untuk mengecek environment setelah deploy: buka `/api/health?debug=1`. Respons hanya berisi status boolean (tanpa nilai rahasia): env ter-set atau tidak, cookie ada atau tidak, serta hasil verifikasi JWT.

## Catatan

- Socket.IO otomatis mengirim sinyal perubahan ke semua klien; data tetap dibaca ulang dari Spreadsheet agar selalu konsisten. **Tidak ada polling berkala.**
- Klien login masuk room `library` (sinyal lengkap). Pengunjung halaman utama `/` masuk room `public` tanpa token — payload-nya sengaja **tanpa nama petugas**.
- Rawan `/api/public` hanya mengizinkan `public.catalog` & `public.activity`. Yang dikirim ke publik hanya judul/penulis/cover/ketersediaan + **nama & kelas** peminjam (tanpa alamat, no. telp, petugas, atau ID).
- Cover publik lewat `/api/public/media/[id]` → action `public.cover` (Apps Script memastikan ID-nya benar-benar cover buku). Tidak bergantung hotlink Drive.
- Navbar publik: desktop di atas, mobile di bawah (Home · Cari · Tema · Login). Ikon Cari langsung fokus ke kolom pencarian katalog.
- Cover & bukti dikompres di browser sebelum disimpan ke Drive (batas aman payload Apps Script).
- Kamera barcode butuh HTTPS (Vercel sudah menyediakannya).
- Dashboard memuat statistik 7/30 hari lewat action `stats.timeseries` (Chart.js di-load dynamic, ringan saat awal buka).
- Pengembalian punya mode **Keranjang Cepat**: scan/pilih banyak buku (boleh beda peminjam), hapus dengan tombol X, lalu satu klik `loans.return` bulk.
- Struk tersedia di `/struk/pinjam/[group]` dan `/struk/kembali?kode=...&codes=...` — HTML printable, tombol **Cetak / Simpan PDF** memakai dialog browser.
- **Setelah memperbarui `apps-script/code.gs`, deploy ulang Web app** (Manage deployments → Edit → New version). URL `/exec`-nya tetap sama.

## Alur singkat

| Menu | Fungsi |
|---|---|
| Data Buku | CRUD buku + upload cover & bukti + tombol Tambah Eksemplar per buku (popup, ID otomatis/manual) |
| Eksemplar | Daftar semua eksemplar + pencarian + pagination + hapus |
| Peminjaman | Kategori siswa/gukar/guest, scan banyak barcode, struk printable |
| Pengembalian | By User atau Keranjang Cepat (bulk, kiri–kanan di desktop), struk printable |
| Dashboard | Statistik 7/30 hari + aktivitas realtime |
| Pengguna / Log | Khusus admin |
| Katalog Publik (`/`) | Tanpa login: kartu buku + pencarian + pagination + lalu lintas pinjam/kembali |
