/**
 * PERPUS REALTIME — Backend (Google Apps Script)
 * Deploy: Extensions > Apps Script > Web app > Anyone > Deploy
 * Script Properties: API_KEY = (sama dengan API_SECRET di .env)
 */

const CONFIG = {
  dbSsUrl: '', // kosongkan jika spreadsheet ini yang menjalankan script
  gdUrl: 'https://drive.google.com/drive/folders/13fDbIL0UtWLcn1gRqNT7thw7BjSJl11T?usp=drive_link', // link folder Google Drive untuk cover & bukti
  sourceSsId: '1NgtZ8351oIh5WmOxtEdEoLxnMNNzocHQh23tpHb4HTc', // sumber nama siswa (Sheet1) & guru/karyawan (Sheet3) — harus di-share Viewer ke akun eksekusi script
  tableSheet: [
    { name: 'users',     columns: ['id', 'username', 'password_hash', 'salt', 'nama', 'role', 'aktif', 'created_at'] },
    { name: 'books',     columns: ['id_buku', 'judul', 'penulis', 'penerbit', 'tahun_terbit', 'harga', 'cover_id', 'bukti_ids', 'created_at', 'updated_at'] },
    { name: 'exemplars', columns: ['id_exemplar', 'id_buku', 'sumber_peroleh', 'lokasi', 'status', 'created_at'] },
    { name: 'loans',     columns: ['id_pinjam', 'group_id', 'id_exemplar', 'kategori', 'nama', 'kelas', 'alamat', 'no_telp', 'tgl_pinjam', 'tgl_kembali', 'tgl_kembali_aktual', 'status', 'petugas'] },
    { name: 'logs',      columns: ['id', 'waktu', 'actor', 'action', 'detail'] },
    { name: 'settings',  columns: ['key', 'value'] },
  ],
};

const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY') || 'ganti-dengan-secret-panjang';

