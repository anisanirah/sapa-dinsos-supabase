// ========================================
// FILE: RekapLayanan.jsx
// DESKRIPSI: Halaman REKAP LAYANAN untuk petugas (permintaan Dinas Sosial).
// Meniru dasbor "Laporan Hastag": setiap jenis layanan tampil sebagai kartu berisi
// jumlah permohonan, kode/tag (misal #DTSEN), dan rincian status.
// Warna mengikuti tema SAPA DINSOS (biru dinsos) dan warna status yang sama dengan
// badge status di halaman lain:
//   kuning (amber) = menunggu (belum dipanggil)
//   ungu (violet)  = sedang diproses (dipanggil/dilayani)
//   hijau          = selesai
//   merah muda     = batal / tidak hadir (tidak dihitung dalam total)
// Periode bisa dipilih: hari ini, bulan ini, bulan tertentu, atau rentang tanggal.
// Tombol "Unduh PDF" membuat laporan resmi berkop surat (lihat lib/laporanPdf.js).
// Data diambil dari fungsi Supabase "rekap_layanan" (lihat supabase/05_rekap_layanan.sql).
// ========================================

// useState = simpan data; useCallback = simpan fungsi; useMemo = hitung ulang hanya bila perlu
import { useState, useCallback, useMemo, useEffect } from 'react'
// Ikon-ikon dari lucide-react
import {
  Clock3, RefreshCw, CheckCircle2, XCircle, BarChart3, FileDown, Loader2, Layers, Sparkles,
} from 'lucide-react'
// Klien API (penerjemah ke Supabase, lihat lib/api.js)
import api from '../lib/api'
// Fungsi bantu pesan error
import { pesanError } from '../lib/antrean'
// Kotak pesan gagal yang dipakai bersama dashboard petugas
import { PesanGagal } from './petugas/komponen'
// Data petugas yang login (namanya dicantumkan di laporan PDF)
import { useAuth } from '../context/AuthContext'
// Pembuat laporan PDF (kop surat, ringkasan, tabel, grafik, tanda tangan)
import { unduhLaporanPdf } from '../lib/laporanPdf'

// Data diperbarui otomatis setiap 30 detik (cukup untuk rekap)
const JEDA_REFRESH = 30000

// Warna setiap kelompok status (dipakai di semua bagian halaman agar seragam)
const WARNA = {
  menunggu: { teks: 'text-amber-600', latar: 'bg-amber-50', batang: 'bg-amber-400', ikon: Clock3, label: 'Menunggu' },
  diproses: { teks: 'text-violet-600', latar: 'bg-violet-50', batang: 'bg-violet-400', ikon: RefreshCw, label: 'Diproses' },
  selesai: { teks: 'text-emerald-600', latar: 'bg-emerald-50', batang: 'bg-emerald-500', ikon: CheckCircle2, label: 'Selesai' },
  dibatalkan: { teks: 'text-rose-500', latar: 'bg-rose-50', batang: 'bg-rose-300', ikon: XCircle, label: 'Batal' },
}

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

// Gaya kotak isian tanggal/bulan
const KELAS_INPUT = 'mt-1 rounded-xl border border-dinsos-100 bg-dinsos-50/50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-dinsos-300'

