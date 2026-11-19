// ========================================
// FILE: DashboardPetugas.jsx
// DESKRIPSI: Halaman /petugas. Isinya menyesuaikan role petugas yang login:
//  - petugas_pendaftaran -> Dashboard Pendaftaran (scan barcode, daftar langsung, batal)
//  - petugas_pelayanan   -> Dashboard Pelayanan (ambil, mulai layani, selesai, tidak hadir)
// Role selalu dibaca dari data login (backend), bukan dari pilihan di layar.
// ========================================
import { useAuth } from '../context/AuthContext'
import DashboardPendaftaran from './petugas/DashboardPendaftaran'
import DashboardPelayanan from './petugas/DashboardPelayanan'

function DashboardPetugas() {
  const { user } = useAuth()
  const role = user?.profile?.role

  if (role === 'petugas_pendaftaran') return <DashboardPendaftaran />
  if (role === 'petugas_pelayanan') return <DashboardPelayanan />

  return <div className="p-6 text-gray-600">Role akun ini tidak dikenali. Silakan hubungi administrator.</div>
}

export default DashboardPetugas
