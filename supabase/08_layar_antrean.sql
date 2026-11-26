-- ======================================================================
-- FILE: supabase/08_layar_antrean.sql
-- DESKRIPSI: Fitur LAYAR ANTREAN (display TV di ruang tunggu).
--   1. Kolom baru di tabel antreans:
--        loket          -> nomor loket yang memanggil (1–9)
--        waktu_umumkan  -> waktu terakhir nomor ini diumumkan
--                          (diperbarui saat "Ambil" dan "Panggil Ulang")
--   2. Fungsi umumkan_panggilan(): dipanggil komputer petugas pelayanan
--      agar layar TV ikut menampilkan & mengumumkan panggilan.
--   3. Fungsi layar_antrean(): data untuk halaman /layar. Boleh dibuka
--      TANPA LOGIN, dan hanya berisi nomor antrean, loket, & nama layanan
--      (nama pengunjung TIDAK ikut dikirim demi privasi).
-- Catatan: di file SQL, komentar ditulis dengan "--" (setara "//" di JavaScript).
-- Cara pakai: jalankan KEDELAPAN, setelah 07_foto_profil.sql.
-- Aman dijalankan berulang kali.
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. KOLOM BARU
-- ----------------------------------------------------------------------
alter table public.antreans add column if not exists loket smallint;
alter table public.antreans add column if not exists waktu_umumkan timestamptz;

-- Nomor loket hanya boleh 1 sampai 9 (atau kosong)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'antreans_loket_valid') then
    alter table public.antreans
      add constraint antreans_loket_valid check (loket is null or loket between 1 and 9);
  end if;
end $$;

-- Indeks agar layar cepat mencari panggilan terbaru hari ini
create index if not exists antreans_tanggal_umumkan_idx
  on public.antreans (tanggal, waktu_umumkan desc);

-- ----------------------------------------------------------------------
-- 2. FUNGSI umumkan_panggilan
-- Dipanggil setelah petugas menekan "Ambil" atau "Panggil Ulang".
-- Hanya petugas yang MEMEGANG antrean tersebut yang boleh mengumumkan.
-- ----------------------------------------------------------------------
create or replace function public.umumkan_panggilan(p_id bigint, p_loket int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public._peran(array['petugas_pelayanan']);
  a     public.antreans := public._cari_antrean(p_id);
begin
  -- Nomor loket harus 1–9
  if p_loket is null or p_loket not between 1 and 9 then
    perform public._galat('Nomor loket tidak valid.', 'loket_tidak_valid');
  end if;

  -- Hanya antrean hari ini yang sedang dipegang petugas ini
  if a.tanggal <> public._hari_ini()
     or a.dilayani_oleh is distinct from v_uid
     or a.status not in ('dipanggil', 'dilayani') then
    perform public._galat('Antrean ini tidak sedang Anda layani.', 'bukan_milik_saya');
  end if;

  -- Catat loket & waktu pengumuman (layar TV akan membaca perubahan ini)
  update public.antreans
     set loket = p_loket,
         waktu_umumkan = now()
   where id = a.id;

  return jsonb_build_object('message', 'Panggilan ditampilkan di layar antrean.');
end;
$$;

revoke all on function public.umumkan_panggilan(bigint, int) from public, anon;
grant execute on function public.umumkan_panggilan(bigint, int) to authenticated;

-- ----------------------------------------------------------------------
-- 3. FUNGSI layar_antrean (untuk halaman /layar, tanpa login)
-- Isi:
--   loket      : 4 loket, masing-masing berisi antrean yang sedang dilayani
--   panggilan  : 6 panggilan terakhir hari ini (paling baru di atas)
--   menunggu   : jumlah antrean terverifikasi yang belum dipanggil
--   selesai    : jumlah antrean selesai hari ini
-- ----------------------------------------------------------------------
create or replace function public.layar_antrean()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with hari_ini as (
    -- Semua antrean hari ini beserta nama layanannya (tanpa data pribadi)
    select a.id, a.nomor_antrean, a.status, a.loket, a.waktu_umumkan, l.nama_layanan
      from public.antreans a
      join public.layanans l on l.id = a.layanan_id
     where a.tanggal = public._hari_ini()
  )
  select jsonb_build_object(
    'tanggal', public._hari_ini(),
    'waktu_server', now(),

    -- Loket 1–4: antrean yang sedang dipanggil/dilayani di loket tersebut
    'loket', (
      select jsonb_agg(jsonb_build_object(
               'loket', n,
               'nomor', x.nomor_antrean,
               'status', x.status,
               'layanan', x.nama_layanan) order by n)
        from generate_series(1, 4) as n
        left join lateral (
          select h.* from hari_ini h
           where h.loket = n and h.status in ('dipanggil', 'dilayani')
           order by h.waktu_umumkan desc nulls last
           limit 1
        ) x on true
    ),

    -- Panggilan terakhir (dipakai layar untuk menampilkan & mengumumkan)
    'panggilan', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'nomor', p.nomor_antrean,
               'loket', p.loket,
               'layanan', p.nama_layanan,
               'status', p.status,
               'waktu', p.waktu_umumkan) order by p.waktu_umumkan desc)
        from (
          select * from hari_ini
           where waktu_umumkan is not null
           order by waktu_umumkan desc
           limit 6
        ) p
    ), '[]'::jsonb),

    -- Ringkasan jumlah
    'menunggu', (select count(*) from hari_ini where status = 'terverifikasi'),
    'selesai',  (select count(*) from hari_ini where status = 'selesai')
  );
$$;

-- Boleh dibuka siapa saja (layar TV tidak perlu login)
revoke all on function public.layar_antrean() from public;
grant execute on function public.layar_antrean() to anon, authenticated;

-- Pemberitahuan di tab "Results" setelah file ini dijalankan
do $$ begin raise notice 'Layar antrean siap: buka /layar di TV ruang tunggu.'; end $$;
