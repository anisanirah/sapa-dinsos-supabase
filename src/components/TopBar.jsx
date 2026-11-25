// ========================================
// FILE: TopBar.jsx
// DESKRIPSI: TopBar biru yang muncul di SEMUA halaman dashboard.
// Menampilkan logo, tanggal/jam, dan dropdown profil user.
// ========================================

// 1. Import ikon dari lucide-react untuk visualisasi
import {
  CalendarDays,  // Ikon kalender untuk tanggal
  UserRound,     // Ikon user untuk profil
  ChevronDown,   // Ikon panah bawah untuk dropdown
  Menu,          // Ikon menu hamburger
  LogOut,        // Ikon logout
  Settings       // Ikon pengaturan
} from 'lucide-react'

// 2. Import hook useState dan useEffect dari React
import { useState, useEffect, useRef } from 'react'

// 3. Import useNavigate untuk redirect setelah logout
import { useNavigate } from 'react-router-dom'

// 4. Import useAuth untuk mendapatkan data user dan fungsi logout
import { useAuth } from '../context/AuthContext'

// 5. Import file CSS untuk styling topbar
import './TopBar.css'

// 6. Definisi komponen TopBar
function TopBar({ onToggleMenu }) {
  // 7. Hook useNavigate untuk navigasi ke halaman login setelah logout
  const navigate = useNavigate()

  // 8. Hook useAuth untuk mendapatkan data user yang sedang login
  const { user, logout } = useAuth()

  // 9. State untuk menyimpan waktu saat ini (update setiap detik)
  const [waktuSekarang, setWaktuSekarang] = useState(new Date())

  // 10. State untuk mengontrol visibilitas dropdown profil
  const [showDropdown, setShowDropdown] = useState(false)

  // 11. Ref untuk mendeteksi klik di luar dropdown
  const dropdownRef = useRef(null)

  // 12. useEffect: Update waktu setiap 1 detik
  useEffect(() => {
    const timer = setInterval(() => {
      setWaktuSekarang(new Date())
    }, 1000)
    // Cleanup: hapus interval saat komponen di-unmount
    return () => clearInterval(timer)
  }, [])

  // 13. useEffect: Tutup dropdown jika user klik di luar area dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      // Jika klik terjadi di luar dropdownRef, tutup dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    // Tambahkan event listener untuk mendeteksi klik mouse
    document.addEventListener('mousedown', handleClickOutside)
    // Cleanup: hapus event listener saat komponen di-unmount
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 14. Fungsi untuk memformat tanggal ke bahasa Indonesia
  const formatTanggal = (tanggal) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return tanggal.toLocaleDateString('id-ID', options)
  }

  // 15. Fungsi untuk memformat jam (24 jam)
  const formatJam = (tanggal) => {
    return tanggal.toLocaleTimeString('id-ID', { hour12: false })
  }

  // 16. Ambil nama user dari AuthContext atau fallback ke localStorage
  const displayName = user?.profile?.nama || user?.name || localStorage.getItem('userName') || 'User'

  // 17. Ambil role user dari AuthContext atau fallback ke localStorage
  const userRole = user?.profile?.role || localStorage.getItem('userRole') || 'pengunjung'

  // 18. Fungsi untuk menangani proses logout dari dropdown
  const handleLogout = async () => {
    // Tutup dropdown terlebih dahulu
    setShowDropdown(false)
    try {
      // Panggil fungsi logout dari AuthContext
      await logout()
    } catch (err) {
      console.error('Logout error:', err)
    }
    // Hapus semua data dari localStorage
    localStorage.clear()
    // Redirect ke halaman login
    navigate('/login')
  }

  // 19. Return JSX: Struktur tampilan TopBar
  return (
    <div className="topbar-global">
      {/* BAGIAN KIRI: Logo dan nama instansi */}
      <div className="topbar-left">
        {/* Logo DINSOS */}
        <img src="/images/logo-dinsos.png" alt="Logo DINSOS" className="topbar-logo" />

        {/* Nama instansi */}
        <div className="topbar-brand">
          <div className="topbar-title">SAPA DINSOS</div>
          <div className="topbar-subtitle">DINAS SOSIAL KABUPATEN MAJALENGKA</div>
        </div>

        {/* Tombol menu hamburger (untuk mobile) */}
        <button className="topbar-menu-btn" onClick={onToggleMenu} aria-label="Buka menu">
          <Menu size={20} strokeWidth={2} />
        </button>
      </div>

      {/* BAGIAN TENGAH: Tanggal dan jam */}
      <div className="topbar-center">
        <span className="topbar-date">
          <CalendarDays size={20} strokeWidth={2} />
          {formatTanggal(waktuSekarang)}
        </span>
        {/* Garis tegak pemisah tanggal dan jam */}
        <span className="topbar-pemisah" aria-hidden="true" />
        <span className="topbar-time">{formatJam(waktuSekarang)}</span>
      </div>

      {/* BAGIAN KANAN: Profil user dengan dropdown */}
      <div className="topbar-right" ref={dropdownRef}>
        {/* Tombol profil yang bisa diklik untuk toggle dropdown */}
        <div
          className="topbar-profile"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {/* Ikon user bulat */}
          <div className="profile-icon">
            <UserRound size={16} strokeWidth={2} />
          </div>
          {/* Nama user */}
          <span>{displayName}</span>
          {/* Ikon panah bawah */}
          <span className="profile-arrow">
            <ChevronDown size={14} strokeWidth={2} />
          </span>
        </div>

        {/* Dropdown menu (hanya muncul jika showDropdown = true) */}
        {showDropdown && (
          <div className="profile-dropdown">
            {/* Info user di bagian atas dropdown */}
            <div className="dropdown-header">
              <p className="dropdown-name">{displayName}</p>
              <p className="dropdown-role">
                {userRole === 'petugas_pendaftaran' ? 'Petugas Pendaftaran' :
                 userRole === 'petugas_pelayanan' ? 'Petugas Pelayanan' : 'Pengunjung'}
              </p>
            </div>

            {/* Menu akun */}
            <button onClick={() => { setShowDropdown(false); navigate('/profil') }} className="dropdown-item">
              <UserRound size={16} strokeWidth={2} />
              <span>Profil Saya</span>
            </button>
            <button onClick={() => { setShowDropdown(false); navigate('/pengaturan') }} className="dropdown-item">
              <Settings size={16} strokeWidth={2} />
              <span>Pengaturan Akun</span>
            </button>

            {/* Tombol Logout */}
            <button onClick={handleLogout} className="dropdown-item">
              <LogOut size={16} strokeWidth={2} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// 20. Export komponen TopBar agar bisa digunakan di App.jsx
export default TopBar