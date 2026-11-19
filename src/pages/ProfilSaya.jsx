// useState = simpan data; useEffect = jalankan kode saat data berubah
import { useState, useEffect } from 'react'
// Data login + fungsi memuat ulang data pengguna
import { useAuth } from '../context/AuthContext'
// Ikon-ikon dari lucide-react
import { User, Mail, Phone, MapPin, Save, Edit2 } from 'lucide-react'
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Kartu profil */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Profil Saya</h1>
            <p className="text-sm text-gray-500 mt-1">Kelola informasi profil Anda</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1976d2] text-white rounded-lg hover:bg-[#1565c0] transition-colors"
          >
            <Edit2 size={16} />
            {isEditing ? 'Batal' : 'Edit Profil'}
          </button>
        </div>

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
          {/* Avatar */}
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
            <div className="w-20 h-20 bg-[#1976d2] text-white rounded-full flex items-center justify-center text-2xl font-semibold">
              {formData.nama ? formData.nama.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{formData.nama || 'User'}</h2>
              <p className="text-sm text-gray-500 capitalize">
                {userRole === 'petugas_pendaftaran' ? 'Petugas Pendaftaran' : 
                 userRole === 'petugas_pelayanan' ? 'Petugas Pelayanan' : 'Pengunjung'}
              </p>
            </div>
          </div>

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
  )
}