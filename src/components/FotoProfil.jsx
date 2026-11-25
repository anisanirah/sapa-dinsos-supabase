// ========================================
// FILE: FotoProfil.jsx
// DESKRIPSI: Lingkaran foto profil (avatar). Jika akun belum punya foto
// atau foto gagal dimuat, yang tampil adalah huruf depan nama.
// Dipakai di TopBar, Sidebar, dan halaman Profil Saya.
// ========================================

// useState untuk mencatat foto gagal dimuat
import { useState, useEffect } from 'react'
// Fungsi pengubah lokasi file menjadi alamat gambar
import { urlFoto } from '../lib/fotoProfil'

// Props:
// - path      : lokasi foto di Storage (boleh kosong)
// - nama      : nama pengguna (untuk huruf depan)
// - ukuran    : diameter lingkaran dalam piksel (bawaan 40)
// - warna     : warna latar & huruf saat belum ada foto
// - className : kelas tambahan (misal bingkai / bayangan)
export default function FotoProfil({ path, nama, ukuran = 40, warna = 'bg-[#1976d2] text-white', className = '' }) {
  // true = gambar gagal dimuat -> tampilkan huruf depan
  const [gagal, setGagal] = useState(false)

  // Jika foto berganti, coba tampilkan lagi
  useEffect(() => setGagal(false), [path])

  const alamat = urlFoto(path)
  const huruf = (nama || 'U').trim().charAt(0).toUpperCase()

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${warna} font-bold select-none ${className}`}
      style={{ width: ukuran, height: ukuran, fontSize: Math.round(ukuran * 0.42) }}
      aria-label={`Foto profil ${nama || ''}`}
    >
      {alamat && !gagal ? (
        // Foto profil asli (terpotong rapi berbentuk lingkaran)
        <img src={alamat} alt="" className="w-full h-full object-cover" onError={() => setGagal(true)} />
      ) : (
        // Cadangan: huruf depan nama
        huruf
      )}
    </span>
  )
}
