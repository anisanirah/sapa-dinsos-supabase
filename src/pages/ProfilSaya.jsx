// useState = simpan data; useEffect = jalankan kode saat data berubah
import { useState, useEffect, useRef } from 'react'
// Data login + fungsi memuat ulang data pengguna
import { useAuth } from '../context/AuthContext'
// Ikon-ikon dari lucide-react
import { User, Mail, Phone, MapPin, Save, Edit2, Camera, Upload, Trash2, Loader2 } from 'lucide-react'
// Banner judul bersama & lingkaran foto profil
import KepalaHalaman from '../components/KepalaHalaman'
import FotoProfil from '../components/FotoProfil'
// Fungsi unggah / hapus foto profil (Supabase Storage)
import { unggahFotoProfil, hapusFotoProfil, BATAS_FILE_MB } from '../lib/fotoProfil'
// Notifikasi kecil & dialog konfirmasi
import { useToast } from '../components/ToastProvider'
import { useDialog } from '../components/DialogProvider'
// Klien API (penerjemah ke Supabase, lihat lib/api.js)
import api from '../lib/api'
// Fungsi bantu pesan error backend
import { pesanError } from '../lib/antrean'

// Komponen halaman Profil Saya
export default function ProfilSaya() {
  const { user, refreshUser } = useAuth()
  // Isi form profil
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    no_telp: '',
    alamat: ''
  })
  // true = mode ubah (kolom bisa diketik)
  const [isEditing, setIsEditing] = useState(false)
  // Pesan error per kolom
  const [errors, setErrors] = useState({})
  // Pesan sukses setelah disimpan
  const [successMessage, setSuccessMessage] = useState('')
  // Status sedang menyimpan
  const [loading, setLoading] = useState(false)
  // true = foto sedang diunggah / dihapus
  const [sedangFoto, setSedangFoto] = useState(false)
  // Penunjuk ke pemilih file yang tersembunyi
  const inputFotoRef = useRef(null)
  const toast = useToast()
  const tanya = useDialog()

  // Isi form dengan data pengguna yang sedang login
  useEffect(() => {
    if (user) {
      setFormData({
        nama: user.profile?.nama || user.name || '',
        email: user.email || '',
        no_telp: user.profile?.no_telp || '',
        alamat: user.profile?.alamat || ''
      })
    }
  }, [user])

  // Pemeriksaan sederhana di browser sebelum dikirim ke backend
  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.nama.trim()) {
      newErrors.nama = 'Nama lengkap wajib diisi'
    }
    // Email tidak bisa diubah dari sini, jadi tidak perlu divalidasi
    
    if (formData.no_telp && !/^[0-9+\-\s()]{10,15}$/.test(formData.no_telp)) {
      newErrors.no_telp = 'Format nomor telepon tidak valid'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Simpan profil ke backend (PUT /api/profile)
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Berhenti jika ada isian yang salah
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setSuccessMessage('')
    
    try {
      // Kirim HANYA kolom yang boleh diubah (email & role tidak bisa diubah)
      await api.put('/profile', {
        nama: formData.nama,
        no_telp: formData.no_telp,
        alamat: formData.alamat,
      })
      setSuccessMessage('Profil berhasil diperbarui')
      setIsEditing(false)
      // Muat ulang data pengguna agar nama di TopBar/Sidebar ikut berubah
      await refreshUser()
    } catch (err) {
      // Tampilkan error per kolom dari backend (misal: nomor HP sudah dipakai)
      const errBackend = err.response?.data?.errors || {}
      setErrors({
        ...Object.fromEntries(Object.entries(errBackend).map(([k, v]) => [k, v[0]])),
        submit: pesanError(err, 'Gagal memperbarui profil'),
      })
    } finally {
      setLoading(false)
    }
  }

  // Simpan setiap ketikan & hapus pesan error kolom tersebut
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Role pengguna (untuk label di kartu profil)
  const userRole = user?.profile?.role || localStorage.getItem('userRole') || 'pengunjung'

  // Lokasi foto profil saat ini (kosong = belum ada foto)
  const fotoPath = user?.profile?.foto_path || null

  // Pilih file foto -> proses & unggah -> muat ulang data akun
  const handlePilihFoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // kosongkan agar file yang sama bisa dipilih lagi
    if (!file) return
    setSedangFoto(true)
    try {
      await unggahFotoProfil(file, user.id)
      await refreshUser()
      toast.success('Foto profil berhasil diperbarui.')
    } catch (err) {
      toast.error(err.message || 'Gagal mengunggah foto.')
    } finally {
      setSedangFoto(false)
    }
  }

  // Hapus foto profil setelah dikonfirmasi
  const handleHapusFoto = async () => {
    const yakin = await tanya({
      varian: 'bahaya',
      judul: 'Hapus foto profil?',
      pesan: 'Foto akan dihapus dan diganti dengan huruf depan nama Anda.',
      teksYa: 'Ya, Hapus Foto',
    })
    if (!yakin) return
    setSedangFoto(true)
    try {
      await hapusFotoProfil()
      await refreshUser()
      toast.success('Foto profil dihapus.')
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus foto.')
    } finally {
      setSedangFoto(false)
    }
  }

  // Nama peran yang tampil di bawah nama
  const namaPeran = userRole === 'petugas_pendaftaran' ? 'Petugas Pendaftaran'
    : userRole === 'petugas_pelayanan' ? 'Petugas Pelayanan' : 'Pengunjung'

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Banner judul + tombol Edit Profil */}
      <KepalaHalaman
        ikon={User}
        judul="Profil Saya"
        deskripsi="Kelola foto, nama, dan kontak akun Anda."
        aksi={
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition ${
              isEditing
                ? 'border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                : 'bg-[#0d5bc4] text-white shadow-md shadow-blue-200 hover:bg-[#0b4fa9]'
            }`}
          >
            <Edit2 size={18} />
            {isEditing ? 'Batal Edit' : 'Edit Profil'}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* ===== KARTU FOTO PROFIL ===== */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center lg:self-start">
          <div className="relative inline-block">
            {/* Foto besar berbentuk lingkaran */}
            <FotoProfil path={fotoPath} nama={formData.nama} ukuran={136} className="ring-4 ring-blue-100 shadow-md" />
            {/* Lapisan putar saat foto sedang diunggah / dihapus */}
            {sedangFoto && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                <Loader2 className="animate-spin text-[#1976d2]" size={36} />
              </span>
            )}
            {/* Tombol kamera kecil di pojok foto */}
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              disabled={sedangFoto}
              title="Ganti foto"
              className="absolute bottom-1 right-1 flex w-10 h-10 items-center justify-center rounded-full border-4 border-white bg-[#0d5bc4] text-white shadow hover:bg-[#0b4fa9] disabled:opacity-60"
            >
              <Camera size={18} />
            </button>
          </div>

          <h2 className="mt-4 text-xl font-bold text-[#0f1e33]">{formData.nama || 'Pengguna'}</h2>
          <span className="mt-1 inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#1565c0]">{namaPeran}</span>

          {/* Tombol unggah & hapus foto */}
          <div className="mt-5 flex flex-col sm:flex-row lg:flex-col gap-2">
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              disabled={sedangFoto}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d5bc4] px-4 py-2.5 font-semibold text-white hover:bg-[#0b4fa9] disabled:opacity-60"
            >
              <Upload size={18} />
              {fotoPath ? 'Ganti Foto' : 'Unggah Foto'}
            </button>
            {fotoPath && (
              <button
                type="button"
                onClick={handleHapusFoto}
                disabled={sedangFoto}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 size={18} />
                Hapus Foto
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Format JPG, PNG, atau WEBP, maksimal {BATAS_FILE_MB} MB. Foto otomatis dipotong persegi.
          </p>

          {/* Pemilih file tersembunyi (dibuka oleh tombol di atas) */}
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePilihFoto}
            className="hidden"
          />
        </div>

        {/* ===== KARTU DATA DIRI ===== */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7">
          <h3 className="text-lg font-bold text-[#0f1e33] mb-1">Data Diri</h3>
          <p className="text-sm text-slate-500 mb-5">
            {isEditing ? 'Ubah data lalu klik "Simpan Perubahan".' : 'Klik "Edit Profil" untuk mengubah data.'}
          </p>

          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}

          {errors.submit && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {errors.submit}
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] outline-none transition-all ${
                  isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
                } ${errors.nama ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.nama && <p className="mt-1 text-sm text-red-600">{errors.nama}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled
                title="Email tidak dapat diubah"
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] outline-none transition-all ${
                  isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
                } ${errors.email ? 'border-red-500' : ''}`}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Email tidak dapat diubah.</p>
          </div>

          {/* Nomor Telepon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nomor Telepon
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="no_telp"
                value={formData.no_telp}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="08xxxxxxxxxx"
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] outline-none transition-all ${
                  isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
                } ${errors.no_telp ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.no_telp && <p className="mt-1 text-sm text-red-600">{errors.no_telp}</p>}
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alamat
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <textarea
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                disabled={!isEditing}
                rows="3"
                placeholder="Alamat lengkap"
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] outline-none transition-all resize-none ${
                  isEditing ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
                }`}
              />
            </div>
          </div>

          {/* Tombol Simpan */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-[#1976d2] text-white rounded-lg hover:bg-[#1565c0] transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          )}
        </form>
        </div>
      </div>
    </div>
  )
}