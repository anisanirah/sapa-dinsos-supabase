// Hook useState untuk menyimpan data form
import { useState } from 'react'
// Link (pindah halaman tanpa reload) dan useNavigate (pindah halaman lewat kode)
import { Link, useNavigate } from 'react-router-dom'
// Hook untuk memakai fungsi register dari AuthContext
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ToastProvider'
// Daftar persyaratan kata sandi (dicentang otomatis saat mengetik)
import SyaratPassword, { passwordMemenuhiSyarat } from '../components/SyaratPassword'
// Ikon-ikon dari lucide-react
import {
  UserPlus,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'

// Halaman pendaftaran akun PENGUNJUNG.
// Akun petugas tidak dibuat di sini (dibuat pengelola lewat supabase/04_data_awal.sql).
export default function Register() {
  // Data isian form
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    password_confirmation: '',
    alamat: '',
    no_telp: '',
    setuju: false,
  })
  // Menampilkan / menyembunyikan password
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // Pesan error dan status loading tombol
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fungsi register dari AuthContext + fungsi pindah halaman
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // Mengisi data form setiap kali pengguna mengetik
  const handleChange = (e) => {
    // Checkbox memakai "checked", input lain memakai "value"
    const { name, type, value, checked } = e.target
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
  }

  // Dijalankan saat tombol "Daftar Akun" ditekan
  const handleSubmit = async (e) => {
    // Cegah halaman reload
    e.preventDefault()
    setError('')

    // Cek di sisi browser: password harus sama dengan konfirmasinya
    // Kata sandi harus memenuhi semua syarat wajib (lihat SyaratPassword.jsx)
    if (!passwordMemenuhiSyarat(formData.password)) {
      setError('Kata sandi belum memenuhi persyaratan (huruf besar, huruf kecil, angka, minimal 8 karakter).')
      return
    }

    if (formData.password !== formData.password_confirmation) {
      setError('Password dan konfirmasi password tidak cocok')
      return
    }

    if (!formData.setuju) {
      setError('Anda harus menyetujui syarat dan ketentuan serta kebijakan privasi.')
      return
    }

    setLoading(true)
    try {
      // Kirim data lengkap sesuai validasi backend (role TIDAK dikirim, backend mengunci sebagai pengunjung)
      const data = await register({
        nama: formData.nama,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        alamat: formData.alamat,
        no_telp: formData.no_telp,
        setuju: formData.setuju,
      })
      // Beri tahu hasil pengiriman email verifikasi
      if (data?.email_terkirim === false) {
        toast.error(data.message, 'Registrasi berhasil')
      } else {
        toast.success(data?.message || 'Registrasi berhasil.', 'Cek email Anda')
      }
      // Versi Supabase: akun baru harus verifikasi email dulu, lalu masuk lewat halaman login.
      // (Jika verifikasi email dimatikan di Supabase, akun langsung login -> halaman utama.)
      navigate(data?.perlu_verifikasi ? '/login' : '/')
    } catch (err) {
      // Ambil pesan error pertama dari validasi backend (misal: "email sudah dipakai")
      const errors = err.response?.data?.errors
      const pesanPertama = errors ? Object.values(errors)[0]?.[0] : null
      setError(pesanPertama || err.response?.data?.message || 'Register gagal. Silakan coba lagi.')
    } finally {
      // Matikan loading, berhasil maupun gagal
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header: logo dan nama dinas */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <Link to="/login" className="flex items-center gap-3">
          <img
            src="/images/logo-dinsos.png"
            alt="Logo DINSOS"
            className="h-10 w-auto"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-[#1976d2] tracking-wide">SAPA DINSOS</span>
            <span className="text-xs text-gray-500 tracking-wide">DINAS SOSIAL KABUPATEN MAJALENGKA</span>
          </div>
        </Link>
      </header>

      {/* Isi utama: kartu form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-lg p-8 sm:p-12">
          {/* Ikon di atas judul */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-[#1976d2]" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
            Daftar Akun Baru
          </h2>
          <p className="text-center text-gray-500 mb-8">
            Buat akun SAPA DINSOS untuk mengambil antrean secara online
          </p>

          {/* Pesan error (hanya tampil jika ada) */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Form pendaftaran */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Baris 1: nama dan email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Nama Lengkap"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                icon={<User className="w-5 h-5" />}
                placeholder="Nama lengkap"
                required
              />
              <InputField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                icon={<Mail className="w-5 h-5" />}
                placeholder="email@example.com"
                required
              />
            </div>

            {/* Nomor telepon */}
            <InputField
              label="Nomor Telepon"
              name="no_telp"
              type="tel"
              value={formData.no_telp}
              onChange={handleChange}
              icon={<Phone className="w-5 h-5" />}
              placeholder="08xxxxxxxxxx"
              required
            />

            {/* Alamat */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Alamat
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <textarea
                  name="alamat"
                  value={formData.alamat}
                  onChange={handleChange}
                  placeholder="Alamat lengkap"
                  rows="2"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] outline-none transition-all bg-gray-50 focus:bg-white resize-none"
                />
              </div>
            </div>

            {/* Baris password dan konfirmasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PasswordInput
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                required
              />
              <PasswordInput
                label="Konfirmasi Password"
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                showPassword={showConfirmPassword}
                setShowPassword={setShowConfirmPassword}
                required
              />
            </div>

            {/* Persyaratan kata sandi: tampil setelah pengguna mulai mengetik */}
            {formData.password && (
              <SyaratPassword password={formData.password} konfirmasi={formData.password_confirmation} />
            )}

            {/* Tombol kirim (menampilkan putaran loading saat diproses) */}
            {/* Persetujuan syarat & ketentuan (wajib, dicek juga oleh backend) */}
            <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                name="setuju"
                checked={formData.setuju}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 accent-[#1976d2]"
              />
              <span>
                Saya menyatakan data yang saya isi benar, dan saya menyetujui{' '}
                <strong>syarat dan ketentuan</strong> serta <strong>kebijakan privasi</strong> Dinas Sosial
                Kabupaten Majalengka (data hanya dipakai untuk keperluan pelayanan).
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white py-3.5 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/30 mt-6"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memproses...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Daftar Akun
                </>
              )}
            </button>
          </form>

          {/* Link ke halaman login */}
          <p className="text-center text-gray-600 mt-6">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-[#1976d2] hover:text-[#1565c0] font-semibold">
              Masuk di sini
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

// --- Komponen bantu ---

// Kolom isian teks dengan ikon di sebelah kiri
function InputField({ label, name, type = 'text', value, onChange, icon, placeholder, required }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        {/* Ikon di dalam kolom */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] outline-none transition-all bg-gray-50 focus:bg-white"
          required={required}
        />
      </div>
    </div>
  )
}

// Kolom password dengan tombol mata untuk melihat / menyembunyikan isinya
function PasswordInput({ label, name, value, onChange, showPassword, setShowPassword, required }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        {/* Ikon gembok di kiri */}
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder="Masukkan password"
          className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] outline-none transition-all bg-gray-50 focus:bg-white"
          required={required}
        />
        {/* Tombol mata di kanan */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}
