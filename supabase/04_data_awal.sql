-- ======================================================================
-- FILE: supabase/04_data_awal.sql
-- DESKRIPSI: Data awal (pengganti DatabaseSeeder Laravel):
--   1. 5 jenis layanan
--   2. Akun petugas: 1 petugas pendaftaran + 3 petugas pelayanan + 1 contoh pengunjung
-- Aman dijalankan berulang kali (data tidak dobel, data lain tidak dihapus).
--
-- !!! PENTING SEBELUM MENJALANKAN !!!
-- Versi Laravel memakai kata sandi "password123". Karena versi ini ONLINE (bisa dibuka
-- siapa saja), kata sandi itu TIDAK aman. Ganti tulisan GANTI_KATA_SANDI_DI_SINI di bawah
-- dengan kata sandi buatanmu sendiri (min. 8 karakter, ada huruf besar, huruf kecil, angka).
-- Ketik langsung di SQL Editor Supabase. JANGAN kirim kata sandi ini ke chat siapa pun.
-- Cara pakai: jalankan KEEMPAT (terakhir).
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. DATA LAYANAN (muncul di pilihan "Pilih Layanan")
-- ----------------------------------------------------------------------
insert into public.layanans (nama_layanan, deskripsi, persyaratan) values
  ('Bantuan Sosial Tunai',
   'Layanan bantuan sosial berupa uang tunai bagi masyarakat kurang mampu.',
   E'Fotokopi Kartu Tanda Penduduk (KTP)\nFotokopi Kartu Keluarga (KK)\nSurat Keterangan Tidak Mampu (SKTM) dari Desa/Kelurahan\nData pendukung lainnya sesuai ketentuan program'),
  ('Rehabilitasi Sosial',
   'Layanan pemulihan dan rehabilitasi bagi penyandang masalah kesejahteraan sosial.',
   E'Fotokopi KTP\nSurat rujukan dari Puskesmas/Rumah Sakit\nPas foto 3x4 sebanyak 2 lembar\nSurat keterangan dokter'),
  ('Perlindungan Sosial',
   'Layanan perlindungan bagi masyarakat yang rentan secara sosial.',
   E'Fotokopi KTP dan KK\nSurat keterangan dari desa/kelurahan\nDokumen pendukung lainnya'),
  ('Pemberdayaan Sosial',
   'Layanan pemberdayaan masyarakat melalui kegiatan sosial dan ekonomi.',
   E'Fotokopi KTP\nProposal kegiatan\nSurat keterangan domisili\nData peserta kegiatan'),
  -- Persyaratan di bawah masih CONTOH: sesuaikan dengan ketentuan resmi Dinsos.
  ('Aktivasi BPJS/KIS',
   'Layanan pengurusan aktivasi kepesertaan BPJS Kesehatan/KIS bagi masyarakat yang berhak.',
   E'Fotokopi Kartu Tanda Penduduk (KTP)\nFotokopi Kartu Keluarga (KK)\nFotokopi kartu BPJS Kesehatan/KIS (jika sudah memiliki)\nSurat Keterangan Tidak Mampu (SKTM) dari Desa/Kelurahan')
on conflict (nama_layanan) do update
  set deskripsi = excluded.deskripsi,
      persyaratan = excluded.persyaratan;

-- ----------------------------------------------------------------------
-- 2. AKUN PETUGAS & CONTOH PENGUNJUNG
-- ----------------------------------------------------------------------
do $$
declare
  -- >>> GANTI tulisan di antara tanda kutip ini dengan kata sandimu sendiri <<<
  kata_sandi text := 'GANTI_KATA_SANDI_DI_SINI';

  -- Daftar akun: nama, email, role, nomor HP (sama dengan seeder Laravel)
  akun record;
  v_uid uuid;
begin
  -- Tolak jika kata sandi belum diganti atau tidak memenuhi syarat
  if kata_sandi = 'GANTI_KATA_SANDI_DI_SINI' then
    raise exception 'Kata sandi belum diganti. Ganti tulisan GANTI_KATA_SANDI_DI_SINI terlebih dahulu.';
  end if;
  if length(kata_sandi) < 8 or kata_sandi !~ '[A-Z]' or kata_sandi !~ '[a-z]' or kata_sandi !~ '[0-9]' then
    raise exception 'Kata sandi harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, dan angka.';
  end if;

  for akun in
    select * from (values
      ('Petugas Pendaftaran', 'pendaftaran@dinsos.test', 'petugas_pendaftaran', null),
      ('Petugas Pelayanan 1', 'pelayanan1@dinsos.test',  'petugas_pelayanan',   null),
      ('Petugas Pelayanan 2', 'pelayanan2@dinsos.test',  'petugas_pelayanan',   null),
      ('Petugas Pelayanan 3', 'pelayanan3@dinsos.test',  'petugas_pelayanan',   null),
      -- Akun contoh pengunjung (nomor HP contoh untuk uji login dengan nomor HP)
      ('Ani Sanirah',         'ani@dinsos.test',         'pengunjung',          '081234567890')
    ) as t(nama, email, role, no_telp)
  loop
    select id into v_uid from auth.users where email = akun.email;

    if v_uid is null then
      v_uid := gen_random_uuid();

      -- Buat akun login di Supabase Auth (email langsung dianggap terverifikasi)
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
        akun.email, extensions.crypt(kata_sandi, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nama', akun.nama, 'no_telp', akun.no_telp),
        now(), now(), '', '', '', ''
      );

      -- Identitas login email (wajib ada agar bisa login dengan email + kata sandi)
      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_uid, v_uid::text,
        jsonb_build_object('sub', v_uid::text, 'email', akun.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    else
      -- Akun sudah ada: perbarui kata sandi & pastikan terverifikasi
      update auth.users
         set encrypted_password = extensions.crypt(kata_sandi, extensions.gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now())
       where id = v_uid;
    end if;

    -- Profil dibuat otomatis oleh trigger; di sini role & nama diatur sesuai daftar
    insert into public.profiles (id, nama, no_telp, role)
    values (v_uid, akun.nama, akun.no_telp, akun.role)
    on conflict (id) do update
      set nama = excluded.nama,
          no_telp = excluded.no_telp,
          role = excluded.role,
          is_active = true;
  end loop;

  raise notice 'Selesai: 5 layanan dan 5 akun siap dipakai.';
end;
$$;
