// ========================================
// FILE: KartuPublik.jsx
// DESKRIPSI: Kerangka halaman publik (tanpa sidebar): header logo DINSOS + kartu di tengah.
// Dipakai oleh halaman Lupa Password, Reset Password, dan Verifikasi Email.
// ========================================
// Link = pindah halaman tanpa memuat ulang browser
import { Link } from 'react-router-dom'

// Props: ikon, judul, deskripsi, dan isi (children)
export default function KartuPublik({ ikon, judul, deskripsi, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header logo */}
      {/* Bagian atas: logo DINSOS (klik = ke halaman login) */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <Link to="/login" className="flex items-center gap-3">
          <img
            src="/images/logo-dinsos.png"
            alt="Logo DINSOS"
            className="h-10 w-auto"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-[#1976d2] tracking-wide">SAPA DINSOS</span>
            <span className="text-xs text-gray-500 tracking-wide">DINAS SOSIAL KABUPATEN MAJALENGKA</span>
          </div>
        </Link>
      </header>

      {/* Kartu di tengah layar */}
      {/* Kartu putih di tengah layar */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8 sm:p-10">
          {ikon && (
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-[#1976d2]">
                {ikon}
              </div>
            </div>
          )}
          {/* Judul & deskripsi kartu */}
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">{judul}</h2>
          {deskripsi && <p className="text-center text-gray-500 mb-6">{deskripsi}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}

// Kelas input yang seragam dengan halaman Login/Register
export const kelasInput =
  'w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] outline-none transition-all bg-gray-50 focus:bg-white'

// Kelas tombol utama biru
export const kelasTombol =
  'w-full bg-[#1976d2] hover:bg-[#1565c0] text-white py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50'
