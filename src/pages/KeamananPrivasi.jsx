// ========================================
// FILE: KeamananPrivasi.jsx
// DESKRIPSI: Informasi keamanan akun & penggunaan data pribadi.
// ========================================
// useNavigate = pindah halaman lewat kode
import { useNavigate } from 'react-router-dom'
// Ikon dari lucide-react
import { Shield, Lock, ArrowLeft } from 'lucide-react'

// Komponen halaman Keamanan dan Privasi
export default function KeamananPrivasi() {
  const navigate = useNavigate()
  // Daftar poin keamanan: [judul, penjelasan]
  const poin = [
    ['Kata sandi tersimpan aman', 'Kata sandi disimpan dalam bentuk terenkripsi (hash). Petugas pun tidak bisa melihatnya.'],
    ['Sesi login 8 jam', 'Demi keamanan, Anda otomatis keluar setelah 8 jam dan perlu login kembali.'],
    ['Perlindungan percobaan login', 'Setelah 5 kali salah kata sandi, login dikunci sementara selama 15 menit.'],
    ['Ubah kata sandi', 'Saat kata sandi diubah, semua perangkat lain yang sedang login otomatis dikeluarkan.'],
    ['Penggunaan data', 'Nama, nomor HP, dan alamat hanya dipakai untuk keperluan pelayanan Dinas Sosial Kabupaten Majalengka.'],
    ['Barcode bersifat pribadi', 'Jangan membagikan QR Code antrean Anda kepada orang lain sebelum di-scan petugas.'],
  ]
  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate('/pengaturan')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1976d2] mb-4">
        <ArrowLeft size={16} /> Kembali ke Pengaturan
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center"><Shield size={24} /></div>
        <h1 className="text-2xl font-bold text-gray-800">Keamanan dan Privasi</h1>
      </div>
      {/* Kartu-kartu poin keamanan (2 kolom) */}
      <div className="grid sm:grid-cols-2 gap-3">
        {poin.map(([judul, teks]) => (
          <div key={judul} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Lock size={16} className="text-green-600" /> {judul}</h3>
            <p className="text-sm text-gray-600 mt-1">{teks}</p>
          </div>
        ))}
      </div>
      {/* Tombol pintas ke halaman Ubah Kata Sandi */}
      <button onClick={() => navigate('/ubah-kata-sandi')} className="mt-6 px-5 py-3 bg-[#1976d2] text-white rounded-lg hover:bg-[#1565c0]">
        Ubah Kata Sandi
      </button>
    </div>
  )
}
