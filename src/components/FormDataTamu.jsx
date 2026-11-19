// ========================================
// FILE: FormDataTamu.jsx
// DESKRIPSI: Kolom-kolom "buku tamu digital" (pengganti buku tamu manual):
// nama, nomor HP, desa/kelurahan, kecamatan, dan keterangan keperluan.
// Dipakai di: form ambil antrean pengunjung & form daftar langsung petugas.
// ========================================
// Daftar 26 kecamatan di Kabupaten Majalengka
import { KECAMATAN } from '../lib/antrean'

// Kelas Tailwind yang sama untuk semua kotak input
const kelasInput =
  'w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#1976d2] outline-none bg-white'

// data   : { nama_pengunjung, no_telp_pengunjung, desa_kelurahan, kecamatan, keperluan }
// onUbah : fungsi(namaKolom, nilai)
// hpWajib: true untuk daftar online, false untuk daftar langsung
// errors : pesan error per kolom dari backend (opsional)
export default function FormDataTamu({ data, onUbah, hpWajib = true, errors = {} }) {
  // Kirim perubahan ke komponen induk: (nama kolom, nilai baru)
  const ubah = (e) => onUbah(e.target.name, e.target.value)
  // Menampilkan pesan error di bawah kolom (jika ada)
  const PesanKolom = ({ kolom }) => (errors[kolom] ? <p className="text-xs text-red-600 mt-1">{errors[kolom]}</p> : null)

  return (
    <div className="space-y-3">
      {/* Baris 1: nama + nomor HP */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
          <input name="nama_pengunjung" value={data.nama_pengunjung} onChange={ubah} className={kelasInput} placeholder="Sesuai KTP" required />
          <PesanKolom kolom="nama_pengunjung" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP {hpWajib ? '*' : '(opsional)'}</label>
          <input name="no_telp_pengunjung" value={data.no_telp_pengunjung} onChange={ubah} className={kelasInput} placeholder="08xxxxxxxxxx" inputMode="tel" required={hpWajib} />
          <PesanKolom kolom="no_telp_pengunjung" />
        </div>
      </div>
      {/* Baris 2: desa/kelurahan + kecamatan */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desa / Kelurahan *</label>
          <input name="desa_kelurahan" value={data.desa_kelurahan} onChange={ubah} className={kelasInput} placeholder="Contoh: Tonjong" required />
          <PesanKolom kolom="desa_kelurahan" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan *</label>
          <select name="kecamatan" value={data.kecamatan} onChange={ubah} className={kelasInput} required>
            <option value="">-- Pilih Kecamatan --</option>
            {/* Buat satu pilihan untuk setiap kecamatan */}
            {KECAMATAN.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <PesanKolom kolom="kecamatan" />
        </div>
      </div>
      <div>
        {/* Baris 3: keterangan keperluan */}
        <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Keperluan (opsional)</label>
        <textarea
          name="keperluan"
          value={data.keperluan}
          onChange={ubah}
          rows={2}
          maxLength={500}
          className={`${kelasInput} resize-none`}
          placeholder="Contoh: Mengurus aktivasi BPJS untuk ibu saya"
        />
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
