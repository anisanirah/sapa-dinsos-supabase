-- ======================================================================
-- FILE: supabase/05_rekap_layanan.sql
-- DESKRIPSI: Fitur REKAP LAYANAN (permintaan Dinas Sosial, meniru dasbor "Laporan Hastag").
--   1. Kolom "kode" (tag) di tabel layanans, misalnya #DTSEN atau #PBI
--   2. Tambahan jenis layanan: Surat Keterangan DTSEN dan Pengusulan PBI-JK
--   3. Fungsi rekap_layanan(): menghitung jumlah permohonan per jenis layanan
--      dalam rentang tanggal tertentu (hari ini, bulan ini, dst.)
-- Catatan: di file SQL, komentar ditulis dengan "--" (setara "//" di JavaScript).
-- Cara pakai: jalankan KELIMA, setelah 04_data_awal.sql. Aman dijalankan berulang kali.
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. KOLOM KODE/TAG DI TABEL LAYANANS
-- ----------------------------------------------------------------------
-- Kode pendek tanpa tanda "#" (tanda "#" ditambahkan oleh tampilan)
alter table public.layanans add column if not exists kode text;

-- Kode harus unik agar satu tag hanya mewakili satu jenis layanan
create unique index if not exists layanans_kode_unik on public.layanans (kode);

-- Kode untuk 5 layanan yang sudah ada
update public.layanans set kode = 'BANSOS-TUNAI' where nama_layanan = 'Bantuan Sosial Tunai' and kode is null;
update public.layanans set kode = 'REHSOS'       where nama_layanan = 'Rehabilitasi Sosial'  and kode is null;
update public.layanans set kode = 'LINJAMSOS'    where nama_layanan = 'Perlindungan Sosial'  and kode is null;
update public.layanans set kode = 'DAYASOS'      where nama_layanan = 'Pemberdayaan Sosial'  and kode is null;
update public.layanans set kode = 'BPJS-KIS'     where nama_layanan = 'Aktivasi BPJS/KIS'    and kode is null;

-- ----------------------------------------------------------------------
-- 2. LAYANAN TAMBAHAN YANG DISEBUT PIHAK DINSOS
-- Persyaratan di bawah masih CONTOH: sesuaikan dengan ketentuan resmi Dinsos.
-- ----------------------------------------------------------------------
insert into public.layanans (nama_layanan, kode, deskripsi, persyaratan) values
  ('Surat Keterangan DTSEN', 'DTSEN',
   'Penerbitan surat keterangan terdaftar dalam Data Tunggal Sosial dan Ekonomi Nasional (DTSEN).',
   E'Fotokopi Kartu Tanda Penduduk (KTP)\nFotokopi Kartu Keluarga (KK)\nSurat pengantar dari Desa/Kelurahan (jika diperlukan)'),
  ('Pengusulan PBI-JK', 'PBI',
   'Pengusulan peserta Penerima Bantuan Iuran Jaminan Kesehatan (PBI-JK) bagi masyarakat yang berhak.',
   E'Fotokopi Kartu Tanda Penduduk (KTP)\nFotokopi Kartu Keluarga (KK)\nSurat Keterangan Tidak Mampu (SKTM) dari Desa/Kelurahan')
on conflict (nama_layanan) do update
  set kode = coalesce(public.layanans.kode, excluded.kode);

-- ----------------------------------------------------------------------
-- 3. FUNGSI REKAP LAYANAN
-- Menghitung permohonan per jenis layanan dalam rentang tanggal p_dari s.d. p_sampai.
-- Pengelompokan status (meniru ikon di dasbor contoh):
--   menunggu  = menunggu + terverifikasi  (ikon jam)
--   diproses  = dipanggil + dilayani      (ikon putar)
--   selesai   = selesai                   (ikon centang)
--   dibatalkan dihitung terpisah dan TIDAK masuk total permohonan
-- Hanya petugas pendaftaran & petugas pelayanan yang boleh melihat rekap.
-- ----------------------------------------------------------------------
create or replace function public.rekap_layanan(p_dari date default null, p_sampai date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- Kosong = hari ini (jam WIB)
  v_dari    date := coalesce(p_dari, public._hari_ini());
  v_sampai  date := coalesce(p_sampai, p_dari, public._hari_ini());
  v_layanan jsonb;
  v_total   jsonb;
begin
  -- Cek login, akun aktif, dan peran
  perform public._peran(array['petugas_pendaftaran', 'petugas_pelayanan']);

  -- Tanggal awal tidak boleh setelah tanggal akhir
  if v_dari > v_sampai then
    perform public._galat('Tanggal awal tidak boleh setelah tanggal akhir.', 'validasi');
  end if;

  -- Batasi rentang maksimal 1 tahun agar ringan
  if v_sampai - v_dari > 366 then
    perform public._galat('Rentang rekap maksimal 1 tahun.', 'validasi');
  end if;

  -- Hitung per layanan (urut abjad kode); layanan tanpa permohonan tetap tampil dengan angka 0
  select coalesce(jsonb_agg(baris order by baris->>'kode'), '[]'::jsonb)
    into v_layanan
    from (
      select jsonb_build_object(
               'id',           l.id,
               'kode',         coalesce(l.kode, upper(regexp_replace(l.nama_layanan, '\s+', '-', 'g'))),
               'nama_layanan', l.nama_layanan,
               'total',        count(a.id) filter (where a.status <> 'dibatalkan'),
               'menunggu',     count(a.id) filter (where a.status in ('menunggu', 'terverifikasi')),
               'diproses',     count(a.id) filter (where a.status in ('dipanggil', 'dilayani')),
               'selesai',      count(a.id) filter (where a.status = 'selesai'),
               'dibatalkan',   count(a.id) filter (where a.status = 'dibatalkan'),
               'online',       count(a.id) filter (where a.status <> 'dibatalkan' and a.jenis_pendaftaran = 'online'),
               'langsung',     count(a.id) filter (where a.status <> 'dibatalkan' and a.jenis_pendaftaran = 'langsung')
             ) as baris
        from public.layanans l
        left join public.antreans a
          on a.layanan_id = l.id
         and a.tanggal between v_dari and v_sampai
       group by l.id, l.kode, l.nama_layanan
    ) t;

  -- Jumlah keseluruhan untuk ringkasan di atas kotak-kotak layanan
  select jsonb_build_object(
           'total',      count(*) filter (where status <> 'dibatalkan'),
           'menunggu',   count(*) filter (where status in ('menunggu', 'terverifikasi')),
           'diproses',   count(*) filter (where status in ('dipanggil', 'dilayani')),
           'selesai',    count(*) filter (where status = 'selesai'),
           'dibatalkan', count(*) filter (where status = 'dibatalkan'))
    into v_total
    from public.antreans
   where tanggal between v_dari and v_sampai;

  return jsonb_build_object(
    'dari',    v_dari,
    'sampai',  v_sampai,
    'total',   v_total,
    'layanan', v_layanan);
end;
$$;

-- Hanya pengguna yang sudah login boleh menjalankan (peran diperiksa di dalam fungsi)
revoke execute on function public.rekap_layanan(date, date) from public, anon;
grant execute on function public.rekap_layanan(date, date) to authenticated;
