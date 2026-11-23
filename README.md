# SAPA DINSOS — Versi Online (Supabase + Vercel)

**Sistem Antrean Pelayanan Dinas Sosial Kabupaten Majalengka** — *Sapa, Daftar, Dilayani*

Ini adalah **salinan** aplikasi SAPA DINSOS versi Laravel dengan tampilan, alur, fitur, dan aturan yang sama.
Bedanya hanya di bagian belakang (backend):

| Bagian | Versi utama (laporan KP) | Versi online (folder ini) |
|---|---|---|
| Backend | Laravel 10 + Sanctum | Supabase (PostgreSQL + Supabase Auth) |
| Database | MySQL | PostgreSQL di cloud Supabase |
| Logika penting | Controller Laravel | Fungsi database (RPC) di `supabase/02_fungsi.sql` |
| Hak akses | Middleware `CekRole` | Row Level Security + pemeriksaan role di setiap fungsi |
| Email | Notifikasi Laravel + SMTP Gmail | Supabase Auth + custom SMTP Gmail |
| Hosting | Laragon (lokal) | Vercel (https, bisa dibuka dari HP di mana saja) |

Versi utama untuk laporan & sidang KP tetap versi **Laravel**.

## Isi folder

- `src/` — aplikasi React (disalin dari versi Laravel). File yang diganti untuk Supabase:
  - `src/lib/supabase.js` — koneksi ke Supabase
  - `src/lib/api.js` — penerjemah: alamat lama (`/antreans/my`, `/antreans/{id}/call`, ...) diteruskan ke fungsi Supabase, sehingga halaman-halaman tidak perlu diubah
  - `src/context/AuthContext.jsx` — login, daftar, keluar memakai Supabase Auth
  - `src/pages/Login.jsx`, `VerifikasiEmail.jsx`, `ResetPassword.jsx`, `Register.jsx` — penyesuaian kecil untuk alur email Supabase
- `supabase/` — file SQL yang dijalankan di **Supabase > SQL Editor**, berurutan:
  1. `01_skema.sql` — tabel `profiles`, `layanans`, `antreans`
  2. `02_fungsi.sql` — semua logika (nomor antrean, barcode, transisi status atomik, dll.)
  3. `03_keamanan.sql` — Row Level Security & hak akses
  4. `04_data_awal.sql` — 5 layanan + akun petugas (1 pendaftaran, 4 pelayanan) (**ganti kata sandi dulu di dalam file**)
  5. `05_rekap_layanan.sql` — kode/tag layanan, layanan DTSEN & PBI, fungsi `rekap_layanan` untuk halaman **Rekap Layanan**
  6. `06_akun_pelayanan4.sql` — *hanya untuk proyek lama*: menambah akun petugas pelayanan ke-4 (**ganti kata sandi dulu**)
  - `template-email/` — isi email verifikasi & atur ulang kata sandi (bahasa Indonesia)
- `vercel.json` — agar alamat seperti `/verifikasi-email` tidak "404" di Vercel
- `.env.example` — contoh pengaturan (salin menjadi `.env`)

## Aturan yang dijaga database (tidak bisa diakali dari browser)

- Status: `menunggu → terverifikasi → dipanggil → dilayani → selesai`, plus `dibatalkan` (tabel transisi sama dengan `Models/Antrean.php`).
- Perubahan status **atomik** (`UPDATE ... WHERE status = status_lama`): dua petugas tidak bisa mengambil antrean yang sama, barcode tidak bisa diverifikasi dua kali.
- Satu petugas pelayanan hanya memegang 1 antrean (dijaga juga oleh *unique index*).
- Nomor antrean `A001, A002, ...` per hari tanpa dobel (dikunci per tanggal), barcode `DNS-` + 24 karakter acak.
- Pengunjung wajib verifikasi email, maksimal 1 antrean aktif per hari; antrean hari sebelumnya ditutup otomatis.
- Akun nonaktif (`profiles.is_active = false`) diblokir di Supabase Auth dan ditolak semua fungsi.

## Menjalankan di laptop (opsional)

```bash
npm install
copy .env.example .env   # lalu isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev
```

## Batasan paket gratis (ringkas)

- **Supabase Free**: database 500 MB, 50.000 pengguna aktif/bulan, **project "tidur" setelah 1 minggu tidak dipakai** (data tidak hilang; bangunkan lewat dashboard Supabase > Restore project).
- **Email**: dengan SMTP sendiri, Supabase awalnya membatasi 30 email/jam (bisa dinaikkan di Authentication > Rate Limits). Gmail biasa juga punya batas harian (sekitar ratusan email/hari).
- **Vercel Hobby**: gratis, tetapi aturannya untuk penggunaan pribadi/non-komersial. Cocok untuk demo/KP; jika Dinsos ingin memakainya secara resmi jangka panjang, sebaiknya memakai akun/hosting milik instansi.
