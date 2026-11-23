// ========================================
// FILE: PilihCari.jsx
// DESKRIPSI: Kolom pilihan yang BISA DIKETIK untuk mencari (combobox).
// Contoh: ketik "arga" -> muncul "Argapura". Daftar lengkap tetap bisa dibuka dengan
// mengeklik kolom atau tombol panah. Bisa dipakai dengan papan ketik:
//   panah atas/bawah = pindah pilihan, Enter = pilih, Esc = tutup daftar.
// Dipakai di formulir data tamu untuk kolom Kecamatan dan Desa/Kelurahan.
// ========================================
// useState = simpan data; useRef = simpan elemen; useMemo = hitung ulang bila perlu; useEffect = efek samping
import { useState, useRef, useMemo, useEffect, useId } from 'react'
// Ikon panah, centang, silang, dan kaca pembesar
import { ChevronDown, Check, X, Search } from 'lucide-react'

// Menyamakan huruf besar/kecil & spasi agar pencarian tidak peka huruf
const normal = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim()

// Props:
//  name, value, onChange(nilai) : nilai yang dipilih (teks)
//  pilihan        : [{ nilai: 'Argapura', keterangan: 'Kel.' (opsional) }]
//  placeholder    : teks petunjuk di kolom kosong
//  disabled       : kolom dinonaktifkan (misal desa sebelum kecamatan dipilih)
//  bolehKetikBebas: true = boleh memakai teks yang tidak ada di daftar
//  required       : wajib diisi
//  ikon           : ikon kecil di kiri kolom (opsional)
export default function PilihCari({
  name, value, onChange, pilihan, placeholder = 'Ketik untuk mencari...', disabled = false,
  bolehKetikBebas = false, required = false, ikon: Ikon = Search,
}) {
  // Teks yang sedang diketik di kolom
  const [kata, setKata] = useState(value || '')
  // Daftar pilihan sedang terbuka atau tidak
  const [terbuka, setTerbuka] = useState(false)
  // Urutan pilihan yang sedang disorot (untuk papan ketik)
  const [sorot, setSorot] = useState(0)
  const kotakInput = useRef(null)
  const kotakDaftar = useRef(null)
  const idDaftar = useId()

  // Jika nilai diubah dari luar (misal formulir dikosongkan), samakan teks di kolom
  useEffect(() => {
    if (!terbuka) setKata(value || '')
  }, [value, terbuka])

  // Pilihan yang cocok dengan kata yang diketik; yang diawali kata tersebut ditaruh paling atas
  const hasil = useMemo(() => {
    const k = normal(kata)
    // Kolom berisi nilai terpilih (belum diketik ulang) -> tampilkan semua pilihan
    if (!k || normal(value) === k) return pilihan
    const awal = pilihan.filter((p) => normal(p.nilai).startsWith(k))
    const tengah = pilihan.filter((p) => !normal(p.nilai).startsWith(k) && normal(p.nilai).includes(k))
    return [...awal, ...tengah]
  }, [kata, pilihan, value])

  // Apakah kata yang diketik sama persis dengan salah satu pilihan
  const cocokPersis = pilihan.find((p) => normal(p.nilai) === normal(kata))
  // Tampilkan baris "Pakai teks ini" jika boleh mengetik bebas dan teks belum ada di daftar
  const tampilBebas = bolehKetikBebas && normal(kata) && !cocokPersis

  // Pastikan pilihan yang disorot terlihat di daftar saat bergulir
  useEffect(() => {
    const el = kotakDaftar.current?.querySelector(`[data-urut="${sorot}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [sorot])

  // Memilih satu nilai lalu menutup daftar
  const pilih = (nilai) => {
    onChange(nilai)
    setKata(nilai)
    setTerbuka(false)
  }

  // Saat kolom ditinggalkan: pakai pilihan yang cocok, teks bebas (jika boleh), atau kembali ke nilai lama
  const saatKeluar = () => {
    setTerbuka(false)
    if (cocokPersis) return pilih(cocokPersis.nilai)
    if (!normal(kata)) return pilih('')
    if (bolehKetikBebas) return pilih(kata.trim())
    setKata(value || '')
  }

  // Tombol papan ketik: panah, Enter, Esc
  const tombol = (e) => {
    const jumlah = hasil.length + (tampilBebas ? 1 : 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setTerbuka(true)
      setSorot((s) => Math.min(s + 1, Math.max(jumlah - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSorot((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && terbuka) {
      // Enter memilih yang disorot (jangan sampai mengirim formulir)
      e.preventDefault()
      if (sorot < hasil.length) pilih(hasil[sorot].nilai)
      else if (tampilBebas) pilih(kata.trim())
    } else if (e.key === 'Escape') {
      setTerbuka(false)
      setKata(value || '')
    }
  }

  return (
    <div className="relative">
      {/* Kolom ketik */}
      <div className={`flex items-center rounded-xl border-2 bg-white transition ${
        disabled ? 'border-gray-100 bg-gray-50' : terbuka ? 'border-[#1976d2] ring-4 ring-blue-100' : 'border-gray-200 hover:border-blue-200'
      }`}>
        <Ikon size={18} className={`ml-3 shrink-0 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
        <input
          ref={kotakInput}
          name={name}
          value={kata}
          disabled={disabled}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={terbuka}
          aria-controls={idDaftar}
          placeholder={placeholder}
          onChange={(e) => { setKata(e.target.value); setTerbuka(true); setSorot(0) }}
          onFocus={() => { setTerbuka(true); setSorot(0) }}
          // Klik lagi pada kolom yang sudah aktif tetap membuka daftar
          onClick={() => setTerbuka(true)}
          onBlur={saatKeluar}
          onKeyDown={tombol}
          className="w-full bg-transparent px-2.5 py-2.5 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
        />
        {/* Tombol hapus pilihan */}
        {value && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); pilih(''); kotakInput.current?.focus() }}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Hapus pilihan"
          >
            <X size={16} />
          </button>
        )}
        {/* Tombol panah buka/tutup daftar */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault()
            if (terbuka) setTerbuka(false)
            else { kotakInput.current?.focus(); setTerbuka(true) }
          }}
          className="mr-2 p-1 text-gray-400 hover:text-[#1976d2] disabled:opacity-40"
          title="Tampilkan daftar"
        >
          <ChevronDown size={18} className={`transition-transform ${terbuka ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Daftar pilihan */}
      {terbuka && !disabled && (
        <ul
          id={idDaftar}
          ref={kotakDaftar}
          role="listbox"
          className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl shadow-blue-100/60"
        >
          {hasil.map((p, i) => (
            <li
              key={p.nilai}
              data-urut={i}
              role="option"
              aria-selected={p.nilai === value}
              // onMouseDown (bukan onClick) agar terpilih sebelum kolom kehilangan fokus
              onMouseDown={(e) => { e.preventDefault(); pilih(p.nilai) }}
              onMouseEnter={() => setSorot(i)}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                i === sorot ? 'bg-blue-50 text-[#1976d2]' : 'text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                {p.nilai}
                {p.keterangan && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">{p.keterangan}</span>
                )}
              </span>
              {p.nilai === value && <Check size={16} className="text-[#1976d2]" />}
            </li>
          ))}

          {/* Pilihan memakai teks yang diketik (jika boleh) */}
          {tampilBebas && (
            <li
              data-urut={hasil.length}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); pilih(kata.trim()) }}
              onMouseEnter={() => setSorot(hasil.length)}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${sorot === hasil.length ? 'bg-blue-50 text-[#1976d2]' : 'text-gray-600'}`}
            >
              Pakai &quot;<strong>{kata.trim()}</strong>&quot; (tidak ada di daftar)
            </li>
          )}

          {/* Tidak ada yang cocok */}
          {hasil.length === 0 && !tampilBebas && (
            <li className="px-3 py-3 text-center text-sm text-gray-400">Tidak ditemukan. Coba ketik nama lain.</li>
          )}
        </ul>
      )}
    </div>
  )
}
