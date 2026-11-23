// ========================================
// FILE: Sidebar.jsx
// DESKRIPSI: Sidebar navigasi yang muncul di semua halaman dashboard.
// Menu ditampilkan berdasarkan role user yang sedang login.
// Footer (info user + logout) selalu terlihat di bagian bawah.
// ========================================

// 1. Import Link untuk navigasi antar halaman tanpa reload
import { Link, useLocation, useNavigate } from 'react-router-dom'

// 2. Import ikon dari lucide-react untuk setiap menu
import {
  LayoutDashboard,  // Ikon untuk Dashboard
  FileText,         // Ikon untuk Informasi Pelayanan
  Ticket,           // Ikon untuk Antrean
  Calendar,         // Ikon untuk Riwayat Antrean
  Users,            // Ikon untuk Dashboard Petugas
  LogOut,           // Ikon untuk Logout
  QrCode,           // Ikon untuk Scan Barcode
  Settings,         // Ikon untuk Pengaturan Akun
  HelpCircle,       // Ikon untuk Panduan
  BarChart3         // Ikon untuk Rekap Layanan
} from 'lucide-react'

// 3. Import hook useState dan useEffect dari React
import { useState, useEffect } from 'react'

// 4. Import useAuth untuk mendapatkan data user yang sedang login
import { useAuth } from '../context/AuthContext'

// 5. Import file CSS untuk styling sidebar
import './Sidebar.css'

// 6. Definisi komponen Sidebar
function Sidebar({ terbuka = false, onTutup = () => {} }) {
  // 7. Hook useLocation untuk mengetahui halaman aktif saat ini
  const lokasi = useLocation()

  // 8. Hook useNavigate untuk redirect setelah logout
  const navigate = useNavigate()

  // 9. Hook useAuth untuk mendapatkan data user dan fungsi logout
  const { user, logout } = useAuth()

  // 10. State untuk menyimpan nama user yang tampil di sidebar
  const [userName, setUserName] = useState('')

  // 11. State untuk menyimpan role user (pengunjung/petugas)
  const [userRole, setUserRole] = useState('')

  // 12. useEffect: Update nama dan role user saat data user berubah
  useEffect(() => {
    if (user) {
      // Jika data user ada dari AuthContext, gunakan data tersebut
      setUserName(user.profile?.nama || user.name || 'User')
      setUserRole(user.profile?.role || 'pengunjung')
    } else {
      // Fallback: baca dari localStorage jika AuthContext belum terisi
      setUserName(localStorage.getItem('userName') || 'User')
      setUserRole(localStorage.getItem('userRole') || 'pengunjung')
    }
  }, [user])

  // 13. Fungsi untuk menangani proses logout
  const handleLogout = async () => {
    try {
      // Panggil fungsi logout dari AuthContext (akan clear token di backend)
      await logout()
    } catch (err) {
      console.error('Logout error:', err)
    }
    // Hapus semua data user dari localStorage
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Redirect ke halaman login
    navigate('/login')
  }

  // 14. Fungsi untuk mengecek apakah path sedang aktif
  // Saat halaman berganti (misal menu diklik di HP), tutup menu samping
  useEffect(() => {
    onTutup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lokasi.pathname])

  const isActive = (path) => lokasi.pathname === path

  // 15. Daftar menu sidebar dengan role yang diizinkan
  // Setiap menu memiliki path, label, ikon, dan array roles
  const menuItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['pengunjung']  // Hanya untuk pengunjung
    },
    {
      path: '/informasi',
      label: 'Informasi Pelayanan',
      icon: FileText,
      roles: ['pengunjung', 'petugas_pendaftaran', 'petugas_pelayanan']  // Semua role
    },
    {
      path: '/antrean',
      label: 'Antrean',
      icon: Ticket,
      roles: ['pengunjung']  // Hanya untuk pengunjung
    },
    {
      path: '/riwayat',
      label: 'Riwayat Antrean',
      icon: Calendar,
      roles: ['pengunjung']  // Hanya untuk pengunjung
    },
    {
      path: '/petugas',
      label: 'Dashboard Petugas',
      icon: Users,
      roles: ['petugas_pendaftaran', 'petugas_pelayanan']  // Hanya untuk petugas
    },
    {
      path: '/scan-qr',
      label: 'Scan Barcode',
      icon: QrCode,
      roles: ['petugas_pendaftaran']  // Hanya petugas pendaftaran yang boleh scan
    },
    {
      path: '/rekap-layanan',
      label: 'Rekap Layanan',
      icon: BarChart3,
      roles: ['petugas_pendaftaran', 'petugas_pelayanan']  // Rekap permohonan per jenis layanan
    },
    {
      path: '/panduan',
      label: 'Panduan',
      icon: HelpCircle,
      roles: ['pengunjung', 'petugas_pendaftaran', 'petugas_pelayanan']
    },
    {
      path: '/pengaturan',
      label: 'Pengaturan Akun',
      icon: Settings,
      roles: ['pengunjung', 'petugas_pendaftaran', 'petugas_pelayanan']
    }
  ]

  // 16. Filter menu berdasarkan role user yang sedang login
  // Hanya menu yang role-nya sesuai dengan userRole yang akan ditampilkan
  const filteredMenu = menuItems.filter(item => {
    // Jika menu tidak punya properti roles, tampilkan untuk semua
    if (!item.roles) return true
    // Tampilkan menu hanya jika userRole ada di array roles
    return item.roles.includes(userRole)
  })

  // 17. Return JSX: Struktur tampilan sidebar
  return (
    // Kelas "terbuka" membuat sidebar muncul di layar HP (lihat Sidebar.css)
    <aside className={`sidebar ${terbuka ? 'terbuka' : ''}`}>
      {/* Label "MENU" di bagian atas sidebar */}
      <div className="sidebar-menu-label">MENU</div>

      {/* Container untuk daftar menu */}
      <nav className="sidebar-menu">
        {/* Looping filteredMenu untuk merender setiap item menu */}
        {filteredMenu.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            // Tambahkan class 'active' jika path sedang aktif
            className={`sidebar-menu-item ${isActive(item.path) ? 'active' : ''}`}
          >
            {/* Render ikon dari komponen yang tersimpan di item.icon */}
            <item.icon size={18} strokeWidth={2} className="menu-icon" />
            {/* Tampilkan label menu */}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer sidebar: Info user dan tombol logout */}
      {/* margin-top: auto di CSS akan mendorong footer ini ke bawah */}
      <div className="sidebar-footer">
        {/* Info user: nama dan role */}
        <div className="sidebar-user-info">
          <span className="user-name">{userName}</span>
          <span className="user-role">
            {userRole === 'petugas_pendaftaran' ? 'Petugas Pendaftaran' :
             userRole === 'petugas_pelayanan' ? 'Petugas Pelayanan' : 'Pengunjung'}
          </span>
        </div>

        {/* Tombol Logout dengan fungsi handleLogout */}
        <button onClick={handleLogout} className="sidebar-logout">
          <LogOut size={18} strokeWidth={2} className="logout-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

// 18. Export komponen Sidebar agar bisa digunakan di App.jsx
export default Sidebar