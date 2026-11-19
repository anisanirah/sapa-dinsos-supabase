// ========================================
// FILE: Notifikasi.jsx
// DESKRIPSI: Penjelasan pemberitahuan yang dipakai sistem.
// ========================================
// useNavigate = pindah halaman lewat kode
import { useNavigate } from 'react-router-dom'
// Ikon dari lucide-react
import { Bell, ArrowLeft, Mail, Monitor } from 'lucide-react'

// Komponen halaman Notifikasi (penjelasan jenis pemberitahuan)
export default function Notifikasi() {
  const navigate = useNavigate()
  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate('/pengaturan')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1976d2] mb-4">
        <ArrowLeft size={16} /> Kembali ke Pengaturan
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center"><Bell size={24} /></div>
        <h1 className="text-2xl font-bold text-gray-800">Notifikasi</h1>
      </div>
      {/* Daftar jenis pemberitahuan */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4">
          <Mail className="text-[#1976d2] flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-800">Email</h3>
            <p className="text-sm text-gray-600">Dikirim untuk verifikasi akun dan atur ulang kata sandi.</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4">
          <Monitor className="text-[#1976d2] flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-800">Pemberitahuan di layar</h3>
            <p className="text-sm text-gray-600">
              Selama halaman &quot;Antrean&quot; terbuka, status diperbarui otomatis dan muncul pemberitahuan saat nomor Anda dipanggil.
              Nomor tetap dipanggil secara lisan oleh petugas di kantor.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
