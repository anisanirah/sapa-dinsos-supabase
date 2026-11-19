// ========================================
// FILE: UbahKataSandi.jsx
// DESKRIPSI: Mengubah kata sandi (wajib mengisi kata sandi lama).
// Setelah berhasil, perangkat lain yang sedang login otomatis dikeluarkan oleh backend.
// ========================================
// useState = menyimpan data yang bisa berubah di halaman
import { useState } from 'react'
// useNavigate = pindah halaman lewat kode
import { useNavigate } from 'react-router-dom'
// Ikon-ikon dari lucide-react
import { Lock, Save, Eye, EyeOff, ArrowLeft } from 'lucide-react'
// Klien API (penerjemah ke Supabase, lihat lib/api.js)
import api from '../lib/api'
// Fungsi bantu pesan error backend
import { pesanError } from '../lib/antrean'
// Notifikasi kecil di pojok layar
import { useToast } from '../components/ToastProvider'
// Daftar persyaratan kata sandi (dicentang otomatis saat mengetik)
import SyaratPassword, { passwordMemenuhiSyarat } from '../components/SyaratPassword'

// Isi awal form (semua kosong)
const KOSONG = { password_lama: '', password: '', password_confirmation: '' }

// Komponen halaman Ubah Kata Sandi
export default function UbahKataSandi() {
  const navigate = useNavigate()
  const toast = useToast()
  // Isi form: kata sandi lama, baru, dan konfirmasi
  const [form, setForm] = useState(KOSONG)
  // true = kata sandi ditampilkan sebagai teks
  const [lihat, setLihat] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Simpan setiap ketikan ke state form sesuai nama kolom
  const ubah = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // Dijalankan saat tombol "Simpan Kata Sandi" ditekan
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi kata sandi baru tidak sama.')
      return
    }
    setLoading(true)
    try {
      // Kirim ke backend: PUT /api/password
      const res = await api.put('/password', form)
      toast.success(res.data.message)
      // Berhasil: kosongkan form kembali
      setForm(KOSONG)
    } catch (err) {
      setError(pesanError(err, 'Gagal mengubah kata sandi.'))
    } finally {
      setLoading(false)
    }
  }

  // Kelas Tailwind untuk kotak input
  const kelas = 'w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] outline-none bg-white'

  // Membuat satu kolom kata sandi (label + ikon + input)
  const Kolom = ({ label, name, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type={lihat ? 'text' : 'password'}
          name={name}
          value={form[name]}
          onChange={ubah}
          placeholder={placeholder}
          className={kelas}
          required
          minLength={name === 'password_lama' ? undefined : 8}
        />
      </div>
    </div>
  )

  return (
    // Tampilan halaman
    <div className="max-w-2xl mx-auto p-6">
      <button onClick={() => navigate('/pengaturan')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1976d2] mb-4">
        <ArrowLeft size={16} /> Kembali ke Pengaturan
      </button>
      <h1 className="text-2xl font-bold text-gray-800">Ubah Kata Sandi</h1>
      <p className="text-gray-500 mb-6">Gunakan minimal 8 karakter. Jangan berikan kata sandi kepada siapa pun, termasuk petugas.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {/* Dipanggil sebagai fungsi (bukan <Kolom/>) agar input tidak kehilangan fokus saat mengetik */}
        {Kolom({ label: 'Kata Sandi Lama', name: 'password_lama', placeholder: 'Kata sandi saat ini' })}
        {Kolom({ label: 'Kata Sandi Baru', name: 'password', placeholder: 'Minimal 8 karakter' })}
        {Kolom({ label: 'Ulangi Kata Sandi Baru', name: 'password_confirmation', placeholder: 'Ketik ulang kata sandi baru' })}
        {/* Persyaratan kata sandi baru */}
        <SyaratPassword password={form.password} konfirmasi={form.password_confirmation} />

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={lihat} onChange={(e) => setLihat(e.target.checked)} className="accent-[#1976d2]" />
          {lihat ? <EyeOff size={14} /> : <Eye size={14} />} Tampilkan kata sandi
        </label>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          {/* Tombol aktif hanya jika syarat terpenuhi dan konfirmasi sama */}
          <button
            type="submit"
            disabled={loading || !passwordMemenuhiSyarat(form.password) || form.password !== form.password_confirmation}
            className="flex items-center gap-2 px-6 py-3 bg-[#1976d2] text-white rounded-lg hover:bg-[#1565c0] disabled:opacity-50">
            <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
          </button>
        </div>
      </form>
    </div>
  )
}