/* ---------- helper inti ---------- */
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function db_() {
  return CONFIG.dbSsUrl ? SpreadsheetApp.openByUrl(CONFIG.dbSsUrl) : SpreadsheetApp.getActiveSpreadsheet();
}
function sh_(name) {
  const def = CONFIG.tableSheet.find((t) => t.name === name);
  if (!def) throw new Error('Tabel tidak dikenal: ' + name);
  const ss = db_();
  let s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  if (s.getLastRow() === 0) s.appendRow(def.columns);
  return s;
}
function rows_(name) {
  const vals = sh_(name).getDataRange().getValues();
  if (vals.length < 2) return [];
  const head = vals[0];
  return vals.slice(1)
    .filter((r) => r.some((v) => v !== '' && v !== null))
    .map((r) => {
      const o = {};
      head.forEach((h, i) => {
        let v = r[i];
        if (h === 'bukti_ids' && typeof v === 'string' && v.indexOf('[') === 0) {
          try { v = JSON.parse(v); } catch (e) { /* abaikan */ }
        }
        o[h] = v;
      });
      return o;
    });
}
function cell_(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
  return v;
}
function append_(name, obj) {
  const def = CONFIG.tableSheet.find((t) => t.name === name);
  sh_(name).appendRow(def.columns.map((c) => cell_(obj[c])));
}
function update_(name, keyCol, keyVal, obj) {
  const s = sh_(name);
  const vals = s.getDataRange().getValues();
  const head = vals[0];
  const ki = head.indexOf(keyCol);
  if (ki < 0) return false;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][ki]) === String(keyVal)) {
      Object.keys(obj).forEach((k) => {
        const c = head.indexOf(k);
        if (c >= 0) vals[i][c] = cell_(obj[k]);
      });
      s.getRange(1, 1, vals.length, head.length).setValues(vals);
      return true;
    }
  }
  return false;
}
function remove_(name, keyCol, keyVal) {
  const s = sh_(name);
  const vals = s.getDataRange().getValues();
  const ki = vals[0].indexOf(keyCol);
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][ki]) === String(keyVal)) {
      s.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
function lock_(fn) {
  const l = LockService.getScriptLock();
  l.waitLock(30000);
  try {
    return fn();
  } finally {
    l.releaseLock();
  }
}
function uid_(p) { return p + '-' + Utilities.getUuid().slice(0, 8).toUpperCase(); }
function now_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
}
function hash_(salt, pw) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pw, Utilities.Charset.UTF_8);
  return b.map((x) => ('0' + (x & 255).toString(16)).slice(-2)).join('');
}
function active_(v) { return v === true || v === 1 || ['true', '1', 'ya', 'aktif'].includes(String(v).toLowerCase()); }
function getSetting_(k, d) {
  const r = rows_('settings').find((x) => x.key === k);
  return r ? r.value : d;
}
function setSetting_(k, v) {
  if (!update_('settings', 'key', k, { value: v })) append_('settings', { key: k, value: v });
}
function log_(actor, action, detail) {
  append_('logs', { id: uid_('LOG'), waktu: now_(), actor: actor || 'system', action: action, detail: String(detail || '').slice(0, 500) });
}
function mediaFolder_() {
  const m = String(CONFIG.gdUrl).match(/[-\w]{25,}/);
  return m ? DriveApp.getFolderById(m[0]) : DriveApp.getRootFolder();
}
function trashMedia_(id) {
  if (!id) return;
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* abaikan */ }
}
function bookMap_() {
  const m = {};
  rows_('books').forEach((b) => (m[b.id_buku] = b.judul));
  return m;
}
function ringkasJudul_(titles) {
  const list = [];
  titles.forEach((t) => { if (t && list.indexOf(t) < 0) list.push(t); });
  const s = list.map((t) => '"' + t + '"').join(', ');
  return s.length > 180 ? s.slice(0, 177) + '…' : s;
}
function kategoriLog_(k) {
  return k === 'gukar' ? 'Guru/Karyawan' : k === 'guest' ? 'Tamu' : 'Siswa';
}
function pad2_(n) { return String(n).padStart(2, '0'); }
function dayKeyUTC_(d) {
  return d.getUTCFullYear() + '-' + pad2_(d.getUTCMonth() + 1) + '-' + pad2_(d.getUTCDate());
}
function parseDayUTC_(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}
function labelDay_(key) {
  const d = parseDayUTC_(key);
  if (!d) return String(key).slice(5);
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return d.getUTCDate() + ' ' + bulan[d.getUTCMonth()];
}
/** Kumpulan tanggal (yyyy-MM-dd) untuk rentang 7/30 hari atau from-to. Maksimal 90 hari. */
function rangeKeys_(from, to, fallbackDays) {
  let end = parseDayUTC_(to) || parseDayUTC_(now_()) || new Date();
  let start = parseDayUTC_(from);
  if (!start) {
    start = new Date(end.getTime());
    start.setUTCDate(start.getUTCDate() - (Math.max(1, Number(fallbackDays) || 7) - 1));
  }
  if (start.getTime() > end.getTime()) { const t = start; start = end; end = t; }
  const floor = new Date(end.getTime());
  floor.setUTCDate(floor.getUTCDate() - 89);
  if (start.getTime() < floor.getTime()) start = floor;
  const keys = [];
  for (let d = new Date(start.getTime()); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    keys.push(dayKeyUTC_(d));
  }
  return keys;
}
/** Susun data struk dari baris pinjaman (boleh beberapa grup sekaligus). */
function receiptFor_(list, nomor) {
  const books = bookMap_();
  const exBook = {};
  rows_('exemplars').forEach((e) => (exBook[e.id_exemplar] = e.id_buku));
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const first = list[0] || {};
  return {
    nomor: nomor || uniq(list.map((l) => l.group_id))[0] || '-',
    waktu_cetak: now_(),
    kategori: uniq(list.map((l) => l.kategori)).join(', '),
    nama: uniq(list.map((l) => l.nama)).join(', '),
    kelas: uniq(list.map((l) => l.kelas)).join(', '),
    alamat: uniq(list.map((l) => l.alamat)).join(', '),
    no_telp: uniq(list.map((l) => l.no_telp)).join(', '),
    petugas: uniq(list.map((l) => l.petugas)).join(', ') || first.petugas || '',
    items: list.map((l) => ({
      id_exemplar: l.id_exemplar || '',
      judul: books[exBook[l.id_exemplar]] || '',
      nama: l.nama || '',
      kelas: l.kelas || '',
      group_id: l.group_id || '',
      tgl_pinjam: l.tgl_pinjam || '',
      tgl_kembali: l.tgl_kembali || '',
      tgl_kembali_aktual: l.tgl_kembali_aktual || '',
      status: l.status || '',
    })),
  };
}

