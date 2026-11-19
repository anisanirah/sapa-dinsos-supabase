-- ======================================================================
-- FILE: supabase/02_fungsi.sql
-- DESKRIPSI: Semua LOGIKA PENTING SAPA DINSOS dalam bentuk fungsi database (RPC).
-- Pengganti controller Laravel:
--   AuthController        -> data_saya, perbarui_profil, cek_password_lama,
--                            email_untuk_login, hp_sudah_dipakai (+ Supabase Auth)
--   PendaftaranController -> antrean_saya, ambil_antrean_online, daftar_langsung,
--                            verifikasi_barcode, batal_saya, batal_petugas
--   PelayananController   -> pelayanan_daftar, pelayanan_saya, ambil_antrean,
--                            mulai_layani, selesai_layani, tidak_hadir,
--                            antrean_hari_ini, statistik_dashboard, detail_antrean
--   Middleware CekRole    -> _peran()
-- Semua perubahan status ditulis ATOMIK: "UPDATE ... WHERE status = <status lama>",
-- jadi dua petugas tidak bisa mengambil antrean yang sama dan barcode tidak bisa
-- diverifikasi dua kali.
-- "security definer" = fungsi berjalan dengan hak pemilik database, sehingga
-- pengguna TIDAK perlu (dan TIDAK diberi) akses langsung ke tabel antreans.
-- Cara pakai: jalankan KEDUA, setelah 01_skema.sql.
-- ======================================================================


-- ======================================================================
-- BAGIAN A. FUNGSI BANTU (nama diawali "_", tidak bisa dipanggil dari aplikasi)
-- ======================================================================

-- Tanggal "hari ini" menurut jam WIB (server Supabase memakai jam UTC)
create or replace function public._hari_ini()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- Melempar pesan error yang rapi ke aplikasi.
--   p_pesan : pesan berbahasa Indonesia untuk ditampilkan
--   p_kode  : kode singkat (misal 'tidak_ditemukan'), sama dengan 'kode' di Laravel
--   p_kolom : (opsional) daftar error per kolom, format [["kolom","pesan"], ...]
create or replace function public._galat(p_pesan text, p_kode text default null, p_kolom jsonb default null)
returns void
language plpgsql
as $$
begin
  raise exception using
    message = p_pesan,
    hint    = coalesce(p_kode, ''),
    detail  = coalesce(p_kolom::text, '');
end;
$$;

-- Pengganti middleware CekRole: memastikan pengguna sudah login, akunnya aktif,
-- dan role-nya termasuk yang diizinkan. Mengembalikan id pengguna yang login.
-- p_roles kosong = semua role boleh.
create or replace function public._peran(p_roles text[] default '{}')
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_role  text;
  v_aktif boolean;
begin
  -- Belum login / sesi habis
  if v_uid is null then
    perform public._galat('Sesi login Anda sudah berakhir. Silakan login kembali.', 'tidak_login');
  end if;

  -- Ambil role & status aktif dari tabel profiles
  select role, is_active into v_role, v_aktif from public.profiles where id = v_uid;

  -- Akun dinonaktifkan administrator
  if v_aktif is false then
    perform public._galat('Akun dinonaktifkan. Silakan hubungi administrator.', 'akun_nonaktif');
  end if;

  -- Role kosong atau tidak termasuk yang diizinkan
  if v_role is null or (cardinality(p_roles) > 0 and not (v_role = any (p_roles))) then
    perform public._galat('Anda tidak memiliki akses untuk tindakan ini.', 'tidak_berhak');
  end if;

  return v_uid;
end;
$$;