// Chip kecil berwarna untuk satu status (dipakai di kartu layanan)
function ChipStatus({ jenis, nilai }) {
  const w = WARNA[jenis]
  const Ikon = w.ikon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${w.latar} ${w.teks}`} title={w.label}>
      <Ikon size={13} strokeWidth={2.5} />
      {nilai}
    </span>
  )
}

// Batang kemajuan bertumpuk: porsi menunggu, diproses, dan selesai dari total
function BatangKemajuan({ data }) {
  // Tidak ada permohonan: tampilkan batang abu-abu kosong
  if (!data.total) return <div className="h-2 rounded-full bg-gray-100" />
  const bagian = ['selesai', 'diproses', 'menunggu']
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
      {bagian.map((k) => data[k] > 0 && (
        <div key={k} className={WARNA[k].batang} style={{ width: `${(data[k] / data.total) * 100}%` }} />
      ))}
    </div>
  )
}

// Kartu satu jenis layanan (meniru kotak di dasbor contoh, dengan gaya SAPA DINSOS)
function KartuLayanan({ data }) {
  // Persentase permohonan yang sudah selesai
  const persen = data.total ? Math.round((data.selesai / data.total) * 100) : 0
  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-dinsos-50 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-dinsos-200 hover:shadow-lg hover:shadow-dinsos-100">
      {/* Baris atas: tag layanan + persen selesai */}
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-dinsos-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-dinsos-700">
          #{data.kode}
        </span>
        {data.total > 0 && (
          <span className="text-xs font-semibold text-emerald-600">{persen}% selesai</span>
        )}
      </div>

      {/* Angka besar = total permohonan */}
      <div>
        <div className="text-4xl font-extrabold leading-none tracking-tight text-dinsos-900">{data.total}</div>
        <div className="mt-1 text-sm text-gray-500">{data.nama_layanan}</div>
      </div>

      {/* Batang kemajuan + chip status */}
      <BatangKemajuan data={data} />
      <div className="flex flex-wrap gap-1.5">
        <ChipStatus jenis="menunggu" nilai={data.menunggu} />
        <ChipStatus jenis="diproses" nilai={data.diproses} />
        <ChipStatus jenis="selesai" nilai={data.selesai} />
        {data.dibatalkan > 0 && <ChipStatus jenis="dibatalkan" nilai={data.dibatalkan} />}
      </div>
    </div>
  )
}

// Kartu ringkasan berikon di bagian atas halaman
function KartuRingkasan({ jenis, nilai }) {
  const w = WARNA[jenis]
  const Ikon = w.ikon
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dinsos-50 bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${w.latar} ${w.teks}`}>
        <Ikon size={22} strokeWidth={2.2} />
      </div>
      <div>
        <div className="text-xs font-medium text-gray-500">{jenis === 'dibatalkan' ? 'Batal / tidak hadir' : w.label}</div>
        <div className="text-2xl font-extrabold text-gray-900">{nilai}</div>
      </div>
    </div>
  )
}

