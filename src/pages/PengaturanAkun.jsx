// Ikon-ikon dari lucide-react
import { User, Lock, Shield, Bell, HelpCircle, LogOut } from 'lucide-react'
// useNavigate = pindah halaman lewat kode
import { useNavigate } from 'react-router-dom'
// Data login + fungsi logout
import { useAuth } from '../context/AuthContext'

// Komponen halaman Pengaturan Akun
export default function PengaturanAkun() {
  // Fungsi pindah halaman
  const navigate = useNavigate()
  const { logout } = useAuth() // Ambil fungsi logout dari AuthContext

  // Daftar menu pengaturan: label, keterangan, ikon, alamat tujuan, warna
  const menuItems = [
    {
      label: 'Profil Saya',
      description: 'Kelola informasi profil Anda',
      icon: User,
      path: '/profil',
      color: 'bg-blue-500'
    },
    {
      label: 'Ubah Kata Sandi',
      description: 'Perbarui kata sandi akun Anda',
      icon: Lock,
      path: '/ubah-kata-sandi',
      color: 'bg-purple-500'
    },
    {
      label: 'Keamanan dan Privasi',
      description: 'Kelola pengaturan keamanan akun',
      icon: Shield,
      path: '/keamanan',
      color: 'bg-green-500'
    },
    {
      label: 'Notifikasi',
      description: 'Atur preferensi notifikasi',
      icon: Bell,
      path: '/notifikasi',
      color: 'bg-orange-500'
    },
    {
      label: 'Panduan Penggunaan',
      description: 'Pelajari cara menggunakan sistem',
      icon: HelpCircle,
      path: '/panduan',
      color: 'bg-teal-500'
    }
  ]

  // Keluar: cabut token di backend lalu kembali ke halaman login
  const handleLogout = async () => {
    try {
      await logout() // Panggil API logout ke backend
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
      // Fallback jika API error, tetap hapus lokal dan redirect
      localStorage.clear()
      navigate('/login')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Judul halaman */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan Akun</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola pengaturan akun Anda</p>
      </div>

      {/* Daftar menu (setiap menu = satu tombol) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-left"
          >
            <div className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
              <item.icon size={24} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800">{item.label}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}

        {/* Tombol Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors text-left"
        >
          <div className="bg-red-500 w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0">
            <LogOut size={24} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-600">Keluar</h3>
            <p className="text-sm text-gray-500 mt-0.5">Keluar dari akun Anda</p>
          </div>
        </button>
      </div>
    </div>
  )
}