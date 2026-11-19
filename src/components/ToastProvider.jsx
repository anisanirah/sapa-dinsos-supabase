// ========================================
// FILE: ToastProvider.jsx
// DESKRIPSI: Sistem notifikasi (toast) yang dipakai di seluruh aplikasi,
// pengganti alert() bawaan browser.
// Pemakaian di komponen mana pun:
//   const toast = useToast()
//   toast.success('Pesan', 'Judul (opsional)')
//   toast.error('Pesan')
//   toast.info('Pesan')
// ========================================

// Hook dan fungsi React yang dibutuhkan
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
// Ikon notifikasi
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

// Lama notifikasi tampil sebelum hilang otomatis (milidetik)
const DURASI_TOAST = 5000
// Jumlah notifikasi maksimum yang tampil bersamaan
const MAKS_TOAST = 3

// Tampilan setiap jenis notifikasi (warna garis, warna ikon, ikon, judul bawaan)
const GAYA = {
  success: { garis: 'border-l-green-500', ikon: 'text-green-600', Ikon: CheckCircle2, judul: 'Berhasil' },
  error: { garis: 'border-l-red-500', ikon: 'text-red-600', Ikon: AlertCircle, judul: 'Gagal' },
  info: { garis: 'border-l-blue-500', ikon: 'text-blue-600', Ikon: Info, judul: 'Informasi' },
}

// Wadah (context) untuk membagikan fungsi toast ke seluruh komponen
const ToastContext = createContext(null)

// Penyedia notifikasi: dipasang sekali di main.jsx
export function ToastProvider({ children }) {
  // Daftar notifikasi yang sedang tampil
  const [daftarToast, setDaftarToast] = useState([])

  // Menghapus satu notifikasi berdasarkan id
  const hapus = useCallback((id) => {
    setDaftarToast((daftar) => daftar.filter((t) => t.id !== id))
  }, [])

  // Menampilkan notifikasi baru lalu menghapusnya otomatis setelah beberapa detik
  const tampil = useCallback(
    (tipe, pesan, judul) => {
      const id = `${Date.now()}-${Math.random()}`
      setDaftarToast((daftar) => [...daftar.slice(-(MAKS_TOAST - 1)), { id, tipe, pesan, judul }])
      setTimeout(() => hapus(id), DURASI_TOAST)
    },
    [hapus]
  )

  // Fungsi yang dibagikan ke komponen lain
  const nilai = useMemo(
    () => ({
      success: (pesan, judul) => tampil('success', pesan, judul),
      error: (pesan, judul) => tampil('error', pesan, judul),
      info: (pesan, judul) => tampil('info', pesan, judul),
    }),
    [tampil]
  )

  return (
    <ToastContext.Provider value={nilai}>
      {children}

      {/* Wadah notifikasi di pojok kanan atas; aria-live agar dibacakan pembaca layar */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
      >
        {daftarToast.map((t) => {
          const gaya = GAYA[t.tipe]
          const Ikon = gaya.Ikon
          return (
            <div
              key={t.id}
              role={t.tipe === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-lg ${gaya.garis}`}
            >
              <Ikon className={`mt-0.5 h-5 w-5 shrink-0 ${gaya.ikon}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{t.judul || gaya.judul}</p>
                <p className="mt-0.5 text-sm text-slate-600">{t.pesan}</p>
              </div>
              {/* Tombol tutup */}
              <button
                type="button"
                onClick={() => hapus(t.id)}
                aria-label="Tutup notifikasi"
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// Hook untuk memakai toast di komponen
export function useToast() {
  const konteks = useContext(ToastContext)
  if (!konteks) {
    throw new Error('useToast harus dipakai di dalam ToastProvider')
  }
  return konteks
}
