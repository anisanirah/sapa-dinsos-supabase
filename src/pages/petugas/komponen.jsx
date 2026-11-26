// ========================================
// FILE: petugas/komponen.jsx
// DESKRIPSI: Komponen kecil yang dipakai bersama oleh Dashboard Pendaftaran & Dashboard Pelayanan.
// ========================================
// useEffect = jalankan kode berkala; useRef = simpan nilai tanpa render ulang; useState = simpan data
import { useEffect, useRef, useState } from 'react'
// Ikon tangan melambai
import { Hand, CalendarDays, Clock } from 'lucide-react'
// Warna & label status antrean
import { WARNA_STATUS, labelStatus } from '../../lib/antrean'

// Banner sapaan + jam berjalan
export function BannerSapaan({ nama, subjudul }) {
  // Jam berjalan: diperbarui setiap 1 detik
  const [waktu, setWaktu] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setWaktu(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Pilih sapaan sesuai jam
  const jam = waktu.getHours()
  const sapaan = jam < 11 ? 'Selamat Pagi' : jam < 15 ? 'Selamat Siang' : jam < 18 ? 'Selamat Sore' : 'Selamat Malam'

  return (
    // Banner biru bergradasi dengan hiasan gelombang di bagian bawah
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d5bc4] to-[#3d8fe6] text-white shadow-md">
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 45 C 150 10, 300 60, 450 30 C 520 15, 570 25, 600 20 L 600 60 L 0 60 Z" fill="#ffffff" opacity="0.10" />
      </svg>
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 px-6 sm:px-8 py-6">
        {/* Kiri: tanggal, sapaan, keterangan */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-blue-50">
            <CalendarDays size={18} />
            {waktu.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold flex items-center gap-2 flex-wrap">
            {sapaan}, {nama} <Hand size={30} />
          </h2>
          <p className="mt-1 text-blue-50">{subjudul}</p>
        </div>
        {/* Garis pemisah tegak */}
        <span className="hidden sm:block w-px self-stretch bg-white/40" aria-hidden="true" />
        {/* Kanan: jam berjalan */}
        <div className="sm:pl-6 text-left sm:text-right">
          <div className="flex items-center sm:justify-end gap-3">
            <Clock size={34} strokeWidth={2} />
            <span className="text-4xl sm:text-5xl font-extrabold tabular-nums">{waktu.toLocaleTimeString('id-ID', { hour12: false })}</span>
          </div>
          <div className="text-sm text-blue-50 mt-1">WIB</div>
        </div>
      </div>
    </div>
  )
}

// Warna kartu statistik: latar kartu, bingkai, dan kotak ikon
const WARNA_KARTU = {
  blue: { kartu: 'bg-white border-blue-100', ikon: 'bg-blue-50 text-blue-600' },
  orange: { kartu: 'bg-amber-50/60 border-amber-100', ikon: 'bg-amber-100 text-amber-600' },
  green: { kartu: 'bg-green-50/60 border-green-100', ikon: 'bg-green-100 text-green-600' },
  red: { kartu: 'bg-rose-50/60 border-rose-100', ikon: 'bg-rose-100 text-rose-500' },
}

export function StatCard({ icon, label, value, sub, color }) {
  const w = WARNA_KARTU[color] || WARNA_KARTU.blue
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${w.kartu}`}>
      {/* Kotak ikon bulat berwarna */}
      <div className={`flex w-16 h-16 flex-shrink-0 items-center justify-center rounded-full ${w.ikon}`}>{icon}</div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-700">{label}</div>
        <div className="text-3xl font-extrabold text-[#0f1e33] leading-tight">{value}</div>
        {sub && <div className="text-sm text-slate-500">{sub}</div>}
      </div>
    </div>
  )
}

export function BadgeStatus({ status }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${WARNA_STATUS[status] || 'bg-gray-100 text-gray-700'}`}>
      {labelStatus(status)}
    </span>
  )
}

// Badge jenis pendaftaran
export function BadgeJenis({ jenis }) {
  return jenis === 'langsung' ? (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">Langsung</span>
  ) : (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">Online</span>
  )
}

// Kotak pesan error kuning (koneksi putus dsb.)
export function PesanGagal({ pesan, onCobaLagi }) {
  if (!pesan) return null
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
      <p className="text-yellow-800 text-sm flex-1">{pesan}</p>
      {onCobaLagi && (
        <button onClick={onCobaLagi} className="text-yellow-700 text-sm font-medium hover:text-yellow-900">Coba Lagi</button>
      )}
    </div>
  )
}

// Menjalankan fungsi berulang setiap "jeda" milidetik (berhenti saat tab tidak terlihat)
export function usePolling(fungsi, jeda) {
  // Simpan fungsi terbaru agar interval selalu memanggil versi terbaru
  const simpan = useRef(fungsi)
  simpan.current = fungsi
  useEffect(() => {
    simpan.current()
    // Ulangi setiap 'jeda' milidetik, hanya saat tab browser sedang dilihat
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') simpan.current()
    }, jeda)
    // Saat tab dibuka lagi, langsung muat data terbaru
    const saatTerlihat = () => document.visibilityState === 'visible' && simpan.current()
    document.addEventListener('visibilitychange', saatTerlihat)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', saatTerlihat)
    }
  }, [jeda])
}

// Bunyi "ting" pendek (tanpa file audio) untuk memberi tahu ada antrean baru
export function bunyiTing() {
  try {
    // Buat bunyi nada 880 Hz selama 0,6 detik memakai Web Audio API
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // Browser tidak mendukung suara: abaikan
  }
}

// Tiket cetak sekarang ada di components/TiketCetak.jsx (dipakai bersama pengunjung & petugas).
// Diekspor ulang dari sini agar import lama di dashboard petugas tetap berjalan.
export { default as TiketCetak } from '../../components/TiketCetak'
