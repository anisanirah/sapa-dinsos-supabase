// ========================================
// FILE: FormDataTamu.jsx
// DESKRIPSI: Kolom-kolom "buku tamu digital" (pengganti buku tamu manual):
// nama, nomor HP, kecamatan, desa/kelurahan, dan keterangan keperluan.
// Dipakai di: form ambil antrean pengunjung & form daftar langsung petugas.
// Kecamatan dan desa/kelurahan memakai kolom pilihan yang bisa diketik (PilihCari):
//  - ketik "arga" -> muncul "Argapura"
//  - setelah kecamatan dipilih, kolom desa hanya menampilkan desa/kelurahan di kecamatan itu
//  - jika kecamatan "Luar Kabupaten Majalengka", desa/kelurahan diketik bebas
// ========================================
// Ikon untuk setiap kolom
import { User, Phone, MapPin, Home, MessageSquareText } from 'lucide-react'
// Daftar 26 kecamatan di Kabupaten Majalengka (+ "Luar Kabupaten Majalengka")
import { KECAMATAN } from '../lib/antrean'
// Daftar desa/kelurahan per kecamatan (data Kemendagri)
import { daftarDesa } from '../lib/wilayah'
// Kolom pilihan yang bisa diketik untuk mencari
import PilihCari from './PilihCari'

// Nilai kecamatan untuk warga dari luar Majalengka
const LUAR_KABUPATEN = 'Luar Kabupaten Majalengka'

// Kelas Tailwind yang sama untuk semua kotak input biasa
const kelasInput =
  'w-full bg-transparent px-2.5 py-2.5 outline-none placeholder:text-gray-400'
// Bingkai kotak input (dibuat sama dengan kolom PilihCari agar seragam)
const kelasBingkai =
  'flex items-center rounded-xl border-2 border-gray-200 bg-white transition hover:border-blue-200 focus-within:border-[#1976d2] focus-within:ring-4 focus-within:ring-blue-100'
// Gaya label kolom
const kelasLabel = 'mb-1.5 block text-sm font-semibold text-gray-700'

// Pilihan kecamatan untuk kolom PilihCari
const PILIHAN_KECAMATAN = KECAMATAN.map((k) => ({ nilai: k }))

// data   : { nama_pengunjung, no_telp_pengunjung, desa_kelurahan, kecamatan, keperluan }
// onUbah : fungsi(namaKolom, nilai)
// hpWajib: true untuk daftar online, false untuk daftar langsung
// errors : pesan error per kolom dari backend (opsional)
export default function FormDataTamu({ data, onUbah, hpWajib = true, errors = {} }) {
  // Kirim perubahan ke komponen induk: (nama kolom, nilai baru)
  const ubah = (e) => onUbah(e.target.name, e.target.value)
  // Menampilkan pesan error di bawah kolom (jika ada)
  const PesanKolom = ({ kolom }) => (errors[kolom] ? <p className="text-xs text-red-600 mt-1">{errors[kolom]}</p> : null)

  // Daftar desa/kelurahan sesuai kecamatan yang dipilih
  const desaKecamatan = daftarDesa(data.kecamatan)
  const pilihanDesa = desaKecamatan.map((d) => ({ nilai: d.nama, keterangan: d.kelurahan ? 'Kel.' : '' }))
  const luarKabupaten = data.kecamatan === LUAR_KABUPATEN

  // Saat kecamatan berganti: kosongkan desa jika desa lama tidak ada di kecamatan baru
  const ubahKecamatan = (kec) => {
    onUbah('kecamatan', kec)
    const masihAda = daftarDesa(kec).some((d) => d.nama.toLowerCase() === String(data.desa_kelurahan || '').toLowerCase())
    if (!masihAda && kec !== LUAR_KABUPATEN) onUbah('desa_kelurahan', '')
  }

  return (
    <div className="space-y-4">
      {/* Baris 1: nama + nomor HP */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={kelasLabel}>Nama Lengkap *</label>
          <div className={kelasBingkai}>
            <User size={18} className="ml-3 shrink-0 text-gray-400" />
            <input name="nama_pengunjung" value={data.nama_pengunjung} onChange={ubah} className={kelasInput} placeholder="Sesuai KTP" required />
          </div>
          <PesanKolom kolom="nama_pengunjung" />
        </div>
        <div>
          <label className={kelasLabel}>Nomor HP {hpWajib ? '*' : <span className="font-normal text-gray-400">(opsional)</span>}</label>
          <div className={kelasBingkai}>
            <Phone size={18} className="ml-3 shrink-0 text-gray-400" />
            <input name="no_telp_pengunjung" value={data.no_telp_pengunjung} onChange={ubah} className={kelasInput} placeholder="08xxxxxxxxxx" inputMode="tel" required={hpWajib} />
          </div>
          <PesanKolom kolom="no_telp_pengunjung" />
        </div>
      </div>

      {/* Baris 2: kecamatan dulu, lalu desa/kelurahan (daftarnya mengikuti kecamatan) */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={kelasLabel}>Kecamatan *</label>
          <PilihCari
            name="kecamatan"
            value={data.kecamatan}
            onChange={ubahKecamatan}
            pilihan={PILIHAN_KECAMATAN}
            placeholder="Ketik atau pilih kecamatan"
            ikon={MapPin}
            required
          />
          <PesanKolom kolom="kecamatan" />
        </div>
        <div>
          <label className={kelasLabel}>Desa / Kelurahan *</label>
          {luarKabupaten ? (
            // Warga luar Majalengka: desa/kelurahan diketik bebas
            <div className={kelasBingkai}>
              <Home size={18} className="ml-3 shrink-0 text-gray-400" />
              <input name="desa_kelurahan" value={data.desa_kelurahan} onChange={ubah} className={kelasInput} placeholder="Ketik nama desa/kelurahan" required />
            </div>
          ) : (
            <PilihCari
              name="desa_kelurahan"
              value={data.desa_kelurahan}
              onChange={(v) => onUbah('desa_kelurahan', v)}
              pilihan={pilihanDesa}
              disabled={!data.kecamatan}
              placeholder={data.kecamatan ? 'Ketik atau pilih desa' : 'Pilih kecamatan dulu'}
              ikon={Home}
              bolehKetikBebas
              required
            />
          )}
          {/* Petunjuk kecil di bawah kolom desa */}
          {data.kecamatan && !luarKabupaten && (
            <p className="mt-1 text-xs text-gray-400">{desaKecamatan.length} desa/kelurahan di Kecamatan {data.kecamatan}</p>
          )}
          <PesanKolom kolom="desa_kelurahan" />
        </div>
      </div>

      <div>
        {/* Baris 3: keterangan keperluan */}
        <label className={kelasLabel}>Keterangan Keperluan <span className="font-normal text-gray-400">(opsional)</span></label>
        <div className={`${kelasBingkai} items-start`}>
          <MessageSquareText size={18} className="ml-3 mt-3 shrink-0 text-gray-400" />
          <textarea
            name="keperluan"
            value={data.keperluan}
            onChange={ubah}
            rows={2}
            maxLength={500}
            className={`${kelasInput} resize-none`}
            placeholder="Contoh: Mengurus aktivasi BPJS untuk ibu saya"
          />
        </div>
        <PesanKolom kolom="keperluan" />
      </div>
    </div>
  )
}

// Data kosong untuk form
export const DATA_TAMU_KOSONG = {
  nama_pengunjung: '',
  no_telp_pengunjung: '',
  desa_kelurahan: '',
  kecamatan: '',
  keperluan: '',
}
