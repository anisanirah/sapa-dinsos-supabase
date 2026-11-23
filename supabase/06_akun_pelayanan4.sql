-- ======================================================================
-- FILE: supabase/06_akun_pelayanan4.sql
-- DESKRIPSI: Menambah 1 akun "Petugas Pelayanan 4" untuk komputer loket ke-4.
-- Dipakai untuk proyek yang SUDAH berjalan (akun lain tidak disentuh, kata sandinya tetap).
-- Untuk pemasangan baru, akun ini sudah ikut dibuat oleh 04_data_awal.sql.
--
-- !!! PENTING SEBELUM MENJALANKAN !!!
-- Ganti tulisan GANTI_KATA_SANDI_DI_SINI dengan kata sandi buatanmu sendiri
-- (min. 8 karakter, ada huruf besar, huruf kecil, angka).
-- Ketik langsung di SQL Editor Supabase. JANGAN kirim kata sandi ini ke chat siapa pun.
-- Catatan: di file SQL, komentar ditulis dengan "--" (setara "//" di JavaScript).
-- ======================================================================

do $$
declare
  -- >>> GANTI tulisan di antara tanda kutip ini dengan kata sandimu sendiri <<<
  kata_sandi text := 'GANTI_KATA_SANDI_DI_SINI';

  -- Data akun petugas loket ke-4
  v_email text := 'pelayanan4@dinsos.test';
  v_nama  text := 'Petugas Pelayanan 4';
  v_uid   uuid;
begin
  -- Tolak jika kata sandi belum diganti atau tidak memenuhi syarat
  if kata_sandi = 'GANTI_KATA_SANDI_DI_SINI' then
    raise exception 'Kata sandi belum diganti. Ganti tulisan GANTI_KATA_SANDI_DI_SINI terlebih dahulu.';
  end if;
  if length(kata_sandi) < 8 or kata_sandi !~ '[A-Z]' or kata_sandi !~ '[a-z]' or kata_sandi !~ '[0-9]' then
    raise exception 'Kata sandi harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, dan angka.';
  end if;

  -- Jika akun sudah pernah dibuat, jangan dibuat dua kali
  select id into v_uid from auth.users where email = v_email;
  if v_uid is not null then
    raise notice 'Akun % sudah ada. Tidak ada yang diubah.', v_email;
    return;
  end if;

  v_uid := gen_random_uuid();

  -- Buat akun login di Supabase Auth (email langsung dianggap terverifikasi)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_email, extensions.crypt(kata_sandi, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nama', v_nama),
    now(), now(), '', '', '', ''
  );

  -- Identitas login email (wajib ada agar bisa login dengan email + kata sandi)
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid, v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- Profil dibuat otomatis oleh trigger; di sini peran diatur menjadi petugas pelayanan
  insert into public.profiles (id, nama, role)
  values (v_uid, v_nama, 'petugas_pelayanan')
  on conflict (id) do update
    set nama = excluded.nama,
        role = excluded.role,
        is_active = true;

  raise notice 'Selesai: akun % siap dipakai.', v_email;
end;
$$;
