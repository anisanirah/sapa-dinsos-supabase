// ========================================
// FILE: PengaturanAkun.jsx
// DESKRIPSI: Halaman menu Pengaturan Akun. Berisi kartu-kartu menu
// (Profil, Ubah Kata Sandi, Keamanan, Notifikasi, Panduan, Keluar)
// yang tersusun 2 kolom, diawali banner judul.
// ========================================

// Ikon-ikon menu dari lucide-react
import { User, Lock, Shield, Bell, HelpCircle, LogOut, Settings, ChevronRight } from 'lucide-react'
// Navigasi ke halaman lain
import { useNavigate } from 'react-router-dom'
// Fungsi logout dari data login
import { useAuth } from '../context/AuthContext'
// Banner judul bersama
import KepalaHalaman from '../components/KepalaHalaman'

export default function PengaturanAkun() {
  const navigate = useNavigate()
  const { logout } = useAuth() // Ambil fungsi logout dari AuthContext

  // Daftar menu: judul, penjelasan, ikon, tujuan, dan warna kotak ikon (latar pastel + ikon berwarna)
  const menuItems = [
    {
      label: 'Profil Saya',
      description: 'Kelola informasi profil Anda seperti nama, email, dan nomor kontak.',
      icon: User,
      path: '/profil',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      label: 'Ubah Kata Sandi',
      description: 'Perbarui kata sandi akun Anda secara berkala untuk keamanan.',
      icon: Lock,
      path: '/ubah-kata-sandi',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      label: 'Keamanan dan Privasi',
      description: 'Atur keamanan akun dan kelola data pribadi Anda.',
      icon: Shield,
      path: '/keamanan',
      color: 'bg-green-100 text-green-600'
    },
    {
      label: 'Notifikasi',
      description: 'Atur preferensi notifikasi layanan seperti status antrean dan informasi penting.',
      icon: Bell,
      path: '/notifikasi',
      color: 'bg-orange-100 text-orange-500'
    },
    {
      label: 'Panduan Penggunaan',
      description: 'Pelajari cara menggunakan sistem SAPA DINSOS.',
      icon: HelpCircle,
      path: '/panduan',
      color: 'bg-teal-100 text-teal-600'
    }
  ]

  // Keluar dari akun lalu kembali ke halaman login
  const handleLogout = async () => {
    try {
      await logout() // Hapus sesi login di Supabase
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
      localStorage.clear()
      navigate('/login')
    }
  }

  // Satu kartu menu (dipakai untuk semua menu termasuk Keluar)
  const Kartu = ({ label, description, icon: Ikon, color, onClick, merah = false }) => (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-5 rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${merah ? 'hover:border-red-200' : 'hover:border-blue-200'}`}
    >
      {/* Kotak ikon berwarna pastel */}
      <span className={`flex w-16 h-16 flex-shrink-0 items-center justify-center rounded-2xl ${color}`}>
        <Ikon size={30} strokeWidth={2} />
      </span>
      {/* Judul dan penjelasan menu */}
      <span className="flex-1 min-w-0">
        <span className={`block text-lg font-bold ${merah ? 'text-red-600' : 'text-[#0f1e33]'}`}>{label}</span>
        <span className="block text-slate-600 mt-0.5">{description}</span>
      </span>
      {/* Panah kanan */}
      <ChevronRight size={24} className="text-slate-500 flex-shrink-0 transition group-hover:translate-x-0.5" />
    </button>
  )

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Banner judul dengan ikon roda gigi */}
      <KepalaHalaman
        ikon={Settings}
        judul="Pengaturan Akun"
        deskripsi="Kelola informasi, keamanan, notifikasi, dan preferensi akun Anda."
      />

      {/* Kartu menu tersusun 2 kolom (1 kolom di HP) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {menuItems.map((item) => (
          <Kartu key={item.path} {...item} onClick={() => navigate(item.path)} />
        ))}

        {/* Kartu Keluar (merah) */}
        <Kartu
          label="Keluar"
          description="Keluar dari akun Anda."
          icon={LogOut}
          color="bg-red-100 text-red-600"
          onClick={handleLogout}
          merah
        />
      </div>
    </div>
  )
}
