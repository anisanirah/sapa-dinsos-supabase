// ========================================
// FILE: RekapLayanan.jsx
// DESKRIPSI: Halaman REKAP LAYANAN untuk petugas (permintaan Dinas Sosial).
// Meniru dasbor "Laporan Hastag": setiap jenis layanan tampil sebagai kotak berisi
// jumlah permohonan, kode/tag (misal #DTSEN), dan rincian status:
//   ikon jam (merah)    = menunggu (belum dipanggil)
//   ikon putar (oranye) = sedang diproses (dipanggil/dilayani)
//   ikon centang (hijau)= selesai
// Periode bisa dipilih: hari ini, bulan ini, bulan tertentu, atau rentang tanggal.
// Data diambil dari fungsi Supabase "rekap_layanan" (lihat supabase/05_rekap_layanan.sql).
// ========================================

// useState = simpan data; useCallback = simpan fungsi; useMemo = hitung ulang hanya bila perlu
import { useState, useCallback, useMemo, useEffect } from 'react'
// Ikon-ikon dari lucide-react
import {
  Clock3, RefreshCw, CheckCircle2, XCircle, BarChart3, Download, Loader2, Tag,
} from 'lucide-react'
// Klien API (penerjemah ke Supabase, lihat lib/api.js)
import api from '../lib/api'
// Fungsi bantu pesan error
import { pesanError } from '../lib/antrean'
// Kotak pesan gagal yang dipakai bersama dashboard petugas
import { PesanGagal } from './petugas/komponen'

// Data diperbarui otomatis setiap 30 detik (cukup untuk rekap)
const JEDA_REFRESH = 30000

// Tanggal hari ini menurut jam WIB, format "YYYY-MM-DD"
function hariIniWIB() {
  // Format "en-CA" menghasilkan YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

// Tanggal pertama & terakhir dari bulan "YYYY-MM"
function rentangBulan(bulan) {
  const [th, bl] = bulan.split('-').map(Number)
  // Hari ke-0 bulan berikutnya = hari terakhir bulan ini
  const hariTerakhir = new Date(th, bl, 0).getDate()
  return { dari: `${bulan}-01`, sampai: `${bulan}-${String(hariTerakhir).padStart(2, '0')}` }
}

// Mengubah "2026-11-23" menjadi "23 November 2026"
function tanggalPanjang(iso) {
  if (!iso) return ''
  const [th, bl, tg] = iso.split('-').map(Number)
  return new Date(th, bl - 1, tg).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Pilihan periode yang tersedia
const PILIHAN_PERIODE = [
  { kunci: 'hari', label: 'Hari Ini' },
  { kunci: 'bulan', label: 'Bulan Ini' },
  { kunci: 'pilih-bulan', label: 'Pilih Bulan' },
  { kunci: 'rentang', label: 'Rentang Tanggal' },
]

// Satu angka kecil berikon (bagian bawah kotak layanan)
function AngkaStatus({ ikon: Ikon, warna, nilai, judul }) {
  return (
    <span className={`inline-flex items-center gap-1 ${warna}`} title={judul}>
      <Ikon size={16} strokeWidth={2.5} />
      <span className="font-semibold">{nilai}</span>
    </span>
  )
}

// Kotak satu jenis layanan (meniru kartu di dasbor contoh)
function KotakLayanan({ data }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Bagian atas: angka besar + tag layanan */}
      <div className="px-4 pt-3 pb-3 flex-1">
        <div className="text-4xl font-light text-indigo-900 leading-tight">{data.total}</div>
        <span className="inline-block mt-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700 border border-sky-300 rounded">
          #{data.kode}
        </span>
        <div className="mt-1 text-xs text-gray-500">{data.nama_layanan}</div>
      </div>
      {/* Bagian bawah: rincian status (menunggu, diproses, selesai, batal) */}
      <div className="border-t border-gray-100 py-2 flex items-center justify-center gap-3 text-sm">
        <AngkaStatus ikon={Clock3} warna="text-red-500" nilai={data.menunggu} judul="Menunggu" />
        <AngkaStatus ikon={RefreshCw} warna="text-amber-500" nilai={data.diproses} judul="Sedang diproses" />
        <AngkaStatus ikon={CheckCircle2} warna="text-green-600" nilai={data.selesai} judul="Selesai" />
        {data.dibatalkan > 0 && (
          <AngkaStatus ikon={XCircle} warna="text-gray-400" nilai={data.dibatalkan} judul="Dibatalkan / tidak hadir (tidak dihitung)" />
        )}
      </div>
    </div>
  )
}

