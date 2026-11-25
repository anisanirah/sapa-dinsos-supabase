// ========================================
// FILE: RiwayatAntrean.jsx
// DESKRIPSI: Halaman untuk menampilkan daftar riwayat antrean
// yang pernah dibuat oleh pengguna. Pengguna dapat melihat
// status, tanggal, dan detail layanan dari setiap antrean.
// Data diambil dari Supabase (lewat lib/api.js) (/antreans/my).
// ========================================

// 1. Import hook yang dibutuhkan dari React
// useState: Untuk mengelola state/data yang dapat berubah
// useEffect: Untuk menjalankan kode saat komponen dimuat
import { useState, useEffect } from 'react'

// 2. Import useNavigate dari react-router-dom untuk navigasi antar halaman
// Digunakan agar tombol "Ambil Antrean" bisa mengarahkan ke halaman antrean
import { useNavigate } from 'react-router-dom'

// 3. Import api dari lib/api.js untuk melakukan request HTTP ke Supabase
// File ini sudah dikonfigurasi dengan token autentikasi otomatis
import api from '../lib/api'
import { STATUS_AKTIF, labelStatus, WARNA_STATUS } from '../lib/antrean'
// Banner judul bersama
import KepalaHalaman from '../components/KepalaHalaman'

// 4. Import ikon dari library lucide-react untuk visualisasi UI
import {
  Ticket,        // Ikon untuk nomor antrean/tiket
  Calendar,      // Ikon untuk tanggal
  Clock,         // Ikon untuk waktu
  CheckCircle2,  // Ikon untuk status selesai
  XCircle,       // Ikon untuk status dibatalkan
  AlertCircle,   // Ikon untuk status menunggu
  Play,          // Ikon untuk status sedang dilayani
  Filter,        // Ikon untuk filter
  Search,        // Ikon untuk pencarian
  ArrowRight,    // Ikon panah kanan untuk navigasi
  Loader2        // Ikon loading spinner
} from 'lucide-react'

// 5. Import file CSS untuk styling halaman ini
import './RiwayatAntrean.css'

