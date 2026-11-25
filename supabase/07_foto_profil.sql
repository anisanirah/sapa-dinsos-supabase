-- ======================================================================
-- FILE: supabase/07_foto_profil.sql
-- DESKRIPSI: Fitur FOTO PROFIL untuk semua akun (petugas & pengunjung).
--   1. Kolom foto_path di tabel profiles (lokasi file foto di Storage)
--   2. Tempat penyimpanan (bucket) "foto-profil" di Supabase Storage
--   3. Aturan keamanan: setiap akun hanya boleh mengunggah/menghapus
--      foto di foldernya sendiri (nama folder = id akun)
--   4. Fungsi simpan_foto_profil(): mencatat / menghapus foto di profil
--   5. data_saya() diperbarui agar ikut mengirim foto_path
-- Catatan: di file SQL, komentar ditulis dengan "--" (setara "//" di JavaScript).
-- Cara pakai: jalankan KETUJUH, setelah 06_akun_pelayanan4.sql.
-- Aman dijalankan berulang kali.
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. KOLOM FOTO DI TABEL PROFILES
-- ----------------------------------------------------------------------
-- Isi contoh: "6f1c...-...-.../1764123456789.jpg" (folder = id akun).
-- Kosong (NULL) = belum punya foto, tampilan memakai huruf depan nama.
alter table public.profiles add column if not exists foto_path text;

-- ----------------------------------------------------------------------
-- 2. BUCKET PENYIMPANAN "foto-profil"
-- public = true  -> foto bisa ditampilkan lewat alamat (URL) tanpa login,
--                   nama file berisi angka acak sehingga sulit ditebak.
-- Batas ukuran 2 MB dan hanya file gambar JPG/PNG/WEBP.
-- ----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto-profil', 'foto-profil', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------
-- 3. ATURAN KEAMANAN (Row Level Security) UNTUK FILE FOTO
-- (storage.foldername(name))[1] = nama folder pertama dari lokasi file.
-- Folder harus sama dengan id akun yang sedang login (auth.uid()).
-- ----------------------------------------------------------------------
-- Melihat daftar file milik sendiri (dibutuhkan saat menghapus foto lama)
drop policy if exists "foto profil: lihat milik sendiri" on storage.objects;
create policy "foto profil: lihat milik sendiri"
  on storage.objects for select to authenticated
  using (bucket_id = 'foto-profil' and (storage.foldername(name))[1] = auth.uid()::text);

-- Mengunggah foto baru hanya ke folder sendiri
drop policy if exists "foto profil: unggah ke folder sendiri" on storage.objects;
create policy "foto profil: unggah ke folder sendiri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'foto-profil' and (storage.foldername(name))[1] = auth.uid()::text);

-- Mengganti file di folder sendiri
drop policy if exists "foto profil: ubah milik sendiri" on storage.objects;
create policy "foto profil: ubah milik sendiri"
  on storage.objects for update to authenticated
  using (bucket_id = 'foto-profil' and (storage.foldername(name))[1] = auth.uid()::text);

-- Menghapus foto milik sendiri
drop policy if exists "foto profil: hapus milik sendiri" on storage.objects;
create policy "foto profil: hapus milik sendiri"
  on storage.objects for delete to authenticated
  using (bucket_id = 'foto-profil' and (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------------
-- 4. FUNGSI simpan_foto_profil
-- p_path berisi lokasi file baru, atau NULL / '' untuk menghapus foto.
-- Mengembalikan foto_path lama (agar tampilan bisa menghapus file lamanya).
-- ----------------------------------------------------------------------
create or replace function public.simpan_foto_profil(p_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := public._peran();          -- wajib login & akun aktif
  v_path text := nullif(btrim(coalesce(p_path, '')), '');
  v_lama text;
begin
  -- Lokasi file harus berada di folder milik akun ini (tidak boleh memakai foto orang lain)
  if v_path is not null and v_path not like v_uid::text || '/%' then
    perform public._galat('Lokasi foto tidak valid.', 'foto_tidak_valid');
  end if;

  -- Simpan lokasi lama sebelum diganti
  select foto_path into v_lama from public.profiles where id = v_uid;

  -- Catat lokasi foto baru (atau kosongkan jika dihapus)
  update public.profiles set foto_path = v_path where id = v_uid;

  return jsonb_build_object(
    'message', case when v_path is null then 'Foto profil dihapus.' else 'Foto profil diperbarui.' end,
    'foto_path', v_path,
    'foto_lama', v_lama
  );
end;
$$;

-- Hanya pengguna yang sudah login boleh memanggil fungsi ini
revoke all on function public.simpan_foto_profil(text) from public, anon;
grant execute on function public.simpan_foto_profil(text) to authenticated;

-- ----------------------------------------------------------------------
-- 5. data_saya() DIPERBARUI: ikut mengirim foto_path
-- Isi sama dengan versi di 02_fungsi.sql, hanya ditambah 'foto_path'.
-- ----------------------------------------------------------------------
create or replace function public.data_saya()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._peran();
  v     jsonb;
begin
  select jsonb_build_object(
           'id', u.id,
           'name', p.nama,
           'email', u.email,
           -- NULL = email belum diverifikasi
           'email_verified_at', u.email_confirmed_at,
           'is_active', p.is_active,
           'profile', jsonb_build_object(
             'user_id', p.id, 'nama', p.nama, 'alamat', p.alamat,
             'no_telp', p.no_telp, 'role', p.role,
             -- Lokasi foto profil di bucket "foto-profil" (NULL = belum ada foto)
             'foto_path', p.foto_path))
    into v
    from auth.users u
    join public.profiles p on p.id = u.id
   where u.id = v_uid;
  return v;
end;
$$;

-- Pemberitahuan di tab "Results" setelah file ini dijalankan
do $$ begin raise notice 'Fitur foto profil siap: bucket foto-profil + fungsi simpan_foto_profil.'; end $$;
