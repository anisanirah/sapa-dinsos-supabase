// ========================================
// FILE: DashboardPengunjung.jsx
// DESKRIPSI: Halaman Dashboard untuk Pengunjung (role: pengunjung).
// Menampilkan banner hero, daftar layanan populer, form ambil antrean,
// status antrean aktif pengguna, dan informasi pelayanan.
// Data layanan dan antrean diambil dari Supabase (lewat lib/api.js).
// 
// ALUR SESUAI FLOWCHART TAHAP 1:
// Pengunjung daftar online → Pilih layanan → Sistem generate 
// KODE ANTREAN (A001) + BARCODE → Status: MENUNGGU
// ========================================

// 1. Import hook useState dan useEffect dari React
// useState: Untuk mengelola state/data yang dapat berubah di komponen
// useEffect: Untuk menjalankan efek samping seperti fetch API saat komponen dimuat
import { useState, useEffect } from 'react'

// 2. Import useNavigate dari react-router-dom untuk navigasi antar halaman
// Digunakan untuk mengarahkan user ke halaman Informasi Pelayanan atau Antrean Saya
import { useNavigate } from 'react-router-dom'

// 3. Import api dari lib/api.js untuk melakukan request HTTP ke Supabase
// File ini sudah dikonfigurasi dengan token autentikasi otomatis di header
import api from '../lib/api'
// Data login (untuk cek status verifikasi email)
import { useAuth } from '../context/AuthContext'
import { pesanError } from '../lib/antrean'
import FormDataTamu, { DATA_TAMU_KOSONG } from '../components/FormDataTamu'
// Modal tiket bukti pendaftaran antrean
import TiketAntrean from '../components/TiketAntrean'

// 5. Import ikon dari library lucide-react untuk visualisasi UI
import {
  Heart,          // Ikon untuk Bantuan Sosial Tunai
  Users,          // Ikon untuk Rehabilitasi Sosial
  ShieldCheck,    // Ikon untuk Perlindungan Sosial
  Layers,         // Ikon untuk Pemberdayaan Sosial
  Ticket,         // Ikon untuk antrean/tiket
  CalendarDays,   // Ikon untuk tanggal/riwayat
  Clock,          // Ikon untuk waktu/jam
  FileText,       // Ikon untuk dokumen/informasi
  Info,           // Ikon untuk informasi
  ArrowRight,     // Ikon panah kanan untuk navigasi
  Loader2,        // Ikon loading spinner
  AlertCircle,    // Ikon peringatan untuk error
  X               // Ikon X untuk tutup modal formulir
} from 'lucide-react'

// 6. Import file CSS untuk styling halaman ini
import './DashboardPengunjung.css'