/* ---------- entry point ---------- */
function doGet() {
  return out_({ ok: true, data: { app: 'perpus-realtime', time: now_() } });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!API_KEY || body.apiKey !== API_KEY) return out_({ ok: false, error: 'Unauthorized' });
    const action = body.action;
    delete body.apiKey;
    delete body.action;
    const fn = ACTIONS[action];
    if (!fn) return out_({ ok: false, error: 'Action tidak dikenal: ' + action });
    return out_({ ok: true, data: fn(body || {}) });
  } catch (err) {
    return out_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

/* ---------- actions ---------- */
const ACTIONS = {
  'auth.count': () => ({ count: rows_('users').length }),

  'auth.bootstrap': (p) => {
    if (rows_('users').length) throw new Error('Admin sudah dibuat.');
    if (!p.username || !p.password) throw new Error('Username & password wajib.');
    const salt = Utilities.getUuid();
    const u = {
      id: uid_('USR'), username: String(p.username).trim(), password_hash: hash_(salt, p.password),
      salt: salt, nama: p.nama || 'Administrator', role: 'admin', aktif: true, created_at: now_(),
    };
    append_('users', u);
    return { id: u.id, username: u.username, nama: u.nama, role: u.role };
  },

  'auth.login': (p) => {
    const u = rows_('users').find((x) => x.username === String(p.username || '').trim());
    if (!u || !active_(u.aktif) || hash_(u.salt, p.password || '') !== u.password_hash) {
      throw new Error('Username atau password salah.');
    }
    return { id: u.id, username: u.username, nama: u.nama, role: u.role };
  },

  /** Daftar peminjam dari spreadsheet eksternal. Hanya nama & kelas, tanpa data sensitif. */
  'peminjam.options': (p) => {
    const cache = CacheService.getScriptCache();
    const key = 'peminjam_options_v1';
    if (p.refresh === true) cache.remove(key);
    else {
      const cached = cache.get(key);
      if (cached) return JSON.parse(cached);
    }

    const jenjang = ['X', 'XI', 'XII'];
    let kelasValid = [];
    jenjang.forEach((j) => { for (let i = 1; i <= 9; i++) kelasValid.push(j + ' ' + i); });
    const bersih = (v) => String(v === undefined || v === null ? '' : v).trim().replace(/\s+/g, ' ');

    let ss;
    try { ss = SpreadsheetApp.openById(CONFIG.sourceSsId); }
    catch (err) { throw new Error('Spreadsheet sumber tidak bisa diakses. Pastikan sudah dibagikan (Viewer) ke akun Google yang menjalankan Apps Script.'); }

    const siswaNames = [];
    const s1 = ss.getSheetByName('Sheet1');
    if (s1) {
      const vals = s1.getDataRange().getValues();
      for (let i = 1; i < vals.length; i++) {
        const nama = bersih(vals[i][0]);
        const kelas = bersih(vals[i][3]);
        if (!nama || kelasValid.indexOf(kelas) < 0) continue;
        siswaNames.push({ value: 'S' + (i + 1), label: nama, kelas: kelas, baris: i + 1 });
      }
    }

    const gukarNames = [];
    const s3 = ss.getSheetByName('Sheet3');
    if (s3) {
      const vals = s3.getDataRange().getValues();
      for (let i = 1; i < vals.length; i++) {
        const nama = bersih(vals[i][0]);
        if (!nama) continue;
        gukarNames.push({ value: 'G' + (i + 1), label: nama, baris: i + 1 });
      }
    }

    const dipakai = {};
    siswaNames.forEach((n) => (dipakai[n.kelas] = true));
    const data = {
      siswa: { kelas: kelasValid.filter((k) => dipakai[k]), names: siswaNames },
      gukar: { names: gukarNames },
    };
    const json = JSON.stringify(data);
    if (json.length < 90000) cache.put(key, json, 300);
    return data;
  },

  'books.list': () => rows_('books'),

  'books.create': (p) => {
    if (!p.judul) throw new Error('Judul wajib diisi.');
    const b = {
      id_buku: uid_('BK'), judul: p.judul, penulis: p.penulis || '', penerbit: p.penerbit || '',
      tahun_terbit: p.tahun_terbit || '', harga: p.harga || 0, cover_id: p.cover_id || '',
      bukti_ids: Array.isArray(p.bukti_ids) ? p.bukti_ids : [], created_at: now_(), updated_at: now_(),
    };
    lock_(() => append_('books', b));
    const tambahan = [b.penulis ? 'penulis ' + b.penulis : '', b.penerbit ? 'penerbit ' + b.penerbit : ''].filter(Boolean).join(', ');
    log_(p.actor, 'books.create', 'Menambah buku "' + b.judul + '" (' + b.id_buku + ')' + (tambahan ? ' · ' + tambahan : ''));
    return b;
  },

  'books.update': (p) => {
    const sebelum = rows_('books').find((x) => x.id_buku === p.id_buku) || {};
    const patch = { ...p };
    delete patch.id_buku; delete patch.actor;
    patch.updated_at = now_();
    lock_(() => update_('books', 'id_buku', p.id_buku, patch));
    const field = Object.keys(patch).filter((k) => k !== 'updated_at');
    log_(p.actor, 'books.update', 'Memperbarui buku "' + (p.judul || sebelum.judul || p.id_buku) + '" (' + p.id_buku + ')' + (field.length ? ' · ' + field.join(', ') : ''));
    return true;
  },

  'books.remove': (p) => {
    const active = rows_('loans').some((l) => l.status === 'dipinjam' && rows_('exemplars').some((e) => e.id_exemplar === l.id_exemplar && e.id_buku === p.id_buku));
    if (active) throw new Error('Masih ada eksemplar yang dipinjam.');
    const b = rows_('books').find((x) => x.id_buku === p.id_buku);
    const nEx = rows_('exemplars').filter((e) => e.id_buku === p.id_buku).length;
    lock_(() => {
      rows_('exemplars').filter((e) => e.id_buku === p.id_buku).forEach((e) => remove_('exemplars', 'id_exemplar', e.id_exemplar));
      remove_('books', 'id_buku', p.id_buku);
    });
    if (b) trashMedia_(b.cover_id);
    log_(p.actor, 'books.remove', 'Menghapus buku "' + (b ? b.judul : p.id_buku) + '" (' + p.id_buku + ')' + (nEx ? ' · ' + nEx + ' eksemplar' : ''));
    return true;
  },

  'exemplars.list': (p) => {
    const all = rows_('exemplars');
    return p.bookId ? all.filter((e) => e.id_buku === p.bookId) : all;
  },

  'exemplars.get': (p) => {
    const e = rows_('exemplars').find((x) => x.id_exemplar === String(p.code || '').trim());
    if (!e) throw new Error('Barcode tidak ditemukan.');
    return { ...e, judul: bookMap_()[e.id_buku] || '' };
  },

  // Dipanggil sekali saat membuka menu peminjaman. Field disaring supaya ringan.
  'catalog.borrowable': () => {
    const books = bookMap_();
    const ex = rows_('exemplars');
    const active = {};
    rows_('loans').filter((l) => l.status === 'dipinjam').forEach((l) => (active[l.id_exemplar] = l));
    const available = [];
    const borrowed = [];
    ex.forEach((e) => {
      const base = { code: e.id_exemplar, judul: books[e.id_buku] || '', lokasi: e.lokasi || '' };
      if (e.status === 'available') {
        available.push(base);
      } else {
        const l = active[e.id_exemplar];
        borrowed.push({ ...base, peminjam: l ? l.nama : '', kelas: l ? l.kelas : '' });
      }
    });
    return { available, borrowed, tooLarge: ex.length > 2000 };
  },

  // Verifikasi batch untuk barcode yang tidak ada di katalog / fallback >2000 eksemplar.
  'exemplars.checkMany': (p) => {
    const codes = (Array.isArray(p.codes) ? p.codes : String(p.codes || '').split(/\r?\n/))
      .map((c) => String(c).trim()).filter(Boolean).slice(0, 200);
    if (!codes.length) return {};
    const books = bookMap_();
    const ex = rows_('exemplars');
    const active = {};
    rows_('loans').filter((l) => l.status === 'dipinjam').forEach((l) => (active[l.id_exemplar] = l));
    const result = {};
    codes.forEach((code) => {
      const e = ex.find((x) => x.id_exemplar === code);
      if (!e) {
        result[code] = { found: false, status: 'missing', judul: '', lokasi: '', peminjam: '' };
        return;
      }
      const l = active[code];
      result[code] = {
        found: true,
        status: e.status,
        judul: books[e.id_buku] || '',
        lokasi: e.lokasi || '',
        peminjam: l ? l.nama : '',
      };
    });
    return result;
  },

  'exemplars.add': (p) => {
    if (!p.bookId) throw new Error('Pilih buku dulu.');
    if (!rows_('books').some((b) => b.id_buku === p.bookId)) throw new Error('Buku tidak ditemukan.');
    const judulBuku = (rows_('books').find((b) => b.id_buku === p.bookId) || {}).judul || p.bookId;

    let ids = [];
    if (p.mode === 'manual') {
      ids = (Array.isArray(p.ids) ? p.ids : String(p.ids || '').split(/\r?\n/))
        .map((s) => String(s).trim()).filter(Boolean);
      if (!ids.length) throw new Error('Minimal satu ID manual.');
    } else {
      const year = new Date().getFullYear();
      let seq = Number(getSetting_('EXM_SEQ_YEAR', '')) === year ? Number(getSetting_('EXM_SEQ', '0')) : 0;
      const n = Math.max(1, Number(p.jumlah || 1));
      for (let i = 0; i < n; i++) ids.push('EXM-' + year + '-' + String(seq + i + 1).padStart(4, '0'));
      setSetting_('EXM_SEQ_YEAR', year);
      setSetting_('EXM_SEQ', seq + n);
    }

    return lock_(() => {
      const existing = rows_('exemplars').map((e) => e.id_exemplar);
      const seen = new Set();
      ids.forEach((id) => {
        if (existing.includes(id) || seen.has(id)) throw new Error('ID duplikat: ' + id);
        seen.add(id);
      });
      ids.forEach((id) => append_('exemplars', {
        id_exemplar: id, id_buku: p.bookId, sumber_peroleh: p.sumber_peroleh || '',
        lokasi: p.lokasi || '', status: 'available', created_at: now_(),
      }));
      const kode = ids.length <= 3 ? ids.join(', ') : ids[0] + ' … ' + ids[ids.length - 1];
      log_(p.actor, 'exemplars.add', 'Menambah ' + ids.length + ' eksemplar buku "' + judulBuku + '" · ' + kode + (p.lokasi ? ' · ' + p.lokasi : ''));
      return { ids: ids };
    });
  },

  'exemplars.remove': (p) => {
    const e = rows_('exemplars').find((x) => x.id_exemplar === p.code);
    if (!e) throw new Error('Eksemplar tidak ditemukan.');
    if (e.status !== 'available') throw new Error('Eksemplar sedang dipinjam.');
    const judulBuku = (rows_('books').find((b) => b.id_buku === e.id_buku) || {}).judul || e.id_buku;
    remove_('exemplars', 'id_exemplar', p.code);
    log_(p.actor, 'exemplars.remove', 'Menghapus eksemplar ' + p.code + ' dari buku "' + judulBuku + '"');
    return true;
  },

  'loans.active': (p) => {
    const books = bookMap_();
    const exBook = {};
    rows_('exemplars').forEach((e) => (exBook[e.id_exemplar] = e.id_buku));
    const judulOf = (l) => books[exBook[l.id_exemplar]] || '';
    const from = String(p.from || '').slice(0, 10);
    const to = String(p.to || '').slice(0, 10);
    let list = rows_('loans').filter((l) => l.status === 'dipinjam');
    if (p.code) list = list.filter((l) => l.id_exemplar === String(p.code).trim());
    if (p.kategori) list = list.filter((l) => l.kategori === p.kategori);
    if (from) list = list.filter((l) => String(l.tgl_pinjam).slice(0, 10) >= from);
    if (to) list = list.filter((l) => String(l.tgl_pinjam).slice(0, 10) <= to);
    if (p.query) {
      const q = String(p.query).toLowerCase();
      list = list.filter((l) => [l.nama, l.kelas, l.id_exemplar, l.group_id, judulOf(l)]
        .some((v) => String(v).toLowerCase().includes(q)));
    }
    return list.map((l) => ({ ...l, judul: judulOf(l) }));
  },

  'loans.borrow': (p) => {
    const codes = (Array.isArray(p.codes) ? p.codes : []).map((c) => String(c).trim()).filter(Boolean);
    if (!codes.length) throw new Error('Scan minimal satu barcode.');
    return lock_(() => {
      const ex = rows_('exemplars');
      codes.forEach((code) => {
        const e = ex.find((x) => x.id_exemplar === code);
        if (!e) throw new Error('Barcode tidak ditemukan: ' + code);
        if (e.status !== 'available') throw new Error('Sedang dipinjam: ' + code);
      });
      const group = 'PIN-' + Date.now().toString(36).toUpperCase();
      const due = new Date(); due.setDate(due.getDate() + 7);
      const tglKembali = Utilities.formatDate(due, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
      const map = bookMap_();
      codes.forEach((code) => {
        const e = ex.find((x) => x.id_exemplar === code);
        append_('loans', {
          id_pinjam: uid_('PJM'), group_id: group, id_exemplar: code,
          kategori: p.kategori || 'siswa', nama: p.nama || '', kelas: p.kelas || '',
          alamat: p.alamat || '', no_telp: p.no_telp || '', tgl_pinjam: now_(), tgl_kembali: tglKembali,
          tgl_kembali_aktual: '', status: 'dipinjam', petugas: p.actor || '',
        });
        update_('exemplars', 'id_exemplar', code, { status: 'dipinjam' });
        e.judul = map[e.id_buku] || '';
      });
      const judul = ringkasJudul_(codes.map((c) => (ex.find((x) => x.id_exemplar === c) || {}).judul));
      const peminjam = String(p.nama || '').trim() || '-';
      const kelas = String(p.kelas || '').trim();
      log_(p.actor, 'loans.borrow', 'Meminjamkan ' + codes.length + ' buku ' + (judul || '(tanpa judul)') + ' kepada ' + peminjam + ' (' + kategoriLog_(p.kategori) + ')' + (kelas ? ' kelas ' + kelas : '') + ' · ' + group);
      return { group_id: group, items: codes.map((c) => ex.find((x) => x.id_exemplar === c)) };
    });
  },

  'loans.return': (p) => {
    const codes = (Array.isArray(p.codes) ? p.codes : []).map((c) => String(c).trim()).filter(Boolean);
    if (!codes.length) throw new Error('Pilih buku yang akan dikembalikan.');
    return lock_(() => {
      const active = rows_('loans').filter((l) => l.status === 'dipinjam');
      codes.forEach((code) => {
        if (!active.some((l) => l.id_exemplar === code)) throw new Error('Tidak ada pinjaman aktif: ' + code);
      });
      const exBook = {};
      rows_('exemplars').forEach((e) => (exBook[e.id_exemplar] = e.id_buku));
      const books = bookMap_();
      const info = codes.map((code) => {
        const l = active.find((x) => x.id_exemplar === code) || {};
        return { judul: books[exBook[code]] || '', nama: l.nama || '', kelas: l.kelas || '', kategori: l.kategori || '' };
      });
      codes.forEach((code) => {
        const l = active.find((x) => x.id_exemplar === code);
        update_('loans', 'id_pinjam', l.id_pinjam, { status: 'dikembalikan', tgl_kembali_aktual: now_() });
        update_('exemplars', 'id_exemplar', code, { status: 'available' });
      });
      const rtn = 'RTN-' + Date.now().toString(36).toUpperCase();
      const nama = Array.from(new Set(info.map((i) => i.nama).filter(Boolean))).join(', ') || '-';
      const kelas = Array.from(new Set(info.map((i) => i.kelas).filter(Boolean))).join(', ');
      log_(p.actor, 'loans.return', 'Menerima pengembalian ' + codes.length + ' buku ' + (ringkasJudul_(info.map((i) => i.judul)) || '(tanpa judul)') + ' dari ' + nama + ' (' + kategoriLog_(info[0] && info[0].kategori) + ')' + (kelas ? ' kelas ' + kelas : '') + ' · ' + rtn);
      return { kode: rtn, returned: codes.length, codes: codes };
    });
  },

  /** Struk bisa dibuka ulang lewat /struk/pinjam/[group]. */
  'receipt.pinjam': (p) => {
    const group = String(p.group || '').trim();
    if (!group) throw new Error('Kode pinjam wajib.');
    const list = rows_('loans').filter((l) => l.group_id === group);
    if (!list.length) throw new Error('Transaksi pinjam tidak ditemukan.');
    return receiptFor_(list, group);
  },

  /** Struk bisa dibuka ulang lewat /struk/kembali?codes=... */
  'receipt.kembali': (p) => {
    const codes = (Array.isArray(p.codes) ? p.codes : String(p.codes || '').split(','))
      .map((c) => String(c).trim()).filter(Boolean);
    if (!codes.length) throw new Error('Kode pengembalian wajib.');
    const list = rows_('loans').filter((l) => codes.indexOf(String(l.id_exemplar)) >= 0);
    if (!list.length) throw new Error('Transaksi kembali tidak ditemukan.');
    return receiptFor_(list, p.kode || codes[0]);
  },

  'media.upload': (p) => {
    if (!p.data) throw new Error('File kosong.');
    const bytes = Utilities.base64Decode(p.data);
    const blob = Utilities.newBlob(bytes, p.mime || 'application/octet-stream', p.name || 'file');
    const file = mediaFolder_().createFile(blob).setName(p.name || 'file');
    if (p.public) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    log_(p.actor, 'media.upload', 'Mengunggah media "' + (p.name || 'file') + '"' + (p.keterangan ? ' · ' + p.keterangan : ''));
    return { id: file.getId(), url: 'https://drive.google.com/uc?export=view&id=' + file.getId() };
  },

  'media.get': (p) => {
    const f = DriveApp.getFileById(p.id);
    const blob = f.getBlob();
    return {
      name: f.getName(), mime: blob.getContentType(),
      data: Utilities.base64Encode(blob.getBytes()),
    };
  },

  /** Cover untuk pengunjung: hanya ID yang benar-benar terpasang sebagai cover buku. */
  'public.cover': (p) => {
    const id = String(p.id || '').trim();
    if (!id || !rows_('books').some((b) => b.cover_id === id)) throw new Error('Cover tidak ditemukan.');
    const blob = DriveApp.getFileById(id).getBlob();
    return { mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
  },

  'media.remove': (p) => {
    trashMedia_(p.id);
    log_(p.actor, 'media.remove', 'Menghapus media' + (p.keterangan ? ' · ' + p.keterangan : '') + ' (' + p.id + ')');
    return true;
  },

  /** Agregasi pinjam/kembali per hari untuk grafik dashboard. */
  'stats.timeseries': (p) => {
    const keys = rangeKeys_(p.from, p.to, p.days || 7);
    const idx = {};
    keys.forEach((k, i) => (idx[k] = i));

    const pinjam = keys.map(() => 0);
    const kembali = keys.map(() => 0);
    const eventByDay = {};
    const categories = {};
    const hours = {};
    const loans = rows_('loans');

    loans.forEach((l) => {
      const bDay = String(l.tgl_pinjam || '').slice(0, 10);
      const rDay = String(l.tgl_kembali_aktual || '').slice(0, 10);

      if (idx[bDay] !== undefined) {
        pinjam[idx[bDay]]++;
        const cat = String(l.kategori || 'lain').toLowerCase();
        categories[cat] = (categories[cat] || 0) + 1;
        const hh = String(l.tgl_pinjam || '').slice(11, 13);
        if (/^\d{2}$/.test(hh)) hours[hh] = (hours[hh] || 0) + 1;
      }
      if (idx[rDay] !== undefined) kembali[idx[rDay]]++;

      if (bDay) eventByDay[bDay] = (eventByDay[bDay] || 0) + 1;
      if (rDay) eventByDay[rDay] = (eventByDay[rDay] || 0) - 1;
    });

    const aktifAkhirHari = [];
    let running = 0;
    keys.forEach((k) => {
      running += eventByDay[k] || 0;
      aktifAkhirHari.push(running);
    });

    const today = now_().slice(0, 10);
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    return {
      range: { from: keys[0], to: keys[keys.length - 1], days: keys.length },
      labels: keys.map(labelDay_),
      dates: keys,
      pinjam: pinjam,
      kembali: kembali,
      aktif: aktifAkhirHari,
      kategori: Object.keys(categories)
        .map((k) => ({ name: k, value: categories[k] }))
        .sort((a, b) => b.value - a.value),
      jamSibuk: Object.keys(hours)
        .map((h) => ({ label: h + ':00', value: hours[h] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      ringkasan: {
        pinjam: sum(pinjam),
        kembali: sum(kembali),
        aktif: loans.filter((l) => l.status === 'dipinjam').length,
        hariIniPinjam: loans.filter((l) => String(l.tgl_pinjam).slice(0, 10) === today).length,
        hariIniKembali: loans.filter((l) => String(l.tgl_kembali_aktual).slice(0, 10) === today).length,
      },
    };
  },

  /** Halaman publik: katalog tanpa data sensitif. */
  'public.catalog': () => {
    const total = {};
    const tersedia = {};
    rows_('exemplars').forEach((e) => {
      total[e.id_buku] = (total[e.id_buku] || 0) + 1;
      if (e.status === 'available') tersedia[e.id_buku] = (tersedia[e.id_buku] || 0) + 1;
    });
    return rows_('books')
      .filter((b) => total[b.id_buku] > 0)
      .map((b) => ({
        id_buku: b.id_buku,
        judul: b.judul || '',
        penulis: b.penulis || '',
        penerbit: b.penerbit || '',
        tahun_terbit: b.tahun_terbit || '',
        cover_url: b.cover_id ? '/api/public/media/' + encodeURIComponent(b.cover_id) : '',
        total: total[b.id_buku] || 0,
        tersedia: tersedia[b.id_buku] || 0,
      }))
      .sort((a, b) => String(a.judul).localeCompare(String(b.judul)));
  },

  /** Halaman publik: lalu lintas terbaru. Hanya nama + kelas, tanpa kontak/petugas/ID. */
  'public.activity': (p) => {
    const limit = Math.min(50, Math.max(1, Number(p.limit || 20)));
    const books = bookMap_();
    const exBook = {};
    rows_('exemplars').forEach((e) => (exBook[e.id_exemplar] = e.id_buku));
    return rows_('loans')
      .slice()
      .sort((a, b) => String(b.tgl_pinjam || '').localeCompare(String(a.tgl_pinjam || '')))
      .slice(0, limit)
      .map((l) => ({
        judul: books[exBook[l.id_exemplar]] || '',
        nama: l.nama || '',
        kelas: l.kelas || '',
        kategori: l.kategori || '',
        status: l.status || '',
        tgl_pinjam: l.tgl_pinjam || '',
        tgl_kembali: l.tgl_kembali || '',
        tgl_kembali_aktual: l.tgl_kembali_aktual || '',
      }));
  },

  'dashboard.stats': () => {
    const ex = rows_('exemplars');
    const loans = rows_('loans');
    const today = now_().slice(0, 10);
    return {
      books: rows_('books').length,
      exemplars: ex.length,
      available: ex.filter((e) => e.status === 'available').length,
      borrowed: ex.filter((e) => e.status === 'dipinjam').length,
      activeLoans: loans.filter((l) => l.status === 'dipinjam').length,
      today: loans.filter((l) => String(l.tgl_pinjam).slice(0, 10) === today).length,
    };
  },

  'users.list': () => rows_('users').map((u) => ({ id: u.id, username: u.username, nama: u.nama, role: u.role, aktif: active_(u.aktif), created_at: u.created_at })),

  'users.create': (p) => {
    if (!p.username || !p.password) throw new Error('Username & password wajib.');
    if (rows_('users').some((u) => u.username === p.username)) throw new Error('Username sudah dipakai.');
    const salt = Utilities.getUuid();
    const u = {
      id: uid_('USR'), username: p.username, password_hash: hash_(salt, p.password), salt: salt,
      nama: p.nama || p.username, role: p.role === 'admin' ? 'admin' : 'petugas', aktif: true, created_at: now_(),
    };
    lock_(() => append_('users', u));
    log_(p.actor, 'users.create', 'Menambah pengguna ' + u.username + ' (' + u.nama + ', ' + (u.role === 'admin' ? 'Admin' : 'Petugas') + ')');
    return { id: u.id, username: u.username, nama: u.nama, role: u.role };
  },

  'users.update': (p) => {
    const u = rows_('users').find((x) => x.id === p.id) || {};
    const patch = {};
    if (p.nama) patch.nama = p.nama;
    if (p.role) patch.role = p.role;
    if (p.aktif !== undefined) patch.aktif = !!p.aktif;
    if (p.password) {
      const salt = Utilities.getUuid();
      patch.salt = salt;
      patch.password_hash = hash_(salt, p.password);
    }
    lock_(() => update_('users', 'id', p.id, patch));
    const role = p.role || u.role;
    log_(p.actor, 'users.update', 'Memperbarui pengguna ' + (u.username || p.id) + ' (' + (p.nama || u.nama || '-') + ', ' + (role === 'admin' ? 'Admin' : 'Petugas') + ')');
    return true;
  },

  'users.remove': (p) => {
    if (p.id === p.selfId) throw new Error('Tidak bisa menghapus akun sendiri.');
    const u = rows_('users').find((x) => x.id === p.id) || {};
    remove_('users', 'id', p.id);
    log_(p.actor, 'users.remove', 'Menghapus pengguna ' + (u.username || p.id) + ' (' + (u.nama || '-') + ')');
    return true;
  },

  'logs.list': (p) => rows_('logs').reverse().slice(0, Number(p.limit || 50)),
};
