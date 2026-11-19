// ========================================
// FILE: TiketAntrean.jsx
// DESKRIPSI: Jendela (modal) "Bukti Pendaftaran Antrean" yang muncul
// setelah pengunjung berhasil mengambil nomor antrean online.
// Bentuknya dibuat seperti tiket: bagian atas berisi nomor antrean,
// garis sobekan, lalu QR Code (dengan logo DINSOS di tengah) dan rincian data.
// ========================================

// Ikon-ikon dari lucide-react
import { CheckCircle2, X, Info, Printer, Ticket } from 'lucide-react'
// Fungsi bantu format tanggal, jam, label status, dan alamat singkat
import { formatTanggal, formatJam, labelStatus, alamatSingkat } from '../lib/antrean'
// QR Code dengan logo DINSOS di tengah
import QrDinsos from './QrDinsos'
// Isi tiket yang dicetak printer / disimpan PDF (hanya tampil saat print)
import TiketCetak from './TiketCetak'

// Props:
// - antrean       : data antrean dari backend (nomor_antrean, kode_barcode, layanan, dll.)
// - onTutup       : fungsi saat tombol tutup (X) / area gelap diklik
// - onLihatStatus : fungsi saat tombol "Lihat Status" diklik
export default function TiketAntrean({ antrean, onTutup, onLihatStatus }) {
  // Jika belum ada data antrean, jangan tampilkan apa pun
  if (!antrean) return null

  // Membuka dialog print browser (bisa dicetak atau disimpan sebagai PDF)
  const cetak = () => window.print()

  // Label jenis pendaftaran untuk badge kecil
  const jenis = antrean.jenis_pendaftaran === 'langsung' ? 'Antrean Langsung' : 'Antrean Online'

  // Rincian data pengunjung yang ditampilkan dalam kotak abu-abu: [label, nilai]
  const rincian = [
    ['Nama', antrean.nama_pengunjung || '-'],
    ['Alamat', alamatSingkat(antrean) || '-'],
    ['Tanggal', `${formatTanggal(antrean.tanggal || antrean.created_at)}, ${formatJam(antrean.created_at)} WIB`],
    ['Status', labelStatus(antrean.status)],
  ]

  return (
    // Latar gelap di belakang tiket; klik di luar tiket = tutup
    <div
      className="fixed inset-0 z-[1100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onTutup}
    >
      {/* Kartu tiket. stopPropagation agar klik di dalam kartu tidak menutup modal */}
      <div
        className="w-full max-w-[420px] max-h-[94vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== 1. KEPALA TIKET ===== */}
        <div className="relative bg-gradient-to-br from-[#0d47a1] via-[#1565c0] to-[#1e88e5] px-6 pt-5 pb-14 text-white rounded-t-3xl">
          {/* Tombol tutup di pojok kanan atas */}
          <button
            onClick={onTutup}
            className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-white/20"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>

          {/* Logo + nama instansi */}
          <div className="flex items-center gap-3">
            {/* Logo di dalam lingkaran putih */}
            <div className="h-12 w-12 flex-shrink-0 rounded-full bg-white p-1 shadow">
              <img src="/images/logo-dinsos.png" alt="Logo DINSOS" className="h-full w-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-wide">SAPA DINSOS</p>
              <p className="text-[11px] uppercase tracking-[0.15em] text-blue-100">Dinas Sosial Kab. Majalengka</p>
            </div>
          </div>

          {/* Judul tiket + tanda berhasil */}
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-50">
            <CheckCircle2 size={18} className="text-green-300" />
            <span>Bukti pendaftaran antrean berhasil dibuat</span>
          </div>
        </div>

        {/* ===== 2. KOTAK NOMOR ANTREAN (menumpuk ke atas kepala tiket) ===== */}
        <div className="-mt-10 mx-5 rounded-2xl bg-white shadow-lg ring-1 ring-slate-100 px-5 py-4 text-center relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Nomor Antrean</p>
          {/* Nomor antrean besar */}
          <p className="text-6xl font-black tracking-tight text-[#1565c0] leading-none my-1">{antrean.nomor_antrean}</p>
          {/* Nama layanan */}
          <p className="font-semibold text-slate-800">{antrean.layanan?.nama_layanan}</p>
          {/* Badge jenis pendaftaran */}
          <span className="mt-2 inline-block rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-[#1565c0] ring-1 ring-blue-100">
            {jenis}
          </span>
        </div>

        {/* ===== 3. GARIS SOBEKAN TIKET (lingkaran di kiri-kanan + garis putus-putus) ===== */}
        <div className="relative my-5 flex items-center">
          {/* Setengah lingkaran kiri (warna sama dengan latar gelap) */}
          <span className="absolute -left-3 h-6 w-6 rounded-full bg-slate-700/70" />
          {/* Garis putus-putus */}
          <span className="mx-5 w-full border-t-2 border-dashed border-slate-200" />
          {/* Setengah lingkaran kanan */}
          <span className="absolute -right-3 h-6 w-6 rounded-full bg-slate-700/70" />
        </div>

        {/* ===== 4. QR CODE + RINCIAN ===== */}
        <div className="px-6 pb-6 space-y-5">
          {/* QR Code dengan logo DINSOS di tengah */}
          <div className="text-center">
            <div className="mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <QrDinsos nilai={antrean.kode_barcode} ukuran={190} />
            </div>
            {/* Kode ditampilkan sebagai teks (cadangan jika QR tidak terbaca) */}
            <p className="mt-2 font-mono text-[11px] tracking-wider text-slate-400 break-all">{antrean.kode_barcode}</p>
            <p className="text-sm font-medium text-slate-600">Tunjukkan QR Code ini di meja pendaftaran</p>
          </div>

          {/* Rincian data pengunjung (2 kolom) */}
          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
            {rincian.map(([label, nilai]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
                {/* Status diberi warna oranye agar menonjol */}
                <dd className={`font-semibold ${label === 'Status' ? 'text-amber-600' : 'text-slate-800'}`}>{nilai}</dd>
              </div>
            ))}
          </dl>

          {/* Informasi penting (kotak kuning) */}
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <Info size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <p>
              Datang ke kantor Dinas Sosial <strong>hari ini</strong> dan bawa dokumen persyaratan.
              Antrean aktif setelah QR Code di-scan petugas. Jika tidak datang, antrean otomatis dibatalkan.
            </p>
          </div>

          {/* Tombol aksi (berdampingan) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cetak / simpan PDF */}
            <button
              onClick={cetak}
              className="rounded-xl border-2 border-[#1976d2] py-3 text-sm font-semibold text-[#1976d2] hover:bg-blue-50 inline-flex items-center justify-center gap-2"
            >
              <Printer size={18} /> Cetak / PDF
            </button>
            {/* Menuju halaman Antrean Saya */}
            <button
              onClick={onLihatStatus}
              className="rounded-xl bg-[#1976d2] py-3 text-sm font-semibold text-white hover:bg-[#1565c0] inline-flex items-center justify-center gap-2 shadow-md shadow-blue-600/30"
            >
              <Ticket size={18} /> Lihat Status
            </button>
          </div>
        </div>
      </div>

      {/* Versi cetak / PDF (tersembunyi di layar) */}
      <TiketCetak antrean={antrean} />
    </div>
  )
}