// 7. Definisi komponen DashboardPengunjung
function DashboardPengunjung() {
  // 8. Hook useNavigate untuk mengarahkan user ke halaman lain
  const navigate = useNavigate()

  // 9. State untuk menyimpan daftar layanan dari database
  // Data ini akan diisi dari response API GET /api/layanans
  const [layanans, setLayanans] = useState([])

  // 10. State untuk menyimpan ID layanan yang dipilih user di dropdown
  // Nilai default kosong string, user harus pilih sebelum ambil antrean
  const [selectedLayanan, setSelectedLayanan] = useState('')

  // 11. State untuk menyimpan daftar antrean milik user yang login
  // Data ini akan diisi dari response API GET /api/antreans/my
  const [antreans, setAntreans] = useState([])

  // 12. State untuk menandakan apakah sedang proses ambil antrean
  // true = tombol "Ambil Antrean" disabled dan tampilkan spinner
  const [loading, setLoading] = useState(false)

  // 13. State untuk menyimpan pesan error jika gagal ambil antrean
  const [error, setError] = useState(null)

  // 14. State untuk menyimpan data antrean yang BARU saja dibuat
  // Dipakai untuk menampilkan Modal QR Code + Barcode setelah sukses
  // null = tidak ada modal, object = tampilkan modal QR Code
  const [antreanBaru, setAntreanBaru] = useState(null)

  // 15. State untuk menampilkan/menyembunyikan Modal QR Code
  const [showQRModal, setShowQRModal] = useState(false)

  // Formulir data pengunjung (muncul setelah klik "Ambil Nomor Antrean")
  const [showForm, setShowForm] = useState(false)
  const [dataTamu, setDataTamu] = useState(DATA_TAMU_KOSONG)
  const [pernyataan, setPernyataan] = useState(false)
  const [errorKolom, setErrorKolom] = useState({})

  // Data pengguna login: email_verified_at kosong = email belum diverifikasi
  const { user, refreshUser } = useAuth()
  const emailBelumVerifikasi = user && !user.email_verified_at
  // Status tombol "Kirim ulang email verifikasi"
  const [kirimUlang, setKirimUlang] = useState({ loading: false, pesan: '' })

  // Kirim ulang email verifikasi
  const handleKirimUlang = async () => {
    setKirimUlang({ loading: true, pesan: '' })
    try {
      const res = await api.post('/email/kirim-ulang')
      setKirimUlang({ loading: false, pesan: res.data.message })
      // Jika ternyata sudah terverifikasi, muat ulang data pengguna
      if (res.data.sudah_terverifikasi) await refreshUser()
    } catch (err) {
      setKirimUlang({ loading: false, pesan: pesanError(err, 'Gagal mengirim ulang email.') })
    }
  }

  // 16. useEffect: Dijalankan sekali saat komponen pertama kali dimuat (mount)
  // Fungsinya untuk fetch data layanan dan antrean user dari API
  useEffect(() => {
    fetchLayanans()
    fetchAntreans()
  }, [])

  // 17. Fungsi untuk mengambil daftar layanan dari backend API
  // Endpoint: GET /api/layanans
  const fetchLayanans = async () => {
    try {
      const res = await api.get('/layanans')
      setLayanans(res.data)
    } catch (err) {
      console.error('Error fetching layanans:', err)
      // Tidak set error agar UI tetap bisa dipakai
    }
  }

  // 18. Fungsi untuk mengambil daftar antrean milik user yang login
  // Endpoint: GET /api/antreans/my
  const fetchAntreans = async () => {
    try {
      const res = await api.get('/antreans/my')
      setAntreans(res.data)
    } catch (err) {
      console.error('Error fetching antreans:', err)
    }
  }

  // 19. Fungsi untuk menangani proses pengambilan antrean
  // Dipanggil saat user klik tombol "Ambil Nomor Antrean"
  // SESUAI FLOWCHART TAHAP 1: Sistem generate KODE ANTREAN + BARCODE
  // 19a. Klik "Ambil Nomor Antrean" -> buka formulir data pengunjung (buku tamu digital)
  const bukaFormData = () => {
    if (!selectedLayanan) {
      setError('Pilih layanan terlebih dahulu.')
      return
    }
    if (emailBelumVerifikasi) {
      setError('Verifikasi email Anda terlebih dahulu sebelum mengambil antrean.')
      return
    }
    setError(null)
    setErrorKolom({})
    // Isi otomatis dari profil & antrean terakhir agar pengunjung tidak mengetik ulang
    const terakhir = antreans[0]
    setDataTamu({
      ...DATA_TAMU_KOSONG,
      nama_pengunjung: user?.profile?.nama || user?.name || '',
      no_telp_pengunjung: user?.profile?.no_telp || '',
      desa_kelurahan: terakhir?.desa_kelurahan || '',
      kecamatan: terakhir?.kecamatan || '',
    })
    setPernyataan(false)
    setShowForm(true)
  }

  // 19b. Kirim formulir -> backend membuat KODE ANTREAN + BARCODE (Tahap 1 flowchart)
  const handleAmbilAntrean = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setErrorKolom({})

    try {
      const response = await api.post('/antreans', {
        ...dataTamu,
        layanan_id: selectedLayanan,
        pernyataan: pernyataan,
      })

      // Tutup formulir, tampilkan modal QR Code
      setShowForm(false)
      setAntreanBaru(response.data.antrean)
      setShowQRModal(true)
      setSelectedLayanan('')
      await fetchAntreans()
    } catch (err) {
      // Error per kolom (misal: desa kosong) ditampilkan di bawah kolomnya
      const errBackend = err.response?.data?.errors || {}
      setErrorKolom(Object.fromEntries(Object.entries(errBackend).map(([k, v]) => [k, v[0]])))
      setError(pesanError(err, 'Gagal mengambil antrean'))
      // Mungkin email baru saja diverifikasi di tab lain: perbarui data pengguna
      if (err.response?.data?.kode === 'email_belum_terverifikasi') {
        refreshUser().catch(() => {})
      }
    } finally {
      setLoading(false)
    }
  }

  // 20. Fungsi helper untuk menentukan class CSS berdasarkan status antrean
  // Mengembalikan class yang berbeda untuk setiap status
  const getStatusColor = (status) => {
    const colors = {
      menunggu: 'status-menunggu',
      terverifikasi: 'status-terverifikasi',
      dipanggil: 'status-dipanggil',
      dilayani: 'status-dilayani',
      selesai: 'status-selesai',
      dibatalkan: 'status-dibatalkan',
    }
    return colors[status] || ''
  }

  // 21. Fungsi helper untuk menampilkan label status dalam Bahasa Indonesia
  const getStatusLabel = (status) => {
    const labels = {
      menunggu: 'Menunggu',
      terverifikasi: 'Terverifikasi',
      dipanggil: 'Dipanggil',
      dilayani: 'Dilayani',
      selesai: 'Selesai',
      dibatalkan: 'Dibatalkan',
    }
    return labels[status] || status
  }

  // 22. Data statis untuk layanan populer (tampilan saja)
  // Nanti bisa diganti dengan data dari API jika ada field "populer"
  const layananPopuler = [
    { icon: Heart, label: 'Bantuan Sosial Tunai', color: 'blue' },
    { icon: Users, label: 'Rehabilitasi Sosial', color: 'purple' },
    { icon: ShieldCheck, label: 'Perlindungan Sosial', color: 'indigo' },
    { icon: Layers, label: 'Pemberdayaan Sosial', color: 'pink' },
  ]

  // 23. Return JSX: Struktur tampilan Dashboard Pengunjung
  return (
    <div className="dashboard-pengunjung">

      {/* ======================================== */}
      {/* BAGIAN 1: BANNER HERO (SUDAH DIHAPUS GEDUNG) */}
      {/* ======================================== */}
      {/* Banner utama dengan judul sistem saja, tanpa ilustrasi gedung */}
      <div className="hero-banner">
        <div className="hero-content">
          <h1>
            Selamat datang di SAPA DINSOS <br />
            Dinas Sosial Kabupaten Majalengka
          </h1>
          <p>
            Ambil antrean, pantau status, dan akses informasi layanan sosial 
            secara online.
          </p>
        </div>
        {/* ⚠️ CATATAN: hero-illustration (bangunan) sudah DIHAPUS sesuai permintaan */}
      </div>

      {/* ======================================== */}
      {/* BAGIAN 2: LAYANAN POPULER */}
      {/* ======================================== */}
      {/* Menampilkan 4 layanan utama dalam bentuk kartu */}
      {/* PERINGATAN: email belum diverifikasi -> belum bisa ambil antrean online */}
      {emailBelumVerifikasi && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-semibold">Email Anda belum diverifikasi</p>
            <p>
              Buka email dari <strong>SAPA DINSOS</strong> yang dikirim ke <strong>{user.email}</strong>,
              lalu klik tombol <em>Verifikasi Email</em>. Setelah itu Anda bisa mengambil antrean online.
            </p>
            {kirimUlang.pesan && <p className="mt-1 text-amber-800">{kirimUlang.pesan}</p>}
          </div>
          <button
            onClick={handleKirimUlang}
            disabled={kirimUlang.loading}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {kirimUlang.loading ? 'Mengirim...' : 'Kirim Ulang Email'}
          </button>
        </div>
      )}

      <div className="section-layanan">
        <div className="section-header">
          <h2>Layanan Populer</h2>
          {/* Tombol untuk navigasi ke halaman Informasi Pelayanan */}
          <button 
            className="btn-lihat-semua" 
            onClick={() => navigate('/informasi')}
          >
            Lihat Semua Layanan <ArrowRight size={16} />
          </button>
        </div>
        <div className="layanan-grid">
          {/* Looping array layananPopuler untuk render kartu */}
          {layananPopuler.map((item, idx) => (
            <div key={idx} className={`layanan-card ${item.color}`}>
              <item.icon size={40} strokeWidth={1.5} />
              <h3>{item.label}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================== */}
      {/* BAGIAN 3: 2 KOLOM (Ambil Antrean & Antrean Saya) */}
      {/* ======================================== */}
      <div className="dua-kolom">

        {/* Kolom Kiri: Form Ambil Nomor Antrean */}
        <div className="card-ambil-antrean">
          <div className="card-header-ambil">
            <Ticket size={24} strokeWidth={2} className="card-icon" />
            <h2>Ambil Nomor Antrean</h2>
          </div>
          <p className="card-desc">
            Pilih layanan yang ingin Anda tuju dan dapatkan nomor antrean 
            beserta QR Code untuk check-in di kantor.
          </p>

          {/* Tampilkan pesan error jika ada */}
          {error && (
            <div className="alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form pilih layanan */}
          <div className="form-group">
            <label>Pilih Layanan</label>
            <select
              value={selectedLayanan}
              onChange={(e) => setSelectedLayanan(e.target.value)}
              className="select-layanan"
            >
              <option value="">-- Pilih Layanan --</option>
              {/* Looping data layanan dari API untuk option dropdown */}
              {layanans.map((layanan) => (
                <option key={layanan.id} value={layanan.id}>
                  {layanan.nama_layanan}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Ambil Antrean dengan loading state */}
          <button
            onClick={bukaFormData}
            disabled={loading || !selectedLayanan}
            className="btn-ambil-antrean"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Memproses...
              </>
            ) : (
              <>
                <Ticket size={18} />
                Ambil Nomor Antrean
              </>
            )}
          </button>
        </div>

        {/* Kolom Kanan: Antrean Saya */}
        <div className="card-antrean-saya">
          <div className="card-header-ambil">
            <CalendarDays size={24} strokeWidth={2} className="card-icon" />
            <h2>Antrean Saya</h2>
          </div>

          {/* Tampilan jika user belum punya antrean */}
          {antreans.length === 0 ? (
            <div className="empty-state">
              <Ticket size={64} strokeWidth={1} className="empty-icon" />
              <h3>Belum ada antrean</h3>
              <p>Anda belum mengambil nomor antrean.</p>
            </div>
          ) : (
            /* Tampilkan 3 antrean terbaru user */
            <div className="antrean-list">
              {antreans.slice(0, 3).map((antrean) => (
                <div key={antrean.id} className="antrean-item">
                  <div className="antrean-nomor">
                    {antrean.nomor_antrean}
                  </div>
                  <div className="antrean-info">
                    <div className="antrean-layanan">
                      {antrean.layanan?.nama_layanan}
                    </div>
                    <div className="antrean-waktu">
                      <Clock size={12} />
                      {new Date(antrean.created_at).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <span className={`status-badge ${getStatusColor(antrean.status)}`}>
                    {getStatusLabel(antrean.status)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tombol untuk melihat semua antrean */}
          {antreans.length > 0 && (
            <button
              className="btn-lihat-semua-antrean"
              onClick={() => navigate('/antrean')}
            >
              Lihat Semua Antrean Saya <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ======================================== */}
      {/* BAGIAN 4: INFORMASI PELAYANAN */}
      {/* ======================================== */}
      {/* Card informasi operasional dan tombol ke halaman detail */}
      <div className="card-info-pelayanan">
        <div className="card-header-ambil">
          <Info size={24} strokeWidth={2} className="card-icon" />
          <h2>Informasi Pelayanan</h2>
        </div>
        <div className="info-grid">
          {/* Info Jam Operasional */}
          <div className="info-item">
            <Clock size={28} strokeWidth={1.5} className="info-icon" />
            <div>
              <h4>Jam Operasional</h4>
              <p>Senin – Jumat</p>
              <p className="jam-waktu">08.00 – 15.00 WIB</p>
            </div>
          </div>

          {/* Info Petunjuk Pelayanan */}
          <div className="info-item">
            <FileText size={28} strokeWidth={1.5} className="info-icon" />
            <div>
              <h4>Petunjuk Pelayanan</h4>
              <p>Lihat alur dan tata cara pengambilan antrean.</p>
            </div>
          </div>

          {/* Info Persyaratan Layanan */}
          <div className="info-item">
            <FileText size={28} strokeWidth={1.5} className="info-icon" />
            <div>
              <h4>Persyaratan Layanan</h4>
              <p>Cek dokumen yang diperlukan untuk setiap layanan.</p>
            </div>
          </div>

          {/* Tombol navigasi ke halaman Informasi Pelayanan */}
          <button 
            className="btn-info-pelayanan" 
            onClick={() => navigate('/informasi')}
          >
            <ArrowRight size={16} />
            Lihat Informasi Pelayanan
          </button>
        </div>
      </div>

      {/* ======================================== */}
      {/* BAGIAN 5: MODAL QR CODE + BARCODE */}
      {/* ======================================== */}
      {/* Muncul setelah user berhasil ambil antrean (SESUAI FLOWCHART TAHAP 1) */}
      {/* Menampilkan Nomor Antrean + QR Code yang bisa di-scan petugas */}
      {/* --- MODAL FORMULIR DATA PENGUNJUNG (buku tamu digital) --- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-4" onClick={() => !loading && setShowForm(false)}>
          <form
            onSubmit={handleAmbilAntrean}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 relative space-y-4"
          >
            <button type="button" onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Data Pengunjung</h3>
              <p className="text-sm text-gray-500">
                Layanan: <strong>{layanans.find((l) => String(l.id) === String(selectedLayanan))?.nama_layanan}</strong>.
                Data ini menggantikan buku tamu di kantor Dinas Sosial.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">{error}</div>
            )}

            <FormDataTamu
              data={dataTamu}
              onUbah={(kolom, nilai) => setDataTamu((d) => ({ ...d, [kolom]: nilai }))}
              errors={errorKolom}
            />

            {/* Pernyataan: pengganti tanda tangan di buku tamu manual */}
            <label className="flex items-start gap-3 text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-lg p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pernyataan}
                onChange={(e) => setPernyataan(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#1976d2]"
              />
              <span>Saya menyatakan data di atas <strong>benar</strong> dan bersedia datang ke kantor Dinas Sosial <strong>hari ini</strong> untuk diverifikasi petugas.</span>
            </label>
            {errorKolom.pernyataan && <p className="text-xs text-red-600 -mt-2">{errorKolom.pernyataan}</p>}

            {/* Tombol: di HP bertumpuk (tombol utama di atas), di layar lebar berdampingan */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700">
                Batal
              </button>
              <button type="submit" disabled={loading || !pernyataan} className="px-5 py-2.5 rounded-lg bg-[#1976d2] hover:bg-[#1565c0] text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 className="animate-spin" size={18} /> Memproses...</> : <><Ticket size={18} /> Ambil Nomor Antrean</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL TIKET / BUKTI PENDAFTARAN (muncul setelah antrean berhasil dibuat) --- */}
      {showQRModal && antreanBaru && (
        <TiketAntrean
          antrean={antreanBaru}
          onTutup={() => setShowQRModal(false)}
          onLihatStatus={() => {
            setShowQRModal(false)
            navigate('/antrean')
          }}
        />
      )}
    </div>
  )
}

// 24. Export komponen agar bisa digunakan di App.jsx
export default DashboardPengunjung