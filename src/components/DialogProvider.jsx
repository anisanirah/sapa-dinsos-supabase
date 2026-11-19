// ========================================
// FILE: DialogProvider.jsx
// DESKRIPSI: Jendela konfirmasi buatan sendiri, pengganti confirm() dan prompt() bawaan browser
// yang tampilannya polos dan tidak bisa diubah.
//
// Cara pakai di halaman mana saja:
//   const tanya = useDialog()
//   const ok = await tanya({ judul: 'Batalkan antrean?', pesan: '...', varian: 'bahaya' })
//   if (!ok) return               // pengguna menekan "Batal"
//
// Dengan kolom alasan (pengganti prompt()):
//   const hasil = await tanya({ ..., input: { label: 'Alasan', pilihanCepat: ['...'] } })
//   if (!hasil) return
//   console.log(hasil.alasan)
// ========================================

// Fungsi React untuk context, state, ref, dan efek
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
// Ikon-ikon dari lucide-react
import { AlertTriangle, HelpCircle, Info, Trash2, UserX, XCircle } from 'lucide-react'

// Wadah context agar fungsi tanya() bisa dipakai di seluruh aplikasi
const DialogContext = createContext(null)

// Warna & ikon untuk setiap jenis (varian) dialog
const VARIAN = {
  // Tindakan berbahaya / tidak bisa dibatalkan (misal: membatalkan antrean)
  bahaya: {
    ikon: Trash2,
    lingkaran: 'bg-red-100 text-red-600 ring-red-50',
    tombol: 'bg-red-600 hover:bg-red-700 focus:ring-red-300 shadow-red-600/30',
  },
  // Peringatan (misal: menandai pengunjung tidak hadir)
  peringatan: {
    ikon: AlertTriangle,
    lingkaran: 'bg-amber-100 text-amber-600 ring-amber-50',
    tombol: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 shadow-amber-500/30',
  },
  // Informasi / pertanyaan biasa
  info: {
    ikon: HelpCircle,
    lingkaran: 'bg-blue-100 text-[#1976d2] ring-blue-50',
    tombol: 'bg-[#1976d2] hover:bg-[#1565c0] focus:ring-blue-300 shadow-blue-600/30',
  },
}

// Ikon tambahan yang bisa dipilih lewat opsi "ikon"
const IKON_LAIN = { batal: XCircle, tidakHadir: UserX, info: Info }

// Penyedia dialog: dipasang SEKALI di main.jsx, membungkus seluruh aplikasi
export function DialogProvider({ children }) {
  // Opsi dialog yang sedang tampil (null = tidak ada dialog)
  const [opsi, setOpsi] = useState(null)
  // Isi kolom alasan (jika dialog memakai input)
  const [alasan, setAlasan] = useState('')
  // Menyimpan fungsi "resolve" dari Promise agar bisa dijawab saat tombol diklik
  const penjawab = useRef(null)

  // tanya(opsi) -> menampilkan dialog dan MENUNGGU jawaban pengguna (Promise)
  const tanya = useCallback((opsiBaru) => {
    setAlasan(opsiBaru.input?.nilaiAwal || '')
    setOpsi(opsiBaru)
    return new Promise((resolve) => {
      penjawab.current = resolve
    })
  }, [])

  // Menutup dialog dan mengirim jawaban ke halaman yang bertanya
  const jawab = useCallback((nilai) => {
    penjawab.current?.(nilai)
    penjawab.current = null
    setOpsi(null)
  }, [])

  // Tombol "Ya": jika ada kolom alasan, kirim { alasan }, jika tidak kirim true
  const setuju = () => jawab(opsi?.input ? { alasan: alasan.trim() } : true)
  // Tombol "Batal", tombol Esc, atau klik area gelap: kirim false
  const tolak = () => jawab(false)

  // Keyboard: Esc = batal, Enter = setuju (kecuali sedang mengetik di kolom alasan)
  useEffect(() => {
    if (!opsi) return
    const tekan = (e) => {
      if (e.key === 'Escape') tolak()
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setuju()
      }
    }
    window.addEventListener('keydown', tekan)
    return () => window.removeEventListener('keydown', tekan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opsi, alasan])

  // Pilih gaya sesuai varian (bawaan: info)
  const gaya = VARIAN[opsi?.varian] || VARIAN.info
  // Ikon: dari opsi.ikon jika ada, jika tidak pakai ikon varian
  const Ikon = IKON_LAIN[opsi?.ikon] || gaya.ikon

  return (
    <DialogContext.Provider value={tanya}>
      {children}

      {/* ===== JENDELA DIALOG (hanya tampil jika ada opsi) ===== */}
      {opsi && (
        // Latar gelap + blur; klik di luar kartu = batal
        <div
          className="dialog-latar fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={tolak}
          role="dialog"
          aria-modal="true"
        >
          {/* Kartu dialog (animasi muncul membesar sedikit) */}
          <div
            className="dialog-kartu w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ikon bulat berwarna */}
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ring-8 ${gaya.lingkaran}`}>
              <Ikon size={30} strokeWidth={2.2} />
            </div>

            {/* Judul & pesan */}
            <h3 className="mt-5 text-xl font-bold text-slate-800">{opsi.judul}</h3>
            {opsi.pesan && <p className="mt-2 text-sm leading-relaxed text-slate-500">{opsi.pesan}</p>}

            {/* Kartu kecil antrean (opsional): nomor besar + nama + keterangan */}
            {opsi.antrean && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left">
                <span className="rounded-xl bg-[#1565c0] px-3 py-2 text-lg font-black text-white">
                  {opsi.antrean.nomor}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{opsi.antrean.nama}</p>
                  {opsi.antrean.keterangan && (
                    <p className="truncate text-xs text-slate-500">{opsi.antrean.keterangan}</p>
                  )}
                </div>
              </div>
            )}

            {/* Kolom alasan (opsional, pengganti prompt()) */}
            {opsi.input && (
              <div className="mt-4 text-left">
                <label className="mb-1 block text-sm font-medium text-slate-700">{opsi.input.label}</label>
                {/* Tombol alasan cepat: sekali klik langsung terisi */}
                {opsi.input.pilihanCepat && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {opsi.input.pilihanCepat.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAlasan(p)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${
                          alasan === p
                            ? 'border-[#1976d2] bg-blue-50 text-[#1565c0]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  rows={2}
                  maxLength={255}
                  placeholder={opsi.input.placeholder || 'Tulis alasan...'}
                  className="w-full resize-none rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1976d2]"
                  autoFocus
                />
              </div>
            )}

            {/* Tombol: Batal (kiri) dan Ya (kanan) */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={tolak}
                className="rounded-xl border-2 border-slate-200 py-3 font-semibold text-slate-600 hover:bg-slate-50"
              >
                {opsi.teksTidak || 'Batal'}
              </button>
              <button
                onClick={setuju}
                autoFocus={!opsi.input}
                className={`rounded-xl py-3 font-semibold text-white shadow-lg outline-none focus:ring-4 ${gaya.tombol}`}
              >
                {opsi.teksYa || 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

// Hook untuk memakai dialog: const tanya = useDialog()
// eslint-disable-next-line react-refresh/only-export-components
export function useDialog() {
  return useContext(DialogContext)
}
