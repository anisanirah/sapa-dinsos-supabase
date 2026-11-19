// ========================================
// FILE: petugas/komponen.jsx
// DESKRIPSI: Komponen kecil yang dipakai bersama oleh Dashboard Pendaftaran & Dashboard Pelayanan.
// ========================================
// useEffect = jalankan kode berkala; useRef = simpan nilai tanpa render ulang; useState = simpan data
import { useEffect, useRef, useState } from 'react'
// Ikon tangan melambai
import { Hand } from 'lucide-react'
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
    <div className="welcome-banner">
      <div className="banner-left">
        <div className="banner-date">
          {waktu.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <h2 className="banner-greeting">
          {sapaan}, {nama} <Hand size={28} className="wave-emoji" />
        </h2>
        <p className="banner-subtitle">{subjudul}</p>
      </div>
      <div className="banner-right">
        <div className="banner-time">{waktu.toLocaleTimeString('id-ID', { hour12: false })}</div>
        <div className="banner-timezone">WIB</div>
      </div>
    </div>
  )
}

// Kartu angka statistik
export function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

// Badge status berwarna
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