// Komponen utama halaman Rekap Layanan
export default function RekapLayanan() {
  const { user } = useAuth()
  const hariIni = hariIniWIB()
  const bulanIni = hariIni.slice(0, 7)

  // Periode yang dipilih petugas
  const [periode, setPeriode] = useState('hari')
  const [bulanDipilih, setBulanDipilih] = useState(bulanIni)
  const [dari, setDari] = useState(`${bulanIni}-01`)
  const [sampai, setSampai] = useState(hariIni)

  // Hasil rekap, status muat, waktu pembaruan terakhir, dan pesan error
  const [rekap, setRekap] = useState(null)
  const [memuat, setMemuat] = useState(true)
  const [diperbarui, setDiperbarui] = useState(null)
  const [galat, setGalat] = useState('')
  // true saat file PDF sedang disiapkan (tombol dinonaktifkan sementara)
  const [membuatPdf, setMembuatPdf] = useState(false)

  // Membuat & mengunduh laporan PDF dari rekap yang sedang tampil
  const unduhPdf = async () => {
    if (!rekap) return
    setMembuatPdf(true)
    try {
      await unduhLaporanPdf(rekap, periode, user?.profile?.nama || user?.name)
    } catch {
      setGalat('Gagal membuat file PDF. Silakan coba lagi.')
    } finally {
      setMembuatPdf(false)
    }
  }

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
      setDiperbarui(new Date())
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
      : `${tanggalPanjang(rekap.dari)} – ${tanggalPanjang(rekap.sampai)}`
    : 'Memuat...'

  // Persentase selesai secara keseluruhan
  const persenSelesai = rekap?.total.total ? Math.round((rekap.total.selesai / rekap.total.total) * 100) : 0

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      {/* ===== Banner judul (gradasi biru dinsos, sama seperti banner dashboard petugas) ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dinsos-700 via-dinsos-600 to-dinsos-400 p-6 text-white shadow-lg shadow-dinsos-200 md:p-8">
        {/* Hiasan lingkaran samar di latar belakang */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-sky-300/20 blur-2xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            {/* Lencana "Live": data diperbarui otomatis */}
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Live · diperbarui tiap 30 detik
            </span>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              <BarChart3 size={34} strokeWidth={2.4} /> Rekap Layanan
            </h1>
            <p className="mt-1 text-sm text-white/85 md:text-base">Jumlah permohonan per jenis layanan · {teksPeriode}</p>
          </div>

          {/* Angka total besar di sisi kanan banner */}
          <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur md:text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/80">Total permohonan</div>
            <div className="text-5xl font-black leading-tight">{rekap ? rekap.total.total : '–'}</div>
            <div className="text-xs text-white/80">{persenSelesai}% sudah selesai</div>
          </div>
        </div>
      </div>

      {/* ===== Pilihan periode + tombol unduh ===== */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-dinsos-50 bg-white p-3 shadow-sm">
        {/* Tombol periode berbentuk "segmented control" */}
        <div className="flex flex-wrap gap-1 rounded-2xl bg-dinsos-50 p-1">
          {PILIHAN_PERIODE.map((p) => (
            <button
              key={p.kunci}
              onClick={() => { setPeriode(p.kunci); setMemuat(true) }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                periode === p.kunci
                  ? 'bg-dinsos-700 text-white shadow-md shadow-dinsos-200'
                  : 'text-dinsos-800 hover:bg-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Pilih bulan tertentu, misalnya untuk laporan bulanan */}
        {periode === 'pilih-bulan' && (
          <label className="flex flex-col text-xs font-semibold text-gray-500">
            Bulan
            <input type="month" value={bulanDipilih} max={bulanIni} onChange={(e) => setBulanDipilih(e.target.value)} className={KELAS_INPUT} />
          </label>
        )}

        {/* Pilih rentang tanggal bebas */}
        {periode === 'rentang' && (
          <>
            <label className="flex flex-col text-xs font-semibold text-gray-500">
              Dari tanggal
              <input type="date" value={dari} max={sampai || hariIni} onChange={(e) => setDari(e.target.value)} className={KELAS_INPUT} />
            </label>
            <label className="flex flex-col text-xs font-semibold text-gray-500">
              Sampai tanggal
              <input type="date" value={sampai} min={dari} max={hariIni} onChange={(e) => setSampai(e.target.value)} className={KELAS_INPUT} />
            </label>
          </>
        )}

        {/* Info pembaruan terakhir + tombol unduh laporan PDF */}
        <div className="ml-auto flex items-center gap-3">
          {diperbarui && (
            <span className="hidden text-xs text-gray-400 lg:inline">
              Diperbarui {diperbarui.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          {/* Unduh laporan PDF resmi (kop surat Dinas Sosial) untuk periode yang dipilih */}
          <button
            onClick={unduhPdf}
            disabled={!rekap || membuatPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-dinsos-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-dinsos-200 transition hover:bg-dinsos-800 disabled:opacity-50"
          >
            {membuatPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {membuatPdf ? 'Menyiapkan PDF...' : 'Unduh PDF'}
          </button>
        </div>
      </div>

      {/* Pesan jika gagal memuat */}
      <PesanGagal pesan={galat} onCobaLagi={muat} />

      {memuat && !rekap ? (
        // Tampilan saat pertama kali memuat
        <div className="flex items-center justify-center gap-2 py-16 text-dinsos-700">
          <Loader2 className="animate-spin" size={20} /> Memuat rekap...
        </div>
      ) : rekap && (
        <>
          {/* ===== Ringkasan per status ===== */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KartuRingkasan jenis="menunggu" nilai={rekap.total.menunggu} />
            <KartuRingkasan jenis="diproses" nilai={rekap.total.diproses} />
            <KartuRingkasan jenis="selesai" nilai={rekap.total.selesai} />
            <KartuRingkasan jenis="dibatalkan" nilai={rekap.total.dibatalkan} />
          </div>

          {/* Pesan ramah jika belum ada permohonan sama sekali */}
          {rekap.total.total === 0 && rekap.total.dibatalkan === 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-dinsos-200 bg-dinsos-50/60 px-5 py-4 text-sm text-dinsos-800">
              <Sparkles size={20} className="shrink-0" />
              Belum ada permohonan pada periode ini. Kartu di bawah akan terisi otomatis begitu ada antrean baru.
            </div>
          )}

          {/* ===== Judul daftar layanan ===== */}
          <div className="flex items-center gap-2 pt-1 text-sm font-bold uppercase tracking-wider text-dinsos-900">
            <Layers size={16} /> Per jenis layanan
          </div>

          {/* Kartu per jenis layanan (4 kolom di komputer, 2 di tablet, 1 di HP) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rekap.layanan.map((l) => <KartuLayanan key={l.id} data={l} />)}
          </div>

          {/* Keterangan warna */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="font-semibold">Keterangan:</span>
            {Object.keys(WARNA).map((k) => {
              const Ikon = WARNA[k].ikon
              return (
                <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${WARNA[k].latar} ${WARNA[k].teks}`}>
                  <Ikon size={12} strokeWidth={2.5} /> {k === 'dibatalkan' ? 'Batal / tidak hadir (tidak dihitung)' : WARNA[k].label}
                </span>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