// 6. Definisi komponen RiwayatAntrean
function RiwayatAntrean() {
  // 7. Hook useNavigate untuk mengarahkan user ke halaman lain
  const navigate = useNavigate()

  // 8. State untuk menyimpan daftar riwayat antrean dari API
  // Hanya berisi antrean dengan status 'selesai' atau 'dibatalkan'
  const [riwayatAntrean, setRiwayatAntrean] = useState([])

  // 9. State untuk filter status yang sedang aktif
  // Default 'semua' berarti menampilkan semua status
  const [filterStatus, setFilterStatus] = useState('semua')

  // 10. State untuk kata kunci pencarian
  // Digunakan untuk mencari berdasarkan nomor atau nama layanan
  const [searchQuery, setSearchQuery] = useState('')

  // 11. State untuk menandakan apakah data sedang dimuat (loading)
  const [isLoading, setIsLoading] = useState(true)

  // 12. State untuk menyimpan pesan error jika fetch gagal
  const [error, setError] = useState(null)

  // 13. useEffect: Dijalankan sekali saat komponen pertama kali dimuat
  // Fungsinya untuk mengambil data riwayat antrean dari backend API
  useEffect(() => {
    fetchRiwayat()
  }, [])

  // 14. Fungsi untuk mengambil data riwayat antrean dari backend API
  // Endpoint: GET /api/antreans/my
  const fetchRiwayat = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 14a. Ambil semua antrean milik user yang login
      const response = await api.get('/antreans/my')
      const data = response.data

      // 14b. Filter hanya yang statusnya selesai atau dibatalkan (riwayat)
      // Tampilkan SEMUA antrean (yang masih berjalan, selesai, maupun dibatalkan)
      setRiwayatAntrean(data || [])
    } catch (err) {
      console.error('Error fetching riwayat:', err)
      setError('Gagal memuat riwayat antrean. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  // 15. Fungsi untuk memformat tanggal ke format Indonesia
  // Mengubah format YYYY-MM-DD menjadi "6 November 2026"
  const formatTanggal = (tanggal) => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' }
    return new Date(tanggal).toLocaleDateString('id-ID', options)
  }

  // 17. Fungsi untuk mendapatkan label status yang lebih deskriptif
  const getStatusLabel = (status) => labelStatus(status)

  // 18. Fungsi untuk mendapatkan ikon berdasarkan status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'menunggu': return <AlertCircle size={16} />
      case 'terverifikasi': return <CheckCircle2 size={16} />
      case 'dipanggil': return <Play size={16} />
      case 'dilayani': return <Clock size={16} />
      case 'selesai': return <CheckCircle2 size={16} />
      case 'dibatalkan': return <XCircle size={16} />
      default: return <Ticket size={16} />
    }
  }

  // 19. Fungsi untuk memfilter riwayat berdasarkan status dan pencarian
  // Menggabungkan filter status dan pencarian kata kunci
  const riwayatFiltered = riwayatAntrean.filter(item => {
    // 19a. Filter berdasarkan status
    // Filter "berjalan" = semua status yang belum selesai/dibatalkan
    const matchStatus = filterStatus === 'semua' ||
      (filterStatus === 'berjalan' ? STATUS_AKTIF.includes(item.status) : item.status === filterStatus)

    // 19b. Filter berdasarkan kata kunci pencarian (case-insensitive)
    const nomor = item.nomor_antrean || ''
    const layanan = item.layanan?.nama_layanan || ''
    const matchSearch = nomor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       layanan.toLowerCase().includes(searchQuery.toLowerCase())

    return matchStatus && matchSearch
  })

  // 20. Fungsi untuk menghitung jumlah antrean per status
  // Digunakan untuk menampilkan badge jumlah pada filter
  const getCountByStatus = (status) => {
    if (status === 'semua') return riwayatAntrean.length
    if (status === 'berjalan') return riwayatAntrean.filter(item => STATUS_AKTIF.includes(item.status)).length
    return riwayatAntrean.filter(item => item.status === status).length
  }

  // Daftar tombol filter status (kunci filter + label yang tampil)
  const DAFTAR_FILTER = [
    ['semua', 'Semua'],
    ['berjalan', 'Berjalan'],
    ['selesai', 'Selesai'],
    ['dibatalkan', 'Dibatalkan'],
  ]

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* --- BAGIAN 1: BANNER JUDUL + tombol Ambil Antrean Baru --- */}
      <KepalaHalaman
        ikon={Calendar}
        judul="Riwayat Antrean"
        deskripsi="Lihat daftar antrean yang pernah Anda buat, lengkap dengan status dan detail layanan."
        aksi={
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-3 rounded-xl bg-[#0d5bc4] hover:bg-[#0b4fa9] px-7 py-3.5 font-bold text-white shadow-md shadow-blue-200 transition"
          >
            <Ticket size={22} />
            Ambil Antrean Baru
          </button>
        }
      />

      {/* --- BAGIAN 2: FILTER STATUS + PENCARIAN (satu baris) --- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 mb-6">
        <div className="flex items-center gap-2 mb-3 font-bold text-[#0f1e33]">
          <Filter size={20} className="text-[#1565c0]" />
          <span>Filter Status</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Tombol filter berbentuk pil, lengkap dengan jumlah antrean */}
          <div className="flex flex-wrap gap-3">
            {DAFTAR_FILTER.map(([kunci, label]) => {
              const aktif = filterStatus === kunci
              return (
                <button
                  key={kunci}
                  onClick={() => setFilterStatus(kunci)}
                  className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 font-semibold transition ${
                    aktif
                      ? 'bg-[#0d5bc4] border-[#0d5bc4] text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-[#1976d2] hover:text-[#1565c0]'
                  }`}
                >
                  {label}
                  <span className={`min-w-[24px] rounded-full px-1.5 text-sm ${aktif ? 'bg-white/30' : 'bg-slate-100 text-slate-700'}`}>
                    {getCountByStatus(kunci)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Garis pemisah tegak (hanya di layar lebar) */}
          <span className="hidden lg:block w-px h-12 bg-slate-200" aria-hidden="true" />

          {/* Kotak pencarian nomor antrean / nama layanan */}
          <div className="relative flex-1">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nomor antrean atau layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-10 text-slate-800 focus:outline-none focus:border-[#1976d2] focus:ring-4 focus:ring-blue-100"
            />
            {/* Tombol hapus pencarian (muncul hanya jika ada isian) */}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                title="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
              >
                <XCircle size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- BAGIAN 3: DAFTAR RIWAYAT --- */}
      {/* Tampilan berbeda untuk keadaan: memuat, gagal, kosong, dan ada data */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-500">
          <Loader2 className="animate-spin mx-auto mb-3 text-[#1976d2]" size={44} />
          <p>Memuat riwayat antrean Anda...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircle size={44} className="mx-auto mb-3 text-red-500" />
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchRiwayat} className="rounded-xl bg-[#0d5bc4] px-6 py-2.5 font-semibold text-white">
            Coba Lagi
          </button>
        </div>
      ) : riwayatFiltered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-14 px-6">
          <Ticket size={56} strokeWidth={1.5} className="mx-auto mb-3 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800">Tidak Ada Riwayat</h3>
          <p className="text-slate-500">
            {searchQuery || filterStatus !== 'semua'
              ? 'Tidak ada antrean yang sesuai dengan filter Anda.'
              : 'Anda belum memiliki riwayat antrean.'}
          </p>
        </div>
      ) : (
        <>
          {/* Info jumlah hasil */}
          <p className="text-slate-700 mb-4">
            Menampilkan {riwayatFiltered.length} dari {riwayatAntrean.length} riwayat antrean
          </p>

          <div className="space-y-4">
            {/* Satu kartu untuk setiap antrean */}
            {riwayatFiltered.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 flex flex-col md:flex-row md:items-center gap-4">
                {/* Nomor antrean dalam kotak biru muda */}
                <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-6 py-4 text-2xl font-extrabold text-[#1565c0] md:w-40">
                  <Ticket size={24} />
                  {item.nomor_antrean}
                </div>
                {/* Garis pemisah tegak */}
                <span className="hidden md:block w-px self-stretch bg-slate-200" aria-hidden="true" />

                {/* Nama layanan, tanggal, jam, dan alasan batal */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-[#0f1e33]">{item.layanan?.nama_layanan || '-'}</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={16} />
                      {formatTanggal(item.tanggal || item.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={16} />
                      {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  {/* Alasan pembatalan (misal: "Tidak hadir saat dipanggil") */}
                  {item.status === 'dibatalkan' && item.alasan_batal && (
                    <p className="flex items-start gap-1.5 mt-1.5 text-red-600">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      Alasan pembatalan: {item.alasan_batal}
                    </p>
                  )}
                </div>

                {/* Status + tombol Detail (berdampingan) */}
                <div className="flex items-center gap-4 md:ml-auto">
                  <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold whitespace-nowrap ${WARNA_STATUS[item.status] || 'bg-slate-100 text-slate-700'}`}>
                    {getStatusIcon(item.status)}
                    {getStatusLabel(item.status)}
                  </span>
                  <button
                    onClick={() => navigate('/antrean')}
                    title="Lihat detail"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1565c0] px-5 py-2 font-bold text-[#1565c0] hover:bg-blue-50 transition"
                  >
                    Detail
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}


export default RiwayatAntrean