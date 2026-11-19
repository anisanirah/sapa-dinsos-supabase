-- ======================================================================
-- FILE: supabase/03_keamanan.sql
-- DESKRIPSI: Pengamanan data dengan Row Level Security (RLS) dan hak akses.
-- Prinsip: aplikasi (browser) TIDAK boleh membaca/mengubah tabel antreans secara langsung.
-- Semua lewat fungsi di 02_fungsi.sql yang sudah memeriksa login, role, dan status.
--   - layanans  : boleh DIBACA pengguna yang sudah login
--   - profiles  : pengguna hanya boleh MEMBACA profilnya sendiri (ubah lewat perbarui_profil)
--   - antreans  : TERTUTUP total (hanya lewat fungsi)
--   - login_gagal : TERTUTUP total
-- Cara pakai: jalankan KETIGA, setelah 02_fungsi.sql.
-- ======================================================================

-- 1. Nyalakan RLS di semua tabel (tanpa aturan = tidak ada yang boleh akses)
alter table public.profiles    enable row level security;
alter table public.layanans    enable row level security;
alter table public.antreans    enable row level security;
alter table public.login_gagal enable row level security;

-- 2. Cabut semua hak bawaan untuk pengguna tamu (anon) & pengguna login (authenticated)
revoke all on public.profiles, public.layanans, public.antreans, public.login_gagal from anon, authenticated;

-- 3. LAYANANS: pengguna login boleh melihat daftar layanan (tambah/ubah lewat SQL/dashboard)
grant select on public.layanans to authenticated;
drop policy if exists "layanan dibaca pengguna login" on public.layanans;
create policy "layanan dibaca pengguna login"
  on public.layanans for select
  to authenticated
  using (true);

-- 4. PROFILES: hanya boleh membaca baris milik sendiri
grant select on public.profiles to authenticated;
drop policy if exists "profil milik sendiri" on public.profiles;
create policy "profil milik sendiri"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- 5. FUNGSI: cabut hak jalankan dari semua orang, lalu berikan satu per satu
revoke execute on all functions in schema public from public, anon, authenticated;

-- 5a. Boleh dipanggil TANPA login (halaman Login & Daftar Akun)
grant execute on function public.email_untuk_login(text, text) to anon, authenticated;
grant execute on function public.hp_sudah_dipakai(text)        to anon, authenticated;

-- 5b. Hanya untuk pengguna yang sudah login (role diperiksa di dalam fungsi)
grant execute on function public.data_saya()                          to authenticated;
grant execute on function public.perbarui_profil(text, text, text)    to authenticated;
grant execute on function public.cek_password_lama(text)              to authenticated;
grant execute on function public.antrean_saya()                       to authenticated;
grant execute on function public.ambil_antrean_online(jsonb)          to authenticated;
grant execute on function public.batal_saya(bigint)                   to authenticated;
grant execute on function public.daftar_langsung(jsonb)               to authenticated;
grant execute on function public.verifikasi_barcode(text)             to authenticated;
grant execute on function public.batal_petugas(bigint, text)          to authenticated;
grant execute on function public.pelayanan_daftar()                   to authenticated;
grant execute on function public.pelayanan_saya()                     to authenticated;
grant execute on function public.ambil_antrean(bigint)                to authenticated;
grant execute on function public.mulai_layani(bigint)                 to authenticated;
grant execute on function public.selesai_layani(bigint)               to authenticated;
grant execute on function public.tidak_hadir(bigint)                  to authenticated;
grant execute on function public.antrean_hari_ini()                   to authenticated;
grant execute on function public.statistik_dashboard()                to authenticated;
grant execute on function public.detail_antrean(bigint)               to authenticated;

-- 6. Fungsi baru yang dibuat nanti TIDAK otomatis boleh dijalankan siapa pun
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
