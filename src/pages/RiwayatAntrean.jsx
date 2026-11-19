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
import { STATUS_AKTIF, labelStatus } from '../lib/antrean'

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
  RefreshCw,     // Ikon refresh/putar ulang
  FileText,      // Ikon untuk dokumen/detail
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

  // 16. Fungsi untuk mendapatkan class CSS berdasarkan status antrean
  // Mengembalikan class yang berbeda untuk setiap status
  const getStatusClass = (status) => {
    switch (status) {
      case 'menunggu': return 'status-menunggu'
      case 'terverifikasi': return 'status-terverifikasi'
      case 'dipanggil': return 'status-dipanggil'
      case 'dilayani': return 'status-dilayani'
      case 'selesai': return 'status-selesai'
      case 'dibatalkan': return 'status-dibatalkan'
      default: return ''
    }
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

  // 21. Fungsi untuk mereset filter dan pencarian
  const resetFilter = () => {
    setFilterStatus('semua')
    setSearchQuery('')
  }

  // 22. Return JSX: Struktur tampilan halaman yang akan dirender ke browser
  return (
    <div className="riwayat-page">
      {/* --- BAGIAN 1: HEADER HALAMAN --- */}
      {/* Header berisi judul halaman, deskripsi, dan tombol aksi */}
      <div className="riwayat-header">
        <div className="header-icon">
          <FileText size={28} strokeWidth={2} />
        </div>
        <div className="header-content">
          <h1>Riwayat Antrean</h1>
          <p>Daftar antrean yang pernah Anda buat. Pantau status dan detail layanan di sini.</p>
        </div>
        {/* Tombol untuk navigasi ke halaman antrean */}
        <button
          className="btn-ambil-antrean"
          onClick={() => navigate('/antrean')}
        >
          <Ticket size={18} />
          Ambil Antrean Baru
        </button>
      </div>

      {/* --- BAGIAN 2: KONTEN UTAMA --- */}
      <div className="riwayat-content">

        {/* --- BAGIAN 2.1: FILTER DAN PENCARIAN --- */}
        {/* Panel untuk memfilter berdasarkan status dan mencari antrean */}
        <div className="filter-panel">
          <div className="filter-section">
            <div className="filter-label">
              <Filter size={16} />
              <span>Filter Status</span>
            </div>
            <div className="filter-buttons">
              {/* Tombol filter untuk setiap status */}
              <button
                className={`filter-btn ${filterStatus === 'semua' ? 'active' : ''}`}
                onClick={() => setFilterStatus('semua')}
              >
                Semua
                <span className="filter-count">{getCountByStatus('semua')}</span>
              </button>
              <button
                className={`filter-btn ${filterStatus === 'berjalan' ? 'active' : ''}`}
                onClick={() => setFilterStatus('berjalan')}
              >
                Berjalan
                <span className="filter-count">{getCountByStatus('berjalan')}</span>
              </button>
              <button
                className={`filter-btn ${filterStatus === 'selesai' ? 'active' : ''}`}
                onClick={() => setFilterStatus('selesai')}
              >
                Selesai
                <span className="filter-count">{getCountByStatus('selesai')}</span>
              </button>
              <button
                className={`filter-btn ${filterStatus === 'dibatalkan' ? 'active' : ''}`}
                onClick={() => setFilterStatus('dibatalkan')}
              >
                Dibatalkan
                <span className="filter-count">{getCountByStatus('dibatalkan')}</span>
              </button>
            </div>
          </div>

          <div className="search-section">
            {/* Search box untuk mencari nomor/layanan */}
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Cari nomor antrean atau layanan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {/* Tombol clear search (muncul hanya jika ada query) */}
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Hapus pencarian"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>
            {/* Tombol reset filter dan pencarian */}
            <button
              className="btn-reset"
              onClick={resetFilter}
              title="Reset filter"
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
        </div>

        {/* --- BAGIAN 2.2: DAFTAR RIWAYAT --- */}
        {/* Kondisi rendering berdasarkan state loading, error, dan data */}
        {isLoading ? (
          // 22a. Tampilan saat data masih dimuat (Loading Spinner)
          <div className="loading-container">
            <Loader2 className="loading-spinner" size={48} />
            <p>Memuat riwayat antrean Anda...</p>
          </div>
        ) : error ? (
          // 22b. Tampilan jika terjadi error saat fetch data
          <div className="error-container">
            <AlertCircle size={48} className="error-icon" />
            <p className="error-message">{error}</p>
            <button onClick={fetchRiwayat} className="btn-retry">
              Coba Lagi
            </button>
          </div>
        ) : riwayatFiltered.length === 0 ? (
          // 22c. Tampilan jika tidak ada riwayat yang sesuai filter
          <div className="empty-state">
            <div className="empty-icon">
              <Ticket size={64} strokeWidth={1.5} />
            </div>
            <h3>Tidak Ada Riwayat</h3>
            <p>
              {searchQuery || filterStatus !== 'semua'
                ? 'Tidak ada antrean yang sesuai dengan filter Anda.'
                : 'Anda belum memiliki riwayat antrean.'}
            </p>
            <button
              className="btn-ambil-antrean"
              onClick={() => {
                resetFilter()
                navigate('/antrean')
              }}
            >
              <Ticket size={18} />
              Ambil Antrean Sekarang
            </button>
          </div>
        ) : (
          // 22d. Tampilan jika ada data riwayat
          <div className="riwayat-list">
            {/* Info jumlah hasil pencarian */}
            <div className="result-info">
              <span>Menampilkan {riwayatFiltered.length} dari {riwayatAntrean.length} antrean</span>
            </div>

            {/* Looping untuk menampilkan setiap item riwayat */}
            {riwayatFiltered.map((item) => (
              <div key={item.id} className="riwayat-card">
                {/* Bagian kiri: Nomor antrean dan detail */}
                <div className="riwayat-main">
                  <div className="riwayat-nomor">
                    <Ticket size={20} />
                    <strong>{item.nomor_antrean}</strong>
                  </div>
                  <div className="riwayat-detail">
                    <h4>{item.layanan?.nama_layanan || '-'}</h4>
                    <div className="riwayat-meta">
                      <span className="meta-item">
                        <Calendar size={14} />
                        {formatTanggal(item.tanggal || item.created_at)}
                      </span>
                      <span className="meta-item">
                        <Clock size={14} />
                        {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>
                    {/* Alasan pembatalan (misal: "Tidak hadir saat dipanggil") */}
                    {item.status === 'dibatalkan' && item.alasan_batal && (
                      <p className="text-xs text-red-600 mt-1">Alasan: {item.alasan_batal}</p>
                    )}
                  </div>
                </div>

                {/* Bagian kanan: Status dan aksi */}
                <div className="riwayat-action">
                  <div className={`status-badge ${getStatusClass(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <span>{getStatusLabel(item.status)}</span>
                  </div>
                  <button
                    className="btn-detail"
                    onClick={() => navigate('/antrean')}
                    title="Lihat detail"
                  >
                    Detail
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 23. Export komponen agar bisa digunakan di file lain (App.jsx)
export default RiwayatAntrean