// Kartu ringkasan di bagian atas halaman
function KartuRingkasan({ label, nilai, warna }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${warna}`}>{nilai}</div>
    </div>
  )
}

// Mengubah hasil rekap menjadi file CSV (bisa dibuka di Excel) lalu mengunduhnya
function unduhCSV(rekap) {
  // Baris judul kolom
  const baris = [['Kode', 'Jenis Layanan', 'Total Permohonan', 'Menunggu', 'Diproses', 'Selesai', 'Dibatalkan', 'Online', 'Langsung']]
  // Satu baris per jenis layanan
  rekap.layanan.forEach((l) => {
    baris.push([`#${l.kode}`, l.nama_layanan, l.total, l.menunggu, l.diproses, l.selesai, l.dibatalkan, l.online, l.langsung])
  })
  // Baris jumlah keseluruhan
  const t = rekap.total
  baris.push(['', 'JUMLAH', t.total, t.menunggu, t.diproses, t.selesai, t.dibatalkan, '', ''])
  // Excel versi Indonesia memakai titik koma (;) sebagai pemisah kolom
  const isi = baris
    .map((b) => b.map((sel) => `"${String(sel).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')
  // Tanda BOM (kode FEFF) di awal file agar huruf terbaca benar di Excel
  const berkas = new Blob(['\uFEFF' + isi], { type: 'text/csv;charset=utf-8' })
  const tautan = document.createElement('a')
  tautan.href = URL.createObjectURL(berkas)
  tautan.download = `rekap-layanan_${rekap.dari}_sd_${rekap.sampai}.csv`
  tautan.click()
  URL.revokeObjectURL(tautan.href)
}

// Komponen utama halaman Rekap Layanan
export default function RekapLayanan() {
  const hariIni = hariIniWIB()
  const bulanIni = hariIni.slice(0, 7)

  // Periode yang dipilih petugas
  const [periode, setPeriode] = useState('hari')
  const [bulanDipilih, setBulanDipilih] = useState(bulanIni)
  const [dari, setDari] = useState(`${bulanIni}-01`)
  const [sampai, setSampai] = useState(hariIni)

  // Hasil rekap, status muat, dan pesan error
  const [rekap, setRekap] = useState(null)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')

  // Rentang tanggal yang dikirim ke Supabase sesuai pilihan periode
  const rentang = useMemo(() => {
    if (periode === 'hari') return { dari: hariIni, sampai: hariIni }
    if (periode === 'bulan') return rentangBulan(bulanIni)
    if (periode === 'pilih-bulan') return rentangBulan(bulanDipilih || bulanIni)
    return { dari, sampai }
  }, [periode, bulanDipilih, dari, sampai, hariIni, bulanIni])

  // Ambil rekap dari server
  const muat = useCallback(async () => {
    // Rentang tanggal belum lengkap: jangan kirim
    if (!rentang.dari || !rentang.sampai) return
    try {
      const res = await api.get(`/rekap-layanan/${rentang.dari}/${rentang.sampai}`)
      setRekap(res.data)
      setGalat('')
    } catch (err) {
      setGalat(pesanError(err, 'Gagal memuat rekap layanan.'))
    } finally {
      setMemuat(false)
    }
  }, [rentang])

  // Muat saat halaman dibuka / periode berubah, lalu ulangi setiap 30 detik
  // (hanya saat tab browser sedang dilihat)
  useEffect(() => {
    muat()
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') muat()
    }, JEDA_REFRESH)
    return () => clearInterval(t)
  }, [muat])

  // Teks periode yang sedang ditampilkan
  const teksPeriode = rekap
    ? rekap.dari === rekap.sampai
      ? tanggalPanjang(rekap.dari)
      : `${tanggalPanjang(rekap.dari)} s.d. ${tanggalPanjang(rekap.sampai)}`
    : ''

  return (
    <div className="space-y-5">
      {/* Judul halaman (pita biru seperti dasbor contoh) */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-400 to-sky-400 text-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <BarChart3 size={28} />
          <div>
            <h1 className="text-2xl font-semibold">Rekap Layanan</h1>
            <p className="text-sm opacity-90">Jumlah permohonan per jenis layanan (tag) — {teksPeriode || 'memuat...'}</p>
          </div>
        </div>
      </div>

      {/* Pilihan periode + tombol unduh */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {PILIHAN_PERIODE.map((p) => (
            <button
              key={p.kunci}
              onClick={() => { setPeriode(p.kunci); setMemuat(true) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                periode === p.kunci
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Pilih bulan tertentu, misalnya untuk laporan bulanan */}
        {periode === 'pilih-bulan' && (
          <label className="text-sm text-gray-600 flex flex-col">
            Bulan
            <input
              type="month"
              value={bulanDipilih}
              max={bulanIni}
              onChange={(e) => setBulanDipilih(e.target.value)}
              className="mt-1 border border-gray-300 rounded-lg px-2 py-1.5"
            />
          </label>
        )}

        {/* Pilih rentang tanggal bebas */}
        {periode === 'rentang' && (
          <>
            <label className="text-sm text-gray-600 flex flex-col">
              Dari tanggal
              <input type="date" value={dari} max={sampai || hariIni} onChange={(e) => setDari(e.target.value)}
                className="mt-1 border border-gray-300 rounded-lg px-2 py-1.5" />
            </label>
            <label className="text-sm text-gray-600 flex flex-col">
              Sampai tanggal
              <input type="date" value={sampai} min={dari} max={hariIni} onChange={(e) => setSampai(e.target.value)}
                className="mt-1 border border-gray-300 rounded-lg px-2 py-1.5" />
            </label>
          </>
        )}

        {/* Tombol unduh hasil rekap untuk laporan (dibuka dengan Excel) */}
        <button
          onClick={() => rekap && unduhCSV(rekap)}
          disabled={!rekap}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          <Download size={16} /> Unduh Excel (CSV)
        </button>
      </div>

      {/* Pesan jika gagal memuat */}
      <PesanGagal pesan={galat} onCobaLagi={muat} />

      {memuat && !rekap ? (
        // Tampilan saat pertama kali memuat
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
          <Loader2 className="animate-spin" size={20} /> Memuat rekap...
        </div>
      ) : rekap && (
        <>
          {/* Ringkasan keseluruhan */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KartuRingkasan label="Total permohonan" nilai={rekap.total.total} warna="text-indigo-900" />
            <KartuRingkasan label="Menunggu" nilai={rekap.total.menunggu} warna="text-red-500" />
            <KartuRingkasan label="Sedang diproses" nilai={rekap.total.diproses} warna="text-amber-500" />
            <KartuRingkasan label="Selesai" nilai={rekap.total.selesai} warna="text-green-600" />
            <KartuRingkasan label="Batal / tidak hadir" nilai={rekap.total.dibatalkan} warna="text-gray-500" />
          </div>

          {/* Kotak per jenis layanan (4 kolom di komputer, 2 di tablet, 1 di HP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {rekap.layanan.map((l) => <KotakLayanan key={l.id} data={l} />)}
          </div>

          {/* Keterangan ikon */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1"><Tag size={14} /> Angka besar = total permohonan (tanpa yang batal)</span>
            <span className="inline-flex items-center gap-1 text-red-500"><Clock3 size={14} /> Menunggu</span>
            <span className="inline-flex items-center gap-1 text-amber-500"><RefreshCw size={14} /> Sedang diproses</span>
            <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 size={14} /> Selesai</span>
            <span className="inline-flex items-center gap-1 text-gray-400"><XCircle size={14} /> Batal / tidak hadir</span>
          </div>
        </>
      )}
    </div>
  )
}
