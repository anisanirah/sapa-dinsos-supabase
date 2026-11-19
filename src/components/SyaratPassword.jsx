// ========================================
// FILE: SyaratPassword.jsx
// DESKRIPSI: Daftar "Persyaratan kata sandi" yang dicentang otomatis saat pengguna mengetik.
// Dipakai di: halaman Daftar Akun, Ubah Kata Sandi, dan Atur Ulang Kata Sandi.
// Syarat WAJIB sama dengan backend (AuthController::SYARAT_PASSWORD).
// ========================================

// Ikon centang & lingkaran dari lucide-react
import { CheckCircle2, Circle } from 'lucide-react'

// Daftar syarat: [teks, fungsi pengecek, wajib?]
const DAFTAR_SYARAT = [
  ['Minimal 8 karakter', (p) => p.length >= 8, true],
  ['Mengandung huruf besar (A-Z)', (p) => /[A-Z]/.test(p), true],
  ['Mengandung huruf kecil (a-z)', (p) => /[a-z]/.test(p), true],
  ['Mengandung angka (0-9)', (p) => /[0-9]/.test(p), true],
  ['Mengandung karakter khusus (!@#$%)', (p) => /[^A-Za-z0-9]/.test(p), false],
]

// Mengecek apakah semua syarat WAJIB sudah terpenuhi (dipakai untuk mengaktifkan tombol)
// eslint-disable-next-line react-refresh/only-export-components
export function passwordMemenuhiSyarat(password = '') {
  return DAFTAR_SYARAT.every(([, cek, wajib]) => !wajib || cek(password))
}

// Props:
// - password   : kata sandi yang sedang diketik
// - konfirmasi : (opsional) isi kolom "ulangi kata sandi", untuk menampilkan cocok/tidak
export default function SyaratPassword({ password = '', konfirmasi }) {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-sm font-semibold text-slate-700">Persyaratan kata sandi:</p>
      <ul className="space-y-1.5">
        {DAFTAR_SYARAT.map(([teks, cek, wajib]) => {
          // terpenuhi = true jika syarat ini sudah dipenuhi
          const terpenuhi = cek(password)
          return (
            <li key={teks} className={`flex items-center gap-2 text-sm transition-colors ${terpenuhi ? 'text-green-600' : 'text-slate-500'}`}>
              {/* Centang hijau jika terpenuhi, lingkaran abu-abu jika belum */}
              {terpenuhi ? (
                <CheckCircle2 size={18} className="flex-shrink-0 text-green-500" />
              ) : (
                <Circle size={18} className="flex-shrink-0 text-slate-300" />
              )}
              <span>
                {teks}
                {/* Syarat yang tidak wajib diberi keterangan */}
                {!wajib && <span className="ml-1 text-xs text-slate-400">(disarankan)</span>}
              </span>
            </li>
          )
        })}

        {/* Baris tambahan: apakah kolom konfirmasi sama dengan kata sandi */}
        {konfirmasi !== undefined && konfirmasi !== '' && (
          <li className={`flex items-center gap-2 text-sm ${konfirmasi === password ? 'text-green-600' : 'text-red-500'}`}>
            {konfirmasi === password ? (
              <CheckCircle2 size={18} className="flex-shrink-0 text-green-500" />
            ) : (
              <Circle size={18} className="flex-shrink-0 text-red-300" />
            )}
            <span>{konfirmasi === password ? 'Konfirmasi kata sandi cocok' : 'Konfirmasi kata sandi belum sama'}</span>
          </li>
        )}
      </ul>
    </div>
  )
}