-- Pengganti App\Support\NomorHp::normalisasi
-- "+62 812-3456-7890" -> "081234567890". Mengembalikan NULL jika format tidak valid.
create or replace function public._normalisasi_hp(p_nomor text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_nomor is null then
    return null;
  end if;
  -- Buang spasi, tanda hubung, titik, dan tanda kurung
  v := regexp_replace(p_nomor, '[[:space:]().-]', '', 'g');
  -- Ubah awalan +62 atau 62 menjadi 0
  if left(v, 3) = '+62' then
    v := '0' || substr(v, 4);
  elsif left(v, 2) = '62' then
    v := '0' || substr(v, 3);
  end if;
  -- Valid: diawali 08, digit ke-3 bukan 0, total 10 sampai 13 digit
  if v ~ '^08[1-9][0-9]{7,10}$' then
    return v;
  end if;
  return null;
end;
$$;

-- Daftar 26 kecamatan di Kabupaten Majalengka + pilihan luar daerah
-- (HARUS sama dengan KECAMATAN di src/lib/antrean.js dan Models/Antrean.php)
create or replace function public._daftar_kecamatan()
returns text[]
language sql
immutable
as $$
  select array[
    'Argapura', 'Banjaran', 'Bantarujeg', 'Cigasong', 'Cikijing', 'Cingambul',
    'Dawuan', 'Jatitujuh', 'Jatiwangi', 'Kadipaten', 'Kasokandel', 'Kertajati',
    'Lemahsugih', 'Leuwimunding', 'Ligung', 'Maja', 'Majalengka', 'Malausma',
    'Palasah', 'Panyingkiran', 'Rajagaluh', 'Sindang', 'Sindangwangi', 'Sukahaji',
    'Sumberjaya', 'Talaga',
    'Luar Kabupaten Majalengka'
  ]::text[];
$$;

-- Pengganti Antrean::TRANSISI_STATUS + bisaBerubahKe():
-- mengecek apakah status boleh berpindah dari p_dari ke p_ke (persis sesuai flowchart).
create or replace function public._boleh_pindah(p_dari text, p_ke text)
returns boolean
language sql
immutable
as $$
  select case p_dari
    -- Setelah barcode di-scan -> terverifikasi. Boleh dibatalkan.
    when 'menunggu'      then p_ke in ('terverifikasi', 'dibatalkan')
    -- Petugas pelayanan klik "Ambil" -> dipanggil. Boleh dibatalkan petugas pendaftaran.
    when 'terverifikasi' then p_ke in ('dipanggil', 'dibatalkan')
    -- "Mulai Layani" -> dilayani, atau "Tidak Hadir" -> dibatalkan
    when 'dipanggil'     then p_ke in ('dilayani', 'dibatalkan')
    -- "Selesai" -> selesai
    when 'dilayani'      then p_ke in ('selesai')
    -- selesai & dibatalkan = status akhir, tidak bisa berubah lagi
    else false
  end;
$$;

-- Pengganti Antrean::tutupAntreanLama():
-- menutup antrean HARI SEBELUMNYA yang belum sempat diproses. Dipanggil otomatis.
create or replace function public._tutup_antrean_lama()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jumlah integer;
begin
  update public.antreans
     set status           = 'dibatalkan',
         waktu_dibatalkan = now(),
         alasan_batal     = 'Kedaluwarsa: tidak diproses pada hari antrean.'
   where tanggal < public._hari_ini()
     and status in ('menunggu', 'terverifikasi', 'dipanggil');
  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$$;

-- Membuat isi barcode acak: "DNS-" + 24 huruf besar/angka (sama seperti Str::random(24))
create or replace function public._kode_barcode_baru()
returns text
language plpgsql
volatile
as $$
declare
  v_huruf constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_acak  bytea := extensions.gen_random_bytes(24);
  v_hasil text := 'DNS-';
  i       integer;
begin
  for i in 0..23 loop
    v_hasil := v_hasil || substr(v_huruf, (get_byte(v_acak, i) % 36) + 1, 1);
  end loop;
  return v_hasil;
end;
$$;

-- Mengubah satu baris antrean menjadi JSON dengan bentuk yang SAMA seperti jawaban Laravel
-- (ada layanan, nama_tampil, user.profile, dilayani_oleh.name). Kode barcode
-- hanya ikut jika p_barcode = true (barcode bersifat rahasia).
create or replace function public._antrean_json(a public.antreans, p_barcode boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select (case when p_barcode then to_jsonb(a) else to_jsonb(a) - 'kode_barcode' end) - 'dilayani_oleh'
    || jsonb_build_object(
      -- Data layanan (nama_layanan, persyaratan, ...)
      'layanan', (select to_jsonb(l) from public.layanans l where l.id = a.layanan_id),
      -- Nama yang tampil: nama di buku tamu, lalu nama di profil akun
      'nama_tampil', coalesce(a.nama_pengunjung, (select p.nama from public.profiles p where p.id = a.user_id), 'Pengunjung'),
      -- Akun pengunjung (null untuk pendaftaran langsung)
      'user', (select jsonb_build_object(
                 'id', p.id, 'name', p.nama,
                 'profile', jsonb_build_object('nama', p.nama, 'no_telp', p.no_telp, 'alamat', p.alamat, 'role', p.role))
               from public.profiles p where p.id = a.user_id),
      -- Petugas pelayanan yang memanggil (agar pengunjung tahu siapa yang memanggil)
      'dilayani_oleh', (select jsonb_build_object(
                          'id', p.id, 'name', p.nama,
                          'profile', jsonb_build_object('nama', p.nama))
                        from public.profiles p where p.id = a.dilayani_oleh)
    );
$$;

-- Pengganti validasiDataTamu() di PendaftaranController:
-- merapikan & memeriksa data buku tamu. Mengembalikan data yang sudah bersih.
create or replace function public._validasi_data_tamu(p jsonb, p_hp_wajib boolean, p_pernyataan_wajib boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- Rapikan spasi berlebih
  v_nama    text := regexp_replace(btrim(coalesce(p->>'nama_pengunjung', '')), '\s+', ' ', 'g');
  v_desa    text := regexp_replace(btrim(coalesce(p->>'desa_kelurahan', '')), '\s+', ' ', 'g');
  v_kep     text := regexp_replace(btrim(coalesce(p->>'keperluan', '')), '\s+', ' ', 'g');
  v_hp_raw  text := btrim(coalesce(p->>'no_telp_pengunjung', ''));
  v_kec     text := coalesce(p->>'kecamatan', '');
  v_layanan text := btrim(coalesce(p->>'layanan_id', ''));
  v_hp      text;
  -- Kumpulan error per kolom (urutan dijaga) & pesan error pertama
  v_err     jsonb := '[]'::jsonb;
  v_pertama text;
begin
  -- Huruf awal setiap kata dijadikan kapital: "ani sanirah" -> "Ani Sanirah"
  v_nama := initcap(lower(v_nama));
  v_desa := initcap(lower(v_desa));

  -- NAMA
  if v_nama = '' then
    v_err := v_err || jsonb_build_array(jsonb_build_array('nama_pengunjung', 'Nama lengkap wajib diisi.'));
  elsif length(v_nama) > 255 then
    v_err := v_err || jsonb_build_array(jsonb_build_array('nama_pengunjung', 'Nama terlalu panjang.'));
  elsif v_nama !~ '^[^0-9!@#$%^&*()_+=\[\]{};:"\\|,<>/?~`]+$' then
    v_err := v_err || jsonb_build_array(jsonb_build_array('nama_pengunjung', 'Nama hanya boleh berisi huruf, spasi, titik, apostrof, dan tanda hubung.'));
  end if;

  -- NOMOR HP (wajib untuk daftar online, boleh kosong untuk daftar langsung)
  if v_hp_raw = '' then
    if p_hp_wajib then
      v_err := v_err || jsonb_build_array(jsonb_build_array('no_telp_pengunjung', 'Nomor HP wajib diisi.'));
    end if;
  else
    v_hp := public._normalisasi_hp(v_hp_raw);
    if v_hp is null then
      v_err := v_err || jsonb_build_array(jsonb_build_array('no_telp_pengunjung', 'Format nomor HP tidak valid. Contoh: 081234567890.'));
    end if;
  end if;

  -- DESA / KELURAHAN
  if v_desa = '' then
    v_err := v_err || jsonb_build_array(jsonb_build_array('desa_kelurahan', 'Desa/kelurahan wajib diisi.'));
  elsif length(v_desa) > 100 then
    v_err := v_err || jsonb_build_array(jsonb_build_array('desa_kelurahan', 'Nama desa/kelurahan terlalu panjang.'));
  elsif v_desa !~ '^[^!@#$%^&*()_+=\[\]{};:"\\|,<>?~`]+$' then
    v_err := v_err || jsonb_build_array(jsonb_build_array('desa_kelurahan', 'Nama desa/kelurahan tidak valid.'));
  end if;

  -- KECAMATAN (harus dari daftar)
  if v_kec = '' then
    v_err := v_err || jsonb_build_array(jsonb_build_array('kecamatan', 'Kecamatan wajib dipilih.'));
  elsif not (v_kec = any (public._daftar_kecamatan())) then
    v_err := v_err || jsonb_build_array(jsonb_build_array('kecamatan', 'Kecamatan tidak dikenali. Pilih dari daftar.'));
  end if;

  -- KEPERLUAN (boleh kosong, maksimal 500 karakter)
  if length(v_kep) > 500 then
    v_err := v_err || jsonb_build_array(jsonb_build_array('keperluan', 'Keterangan keperluan maksimal 500 karakter.'));
  end if;

  -- LAYANAN (harus ada di tabel layanans)
  if v_layanan = '' then
    v_err := v_err || jsonb_build_array(jsonb_build_array('layanan_id', 'Jenis layanan wajib dipilih.'));
  elsif v_layanan !~ '^[0-9]{1,18}$'
        or not exists (select 1 from public.layanans where id = v_layanan::bigint) then
    v_err := v_err || jsonb_build_array(jsonb_build_array('layanan_id', 'Jenis layanan tidak ditemukan.'));
  end if;

  -- PERNYATAAN (khusus daftar online: pengganti tanda tangan buku tamu)
  if p_pernyataan_wajib and coalesce(p->>'pernyataan', '') not in ('true', '1', 'on', 'yes') then
    v_err := v_err || jsonb_build_array(jsonb_build_array('pernyataan', 'Centang pernyataan bahwa data yang Anda isi sudah benar.'));
  end if;

  -- Ada error -> kirim semua error sekaligus (pesan utama = error pertama)
  if jsonb_array_length(v_err) > 0 then
    v_pertama := v_err->0->>1;
    perform public._galat(v_pertama, 'validasi', v_err);
  end if;

  -- Data bersih
  return jsonb_build_object(
    'nama_pengunjung',    v_nama,
    'no_telp_pengunjung', v_hp,
    'desa_kelurahan',     v_desa,
    'kecamatan',          v_kec,
    'keperluan',          nullif(v_kep, ''),
    'layanan_id',         v_layanan::bigint
  );
end;
$$;

-- Pengganti AntreanService::buat(): membuat antrean baru berstatus MENUNGGU,
-- dengan nomor berikutnya (A001, A002, ...) dan barcode acak yang unik.
create or replace function public._buat_antrean(p jsonb, p_user uuid, p_jenis text, p_oleh uuid)
returns public.antreans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tgl   date := public._hari_ini();
  v_maks  integer;
  v_urut  integer;
  v_nomor text;
  v_kode  text;
  v_baru  public.antreans;
begin
  -- KUNCI per tanggal: jika dua orang mendaftar di detik yang sama, mereka diproses
  -- bergiliran sehingga nomor antrean tidak pernah ganda.
  perform pg_advisory_xact_lock(hashtext('sapa-antrean-' || v_tgl::text));

  -- Angka terbesar hari ini (buang huruf 'A' di depan), lalu tambah 1
  select coalesce(max(substring(nomor_antrean from 2)::integer), 0)
    into v_maks
    from public.antreans
   where tanggal = v_tgl;
  v_urut := v_maks + 1;
  -- Format 3 digit: A001. Lebih dari 999 tetap ditulis lengkap (A1000).
  v_nomor := 'A' || case when v_urut < 1000 then lpad(v_urut::text, 3, '0') else v_urut::text end;

  -- Barcode acak; ulangi jika (sangat jarang) sudah dipakai
  loop
    v_kode := public._kode_barcode_baru();
    exit when not exists (select 1 from public.antreans where kode_barcode = v_kode);
  end loop;

  insert into public.antreans (
    user_id, nama_pengunjung, no_telp_pengunjung, desa_kelurahan, kecamatan, keperluan,
    layanan_id, jenis_pendaftaran, nomor_antrean, kode_barcode, status, tanggal, didaftarkan_oleh
  ) values (
    p_user, p->>'nama_pengunjung', p->>'no_telp_pengunjung', p->>'desa_kelurahan', p->>'kecamatan', p->>'keperluan',
    (p->>'layanan_id')::bigint, p_jenis, v_nomor, v_kode, 'menunggu', v_tgl, p_oleh
  )
  returning * into v_baru;

  return v_baru;
end;
$$;

-- Fungsi bantu pembatalan ATOMIK: hanya berhasil jika status masih termasuk p_status_boleh
create or replace function public._batalkan(p_id bigint, p_oleh uuid, p_alasan text, p_status_boleh text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.antreans;
begin
  update public.antreans
     set status           = 'dibatalkan',
         dibatalkan_oleh  = p_oleh,
         waktu_dibatalkan = now(),
         alasan_batal     = p_alasan
   where id = p_id
     and status = any (p_status_boleh)
  returning * into a;

  if not found then
    perform public._galat('Status antrean baru saja berubah. Muat ulang halaman.', 'status_berubah');
  end if;

  return jsonb_build_object(
    'message', format('Antrean %s dibatalkan.', a.nomor_antrean),
    'antrean', public._antrean_json(a, false)
  );
end;
$$;

-- Mencari satu antrean berdasarkan id; error "tidak ditemukan" jika tidak ada
create or replace function public._cari_antrean(p_id bigint)
returns public.antreans
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.antreans;
begin
  select * into a from public.antreans where id = p_id;
  if not found then
    perform public._galat('Data antrean tidak ditemukan.', 'tidak_ditemukan');
  end if;
  return a;
end;
$$;


-- ======================================================================
-- BAGIAN B. AKUN (pengganti sebagian AuthController)
-- ======================================================================

-- GET /api/me -> data pengguna yang sedang login (bentuk sama seperti Laravel)
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
             'no_telp', p.no_telp, 'role', p.role))
    into v
    from auth.users u
    join public.profiles p on p.id = u.id
   where u.id = v_uid;
  return v;
end;
$$;

-- PUT /api/profile -> ubah nama, alamat, nomor HP. Role & email TIDAK bisa diubah.
create or replace function public.perbarui_profil(p_nama text, p_alamat text, p_no_telp text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := public._peran();
  v_role   text;
  v_nama   text := btrim(coalesce(p_nama, ''));
  v_alamat text := nullif(btrim(coalesce(p_alamat, '')), '');
  v_hp_raw text := btrim(coalesce(p_no_telp, ''));
  v_hp     text;
  v_err    jsonb := '[]'::jsonb;
begin
  select role into v_role from public.profiles where id = v_uid;

  -- NAMA
  if v_nama = '' then
    v_err := v_err || jsonb_build_array(jsonb_build_array('nama', 'Nama lengkap wajib diisi.'));
  elsif length(v_nama) > 255 then
    v_err := v_err || jsonb_build_array(jsonb_build_array('nama', 'Nama terlalu panjang.'));
  elsif v_nama !~ '^[^0-9!@#$%^&*()_+=\[\]{};:"\\|,<>/?~`]+$' then
    v_err := v_err || jsonb_build_array(jsonb_build_array('nama', 'Nama hanya boleh berisi huruf, spasi, titik, apostrof, dan tanda hubung.'));
  end if;

  -- ALAMAT
  if length(coalesce(v_alamat, '')) > 500 then
    v_err := v_err || jsonb_build_array(jsonb_build_array('alamat', 'Alamat terlalu panjang.'));
  end if;

  -- NOMOR HP: wajib untuk pengunjung (dipakai login), boleh kosong untuk petugas
  if v_hp_raw = '' then
    if v_role = 'pengunjung' then
      v_err := v_err || jsonb_build_array(jsonb_build_array('no_telp', 'Nomor HP wajib diisi.'));
    end if;
  else
    v_hp := public._normalisasi_hp(v_hp_raw);
    if v_hp is null then
      v_err := v_err || jsonb_build_array(jsonb_build_array('no_telp', 'Format nomor HP tidak valid. Contoh: 081234567890.'));
    elsif exists (select 1 from public.profiles where no_telp = v_hp and id <> v_uid) then
      v_err := v_err || jsonb_build_array(jsonb_build_array('no_telp', 'Nomor HP sudah digunakan akun lain.'));
    end if;
  end if;

  if jsonb_array_length(v_err) > 0 then
    perform public._galat(v_err->0->>1, 'validasi', v_err);
  end if;

  update public.profiles
     set nama = v_nama, alamat = v_alamat, no_telp = v_hp
   where id = v_uid;

  return jsonb_build_object('message', 'Profil berhasil diperbarui', 'user', public.data_saya());
end;
$$;

-- Dipakai halaman "Ubah Kata Sandi": memeriksa apakah kata sandi lama benar
create or replace function public.cek_password_lama(p_password text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid  uuid := public._peran();
  v_hash text;
begin
  select encrypted_password into v_hash from auth.users where id = v_uid;
  return v_hash is not null and v_hash = extensions.crypt(coalesce(p_password, ''), v_hash);
end;
$$;

-- Login dengan NOMOR HP: Supabase hanya bisa login dengan email, jadi fungsi ini
-- mencari email pemilik nomor HP. Email HANYA dikembalikan jika kata sandinya benar,
-- sehingga orang lain tidak bisa mengintip email dari nomor HP.
-- Juga membatasi 5 kali gagal per nomor HP dalam 15 menit (seperti RateLimiter Laravel).
create or replace function public.email_untuk_login(p_hp text, p_password text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hp     text := public._normalisasi_hp(p_hp);
  v_jumlah integer;
  v_awal   timestamptz;
  v_email  text;
  v_hash   text;
begin
  if v_hp is null then
    perform public._galat('Format nomor HP tidak valid.', 'validasi',
      jsonb_build_array(jsonb_build_array('login', 'Format nomor HP tidak valid.')));
  end if;

  -- Hapus catatan gagal yang sudah lebih dari 15 menit
  delete from public.login_gagal where waktu < now() - interval '15 minutes';

  -- Sudah 5 kali gagal -> tolak sementara
  select count(*), min(waktu) into v_jumlah, v_awal from public.login_gagal where kunci = v_hp;
  if v_jumlah >= 5 then
    perform public._galat(
      format('Terlalu banyak percobaan login. Coba lagi dalam %s detik.',
             greatest(1, ceil(extract(epoch from (v_awal + interval '15 minutes' - now())))::integer)),
      'terlalu_banyak_percobaan');
  end if;

  -- Cari akun berdasarkan nomor HP
  select u.email, u.encrypted_password into v_email, v_hash
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.no_telp = v_hp;

  if v_hash is not null and v_hash = extensions.crypt(coalesce(p_password, ''), v_hash) then
    -- Benar: hapus catatan gagal
    delete from public.login_gagal where kunci = v_hp;
    return v_email;
  end if;

  -- Akun tidak ada: tetap hitung hash agar waktu respons sama (tidak bisa ditebak)
  if v_hash is null then
    perform extensions.crypt(coalesce(p_password, ''), extensions.gen_salt('bf'));
  end if;

  -- Salah: catat percobaan gagal
  insert into public.login_gagal (kunci) values (v_hp);
  return null;
end;
$$;

-- Halaman Daftar Akun: cek apakah nomor HP sudah dipakai akun lain
create or replace function public.hp_sudah_dipakai(p_hp text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where no_telp = public._normalisasi_hp(p_hp)
  );
$$;


-- ======================================================================
-- BAGIAN C. PENGUNJUNG (pengganti PendaftaranController untuk pengunjung)
-- ======================================================================

-- GET /api/antreans/my -> semua antrean milik pengunjung yang login (terbaru di atas),
-- ditambah jumlah orang di depannya untuk antrean hari ini yang sudah terverifikasi.
create or replace function public.antrean_saya()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._peran(array['pengunjung']);
begin
  -- Tutup dulu antrean hari sebelumnya yang tidak sempat diproses
  perform public._tutup_antrean_lama();

  return coalesce((
    select jsonb_agg(
             public._antrean_json(a, true)
             || case
                  when a.status = 'terverifikasi' and a.tanggal = public._hari_ini() then
                    jsonb_build_object('jumlah_di_depan', (
                      select count(*) from public.antreans b
                       where b.tanggal = a.tanggal
                         and b.status = 'terverifikasi'
                         and b.waktu_verifikasi < a.waktu_verifikasi))
                  else '{}'::jsonb
                end
             order by a.created_at desc, a.id desc)
      from public.antreans a
     where a.user_id = v_uid
  ), '[]'::jsonb);
end;
$$;

-- POST /api/antreans -> pendaftaran ONLINE oleh pengunjung
create or replace function public.ambil_antrean_online(p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := public._peran(array['pengunjung']);
  v      jsonb;
  v_baru public.antreans;
begin
  -- Wajib verifikasi email dulu
  if (select email_confirmed_at from auth.users where id = v_uid) is null then
    perform public._galat('Akun belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu.', 'email_belum_terverifikasi');
  end if;

  -- Kunci per pengunjung: klik dua kali bersamaan tetap hanya menghasilkan 1 antrean
  perform pg_advisory_xact_lock(hashtext('sapa-pengunjung-' || v_uid::text));

  -- Satu pengunjung hanya boleh punya 1 antrean aktif per hari
  if exists (
    select 1 from public.antreans
     where tanggal = public._hari_ini()
       and user_id = v_uid
       and status in ('menunggu', 'terverifikasi', 'dipanggil', 'dilayani')
  ) then
    perform public._galat('Anda masih memiliki antrean yang aktif hari ini. Selesaikan dulu sebelum mengambil antrean baru.', 'antrean_aktif');
  end if;

  -- Validasi buku tamu (HP wajib + pernyataan wajib)
  v := public._validasi_data_tamu(p_data, true, true);

  v_baru := public._buat_antrean(v, v_uid, 'online', null);

  return jsonb_build_object('message', 'Antrean berhasil diambil', 'antrean', public._antrean_json(v_baru, true));
end;
$$;

-- PUT /api/antreans/{id}/batal-saya -> pengunjung membatalkan antrean MILIKNYA sendiri
-- (hanya selama masih MENUNGGU)
create or replace function public.batal_saya(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._peran(array['pengunjung']);
  a     public.antreans := public._cari_antrean(p_id);
begin
  if a.user_id is distinct from v_uid then
    perform public._galat('Antrean ini bukan milik Anda.', 'tidak_berhak');
  end if;
  if a.status <> 'menunggu' then
    perform public._galat('Antrean hanya bisa dibatalkan sebelum diverifikasi petugas.', 'status_tidak_sesuai');
  end if;
  return public._batalkan(a.id, v_uid, 'Dibatalkan sendiri oleh pengunjung.', array['menunggu']);
end;
$$;


-- ======================================================================
-- BAGIAN D. PETUGAS PENDAFTARAN
-- ======================================================================

-- POST /api/antreans/langsung -> pendaftaran LANGSUNG diinput petugas
create or replace function public.daftar_langsung(p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := public._peran(array['petugas_pendaftaran']);
  v      jsonb;
  v_baru public.antreans;
begin
  -- HP boleh kosong (misal warga lansia tanpa HP), tanpa centang pernyataan
  v := public._validasi_data_tamu(p_data, false, false);
  v_baru := public._buat_antrean(v, null, 'langsung', v_uid);
  return jsonb_build_object('message', 'Pendaftaran langsung berhasil', 'antrean', public._antrean_json(v_baru, true));
end;
$$;

-- POST /api/antreans/verify-qr -> scan barcode: MENUNGGU -> TERVERIFIKASI (ATOMIK)
create or replace function public.verifikasi_barcode(p_kode text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := public._peran(array['petugas_pendaftaran']);
  -- Bersihkan spasi & jadikan huruf besar (alat scanner USB kadang mengirim huruf kecil)
  v_kode text := upper(btrim(coalesce(p_kode, '')));
  a      public.antreans;
begin
  if v_kode = '' or length(v_kode) > 100 then
    perform public._galat('Kode barcode wajib diisi dengan benar.', 'validasi',
      jsonb_build_array(jsonb_build_array('qr_data', 'Kode barcode wajib diisi dengan benar.')));
  end if;

  select * into a from public.antreans where kode_barcode = v_kode;

  -- CASE 1: barcode tidak dikenal
  if not found then
    perform public._galat('Barcode tidak valid. Silakan daftar ulang.', 'tidak_ditemukan');
  end if;

  -- CASE 2: bukan antrean hari ini
  if a.tanggal <> public._hari_ini() then
    perform public._galat('Barcode sudah kedaluwarsa (bukan antrean hari ini). Silakan daftar ulang.', 'kedaluwarsa');
  end if;

  -- CASE 3: sudah pernah diproses
  if not public._boleh_pindah(a.status, 'terverifikasi') then
    perform public._galat(
      case a.status
        when 'terverifikasi' then 'Barcode ini sudah diverifikasi sebelumnya.'
        when 'dipanggil'     then 'Antrean ini sudah dipanggil petugas pelayanan.'
        when 'dilayani'      then 'Antrean ini sedang dilayani.'
        when 'selesai'       then 'Antrean ini sudah selesai dilayani.'
        when 'dibatalkan'    then 'Antrean ini sudah dibatalkan. Silakan daftar ulang.'
        else 'Antrean ini tidak bisa diverifikasi.'
      end, 'sudah_diproses');
  end if;

  -- Ubah status SECARA ATOMIK: hanya berhasil jika status MASIH 'menunggu'
  update public.antreans
     set status            = 'terverifikasi',
         diverifikasi_oleh = v_uid,
         waktu_verifikasi  = now()
   where id = a.id
     and status = 'menunggu'
  returning * into a;

  -- Didahului scan lain di detik yang sama
  if not found then
    perform public._galat('Barcode ini baru saja diverifikasi.', 'sudah_diproses');
  end if;

  return jsonb_build_object(
    'message', 'Barcode valid. Antrean terverifikasi dan masuk ke daftar petugas pelayanan.',
    'antrean', public._antrean_json(a, true));
end;
$$;

-- PUT /api/antreans/{id}/batal -> petugas pendaftaran membatalkan antrean
create or replace function public.batal_petugas(p_id bigint, p_alasan text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := public._peran(array['petugas_pendaftaran']);
  a        public.antreans := public._cari_antrean(p_id);
  v_alasan text := btrim(coalesce(p_alasan, ''));
begin
  if length(v_alasan) > 255 then
    perform public._galat('Alasan maksimal 255 karakter.', 'validasi',
      jsonb_build_array(jsonb_build_array('alasan', 'Alasan maksimal 255 karakter.')));
  end if;
  if a.status not in ('menunggu', 'terverifikasi') then
    perform public._galat(format('Antrean berstatus %s tidak bisa dibatalkan petugas pendaftaran.', a.status), 'status_tidak_sesuai');
  end if;
  return public._batalkan(a.id, v_uid, coalesce(nullif(v_alasan, ''), 'Dibatalkan oleh petugas pendaftaran.'),
                          array['menunggu', 'terverifikasi']);
end;
$$;


-- ======================================================================
-- BAGIAN E. PETUGAS PELAYANAN
-- ======================================================================

-- GET /api/pelayanan/daftar -> antrean TERVERIFIKASI hari ini (urut waktu verifikasi)
create or replace function public.pelayanan_daftar()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._peran(array['petugas_pelayanan']);
  perform public._tutup_antrean_lama();
  return coalesce((
    select jsonb_agg(public._antrean_json(a, false) order by a.waktu_verifikasi asc, a.id asc)
      from public.antreans a
     where a.tanggal = public._hari_ini()
       and a.status = 'terverifikasi'
  ), '[]'::jsonb);
end;
$$;

-- GET /api/pelayanan/saya -> antrean yang sedang dipegang petugas ini
create or replace function public.pelayanan_saya()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._peran(array['petugas_pelayanan']);
begin
  return jsonb_build_object('antrean', (
    select public._antrean_json(a, false)
      from public.antreans a
     where a.tanggal = public._hari_ini()
       and a.dilayani_oleh = v_uid
       and a.status in ('dipanggil', 'dilayani')
     limit 1));
end;
$$;

-- PUT /api/antreans/{id}/call -> tombol "Ambil": TERVERIFIKASI -> DIPANGGIL (ATOMIK)
create or replace function public.ambil_antrean(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := public._peran(array['petugas_pelayanan']);
  a       public.antreans := public._cari_antrean(p_id);
  v_aktif text;
begin
  -- Aturan 1: hanya antrean hari ini
  if a.tanggal <> public._hari_ini() then
    perform public._galat('Ini bukan antrean hari ini.', 'kedaluwarsa');
  end if;

  -- Aturan 2: satu petugas hanya boleh memegang SATU antrean aktif
  select nomor_antrean into v_aktif
    from public.antreans
   where tanggal = public._hari_ini()
     and dilayani_oleh = v_uid
     and status in ('dipanggil', 'dilayani')
   limit 1;
  if v_aktif is not null then
    perform public._galat(format('Selesaikan dulu antrean %s sebelum mengambil antrean baru.', v_aktif), 'masih_memegang');
  end if;

  -- Aturan 3: hanya antrean TERVERIFIKASI yang boleh diambil
  if a.status <> 'terverifikasi' then
    if a.status = 'menunggu' then
      perform public._galat('Antrean ini belum diverifikasi oleh petugas pendaftaran.', 'status_tidak_sesuai');
    elsif a.status in ('dipanggil', 'dilayani') then
      perform public._galat('Antrean ini sudah diambil petugas lain.', 'sudah_diambil');
    end if;
    perform public._galat(format('Antrean ini tidak bisa diambil (status: %s).', a.status), 'status_tidak_sesuai');
  end if;

  -- Ubah status SECARA ATOMIK: hanya jika masih 'terverifikasi'.
  -- Jika dua petugas menekan "Ambil" bersamaan, hanya satu yang berhasil.
  begin
    update public.antreans
       set status          = 'dipanggil',
           dilayani_oleh   = v_uid,
           waktu_dipanggil = now()
     where id = a.id
       and status = 'terverifikasi'
    returning * into a;
  exception when unique_violation then
    -- Petugas yang sama menekan "Ambil" di dua antrean pada saat bersamaan
    perform public._galat('Selesaikan dulu antrean yang sedang Anda pegang sebelum mengambil antrean baru.', 'masih_memegang');
  end;

  if not found then
    perform public._galat('Antrean ini baru saja diambil petugas lain.', 'sudah_diambil');
  end if;

  return jsonb_build_object(
    'message', 'Antrean berhasil diambil. Silakan panggil secara lisan.',
    'antrean', public._antrean_json(a, false));
end;
$$;

-- Fungsi bantu untuk "Mulai Layani" & "Selesai": mengubah status antrean
-- yang DIPEGANG petugas ini, secara atomik.
create or replace function public._ubah_status_milik_saya(p_id bigint, p_baru text, p_pesan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._peran(array['petugas_pelayanan']);
  a     public.antreans := public._cari_antrean(p_id);
begin
  -- Hanya petugas yang mengambil antrean ini
  if a.dilayani_oleh is distinct from v_uid then
    perform public._galat('Antrean ini bukan antrean yang Anda ambil.', 'tidak_berhak');
  end if;

  -- Status tidak boleh dilompati
  if not public._boleh_pindah(a.status, p_baru) then
    perform public._galat(format('Status antrean saat ini (%s) tidak bisa diubah ke %s.', a.status, p_baru), 'status_tidak_sesuai');
  end if;

  -- ATOMIK: hanya jika status & pemilik masih sama seperti tadi
  update public.antreans
     set status               = p_baru,
         waktu_mulai_dilayani = case when p_baru = 'dilayani' then now() else waktu_mulai_dilayani end,
         waktu_selesai        = case when p_baru = 'selesai'  then now() else waktu_selesai end
   where id = a.id
     and status = a.status
     and dilayani_oleh = v_uid
  returning * into a;

  if not found then
    perform public._galat('Status antrean baru saja berubah. Muat ulang daftar.', 'status_berubah');
  end if;

  return jsonb_build_object('message', p_pesan, 'antrean', public._antrean_json(a, false));
end;
$$;

-- PUT /api/antreans/{id}/mulai -> "Mulai Layani": DIPANGGIL -> DILAYANI
create or replace function public.mulai_layani(p_id bigint)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public._ubah_status_milik_saya(p_id, 'dilayani', 'Pelayanan dimulai.');
$$;

-- PUT /api/antreans/{id}/selesai -> "Selesai": DILAYANI -> SELESAI
create or replace function public.selesai_layani(p_id bigint)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public._ubah_status_milik_saya(p_id, 'selesai', 'Pelayanan selesai. Riwayat tercatat.');
$$;

-- PUT /api/antreans/{id}/tidak-hadir -> "Tidak Hadir": DIPANGGIL -> DIBATALKAN
create or replace function public.tidak_hadir(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._peran(array['petugas_pelayanan']);
  a     public.antreans := public._cari_antrean(p_id);
begin
  if a.dilayani_oleh is distinct from v_uid then
    perform public._galat('Antrean ini bukan antrean yang Anda ambil.', 'tidak_berhak');
  end if;
  if a.status <> 'dipanggil' then
    perform public._galat('Tombol "Tidak Hadir" hanya untuk antrean yang sudah dipanggil dan belum dilayani.', 'status_tidak_sesuai');
  end if;

  update public.antreans
     set status           = 'dibatalkan',
         dibatalkan_oleh  = v_uid,
         waktu_dibatalkan = now(),
         alasan_batal     = 'Tidak hadir saat dipanggil.'
   where id = a.id
     and status = 'dipanggil'
     and dilayani_oleh = v_uid
  returning * into a;

  if not found then
    perform public._galat('Status antrean baru saja berubah. Muat ulang daftar.', 'status_berubah');
  end if;

  return jsonb_build_object(
    'message', format('Antrean %s ditandai tidak hadir. Silakan ambil antrean berikutnya.', a.nomor_antrean),
    'antrean', public._antrean_json(a, false));
end;
$$;


-- ======================================================================
-- BAGIAN F. KEDUA PETUGAS (dashboard)
-- ======================================================================

-- GET /api/antreans/today -> semua antrean hari ini.
-- Barcode pendaftar LANGSUNG hanya terlihat oleh petugas PENDAFTARAN (untuk cetak ulang tiket).
create or replace function public.antrean_hari_ini()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := public._peran(array['petugas_pendaftaran', 'petugas_pelayanan']);
  v_role text;
begin
  select role into v_role from public.profiles where id = v_uid;
  perform public._tutup_antrean_lama();
  return coalesce((
    select jsonb_agg(
             public._antrean_json(a, v_role = 'petugas_pendaftaran' and a.jenis_pendaftaran = 'langsung')
             order by a.created_at asc, a.id asc)
      from public.antreans a
     where a.tanggal = public._hari_ini()
  ), '[]'::jsonb);
end;
$$;

-- GET /api/dashboard/stats -> angka ringkasan + antrean yang sedang diproses
create or replace function public.statistik_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_stats   jsonb;
  v_proses  jsonb;
begin
  perform public._peran(array['petugas_pendaftaran', 'petugas_pelayanan']);

  -- Hitung jumlah per status & per cara daftar dalam satu query
  select jsonb_build_object(
           'total',         count(*),
           'menunggu',      count(*) filter (where status = 'menunggu'),
           'terverifikasi', count(*) filter (where status = 'terverifikasi'),
           'dipanggil',     count(*) filter (where status = 'dipanggil'),
           'dilayani',      count(*) filter (where status = 'dilayani'),
           'selesai',       count(*) filter (where status = 'selesai'),
           'dibatalkan',    count(*) filter (where status = 'dibatalkan'),
           'online',        count(*) filter (where jenis_pendaftaran = 'online'),
           'langsung',      count(*) filter (where jenis_pendaftaran = 'langsung'))
    into v_stats
    from public.antreans
   where tanggal = public._hari_ini();

  -- Antrean yang sedang dipanggil/dilayani (bisa lebih dari satu karena 3 petugas)
  select coalesce(jsonb_agg(public._antrean_json(a, false) order by a.waktu_dipanggil desc), '[]'::jsonb)
    into v_proses
    from public.antreans a
   where a.tanggal = public._hari_ini()
     and a.status in ('dipanggil', 'dilayani');

  return jsonb_build_object(
    'stats', v_stats,
    'sedang_diproses', v_proses,
    'sedang_dipanggil', v_proses->0);
end;
$$;

-- GET /api/antreans/{id} -> detail satu antrean (tanpa barcode)
create or replace function public.detail_antrean(p_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public._peran(array['petugas_pendaftaran', 'petugas_pelayanan']);
  return public._antrean_json(public._cari_antrean(p_id), false);
end;
$$;


-- ======================================================================
-- BAGIAN G. TRIGGER AKUN
-- ======================================================================

-- Setiap ada akun baru di Supabase Auth (daftar akun), buat profilnya otomatis.
-- Role DIKUNCI 'pengunjung' (pengunjung tidak bisa memilih role sendiri).
create or replace function public._profil_akun_baru()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nama text  := nullif(regexp_replace(btrim(coalesce(v_meta->>'nama', '')), '\s+', ' ', 'g'), '');
  v_hp   text  := nullif(btrim(coalesce(v_meta->>'no_telp', '')), '');
begin
  -- Nomor HP diseragamkan ke format 08...
  if v_hp is not null then
    v_hp := public._normalisasi_hp(v_hp);
    if v_hp is null then
      raise exception 'Format nomor HP tidak valid. Contoh: 081234567890.';
    end if;
  end if;

  insert into public.profiles (id, nama, alamat, no_telp, role)
  values (
    new.id,
    -- Akun yang dibuat dari dashboard Supabase (tanpa nama) memakai bagian depan email
    coalesce(v_nama, split_part(new.email, '@', 1)),
    nullif(btrim(coalesce(v_meta->>'alamat', '')), ''),
    v_hp,
    'pengunjung'
  );
  return new;
end;
$$;

drop trigger if exists sapa_profil_akun_baru on auth.users;
create trigger sapa_profil_akun_baru
  after insert on auth.users
  for each row execute function public._profil_akun_baru();

-- Saat administrator menonaktifkan akun (profiles.is_active = false), akun itu
-- juga diblokir di Supabase Auth sehingga BENAR-BENAR tidak bisa login.
-- Diaktifkan lagi (true) -> blokir dicabut.
create or replace function public._sinkron_status_akun()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active is distinct from old.is_active then
    update auth.users
       set banned_until = case when new.is_active then null else timestamptz '2999-12-31 00:00:00+00' end
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sapa_sinkron_status_akun on public.profiles;
create trigger sapa_sinkron_status_akun
  after update of is_active on public.profiles
  for each row execute function public._sinkron_status_akun();
