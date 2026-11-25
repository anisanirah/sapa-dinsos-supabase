// ========================================
// FILE: App.jsx
// DESKRIPSI: Komponen utama aplikasi yang mengatur routing.
// Setiap route dilindungi berdasarkan role user.
// ========================================

// 1. Import komponen routing dari react-router-dom
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// useState = menyimpan status menu samping (terbuka/tertutup) di HP
import { useState } from 'react'

// 2. Import AuthProvider dan useAuth dari AuthContext
import { AuthProvider, useAuth } from './context/AuthContext'

// 3. Import komponen ProtectedRoute untuk proteksi halaman
import ProtectedRoute from './components/ProtectedRoute'

// 4. Import komponen layout (Sidebar dan TopBar)
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

// 5. Halaman publik (tidak perlu login)
import Login from './pages/Login'
import Register from './pages/Register'
import LupaPassword from './pages/LupaPassword'
import ResetPassword from './pages/ResetPassword'
import VerifikasiEmail from './pages/VerifikasiEmail'

// 6. Halaman yang perlu login
import DashboardPengunjung from './pages/DashboardPengunjung'
import DashboardPetugas from './pages/DashboardPetugas'
import HalamanAntrean from './pages/HalamanAntrean'
import RiwayatAntrean from './pages/RiwayatAntrean'
import InformasiPelayanan from './pages/InformasiPelayanan'
import ProfilSaya from './pages/ProfilSaya'
import PengaturanAkun from './pages/PengaturanAkun'
import UbahKataSandi from './pages/UbahKataSandi'
import KeamananPrivasi from './pages/KeamananPrivasi'
import Notifikasi from './pages/Notifikasi'
import Panduan from './pages/Panduan'
import ScanQR from './pages/ScanQR'
// Rekap jumlah permohonan per jenis layanan (permintaan Dinsos)
import RekapLayanan from './pages/RekapLayanan'

// Daftar role petugas
const ROLE_PETUGAS = ['petugas_pendaftaran', 'petugas_pelayanan']

// 7. Layout utama: TopBar + Sidebar + konten
function AppLayout({ children }) {
  // Di HP/tablet, menu samping disembunyikan dan dibuka lewat tombol garis tiga (☰)
  const [menuTerbuka, setMenuTerbuka] = useState(false)

  return (
    <div className="app-layout">
      {/* TopBar: tombol ☰ membuka/menutup menu samping */}
      <TopBar onToggleMenu={() => setMenuTerbuka((t) => !t)} />
      <div className="app-body">
        {/* Sidebar: di HP muncul menimpa layar saat menuTerbuka = true */}
        <Sidebar terbuka={menuTerbuka} onTutup={() => setMenuTerbuka(false)} />
        {/* Lapisan gelap di belakang menu (khusus HP); diklik = menu tertutup */}
        {menuTerbuka && <div className="sidebar-latar" onClick={() => setMenuTerbuka(false)} />}
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}

// 8. Tampilan saat data login sedang dimuat
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p className="loading-text">Memuat...</p>
    </div>
  )
}

// 9. Pembungkus singkat: halaman terproteksi + layout
function Halaman({ roles, children }) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

// 10. Semua route aplikasi
function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  // Halaman awal sesuai role
  const getDefaultPage = () => {
    if (!user) return '/login'
    const role = user.profile?.role || localStorage.getItem('userRole')
    if (ROLE_PETUGAS.includes(role)) return '/petugas'
    return '/'
  }

  return (
    <Routes>
      {/* --- PUBLIK --- */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to={getDefaultPage()} replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={getDefaultPage()} replace />} />
      <Route path="/lupa-password" element={!user ? <LupaPassword /> : <Navigate to={getDefaultPage()} replace />} />
      {/* Reset & verifikasi boleh dibuka dalam keadaan login maupun tidak (dibuka dari email) */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verifikasi-email" element={<VerifikasiEmail />} />

      {/* --- PENGUNJUNG --- */}
      <Route path="/" element={<Halaman roles={['pengunjung']}><DashboardPengunjung /></Halaman>} />
      <Route path="/antrean" element={<Halaman roles={['pengunjung']}><HalamanAntrean /></Halaman>} />
      <Route path="/riwayat" element={<Halaman roles={['pengunjung']}><RiwayatAntrean /></Halaman>} />

      {/* --- PETUGAS --- */}
      {/* Satu alamat, isi dashboard menyesuaikan role (pendaftaran / pelayanan) */}
      <Route path="/petugas" element={<Halaman roles={ROLE_PETUGAS}><DashboardPetugas /></Halaman>} />
      {/* Scan barcode HANYA untuk petugas pendaftaran (sesuai alur) */}
      <Route path="/scan-qr" element={<Halaman roles={['petugas_pendaftaran']}><ScanQR /></Halaman>} />
      {/* Rekap layanan untuk kedua jenis petugas */}
      <Route path="/rekap-layanan" element={<Halaman roles={ROLE_PETUGAS}><RekapLayanan /></Halaman>} />

      {/* --- SEMUA ROLE YANG SUDAH LOGIN --- */}
      {/* Informasi Pelayanan: hanya pengunjung & petugas pendaftaran (petugas pelayanan tidak memerlukannya) */}
      <Route path="/informasi" element={<Halaman roles={['pengunjung', 'petugas_pendaftaran']}><InformasiPelayanan /></Halaman>} />
      <Route path="/profil" element={<Halaman><ProfilSaya /></Halaman>} />
      <Route path="/pengaturan" element={<Halaman><PengaturanAkun /></Halaman>} />
      <Route path="/ubah-kata-sandi" element={<Halaman><UbahKataSandi /></Halaman>} />
      <Route path="/keamanan" element={<Halaman><KeamananPrivasi /></Halaman>} />
      <Route path="/notifikasi" element={<Halaman><Notifikasi /></Halaman>} />
      <Route path="/panduan" element={<Halaman><Panduan /></Halaman>} />

      {/* --- FALLBACK --- */}
      <Route path="*" element={<Navigate to={getDefaultPage()} replace />} />
    </Routes>
  )
}

// 11. Komponen App utama
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
