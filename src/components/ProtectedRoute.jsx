// Navigate = mengalihkan ke halaman lain
import { Navigate } from 'react-router-dom'
// Data login dari AuthContext
import { useAuth } from '../context/AuthContext'

// Penjaga halaman: hanya pengguna login (dan role yang diizinkan) yang boleh masuk
export default function ProtectedRoute({ children, allowedRoles }) {
  // Ambil data pengguna & status memuat
  const { user, loading } = useAuth()

  // Saat data login masih dimuat, tampilkan animasi memuat
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  // Belum login -> arahkan ke halaman login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Cek role jika allowedRoles ditentukan
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.profile?.role || localStorage.getItem('userRole')
    if (!allowedRoles.includes(userRole)) {
      // Redirect ke halaman yang sesuai dengan role
      if (userRole === 'petugas_pendaftaran' || userRole === 'petugas_pelayanan') {
        return <Navigate to="/petugas" replace />
      }
      return <Navigate to="/" replace />
    }
  }

  return children
}