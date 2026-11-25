// ========================================
// FILE: DashboardPengunjung.jsx
// DESKRIPSI: Halaman Dashboard untuk Pengunjung (role: pengunjung).
// Menampilkan banner judul, form ambil antrean,
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
import { pesanError, WARNA_STATUS } from '../lib/antrean'
// Nama aplikasi, instansi, dan jam pelayanan (satu sumber untuk semua halaman)
import { NAMA_APLIKASI, INSTANSI, HARI_LAYANAN, JAM_LAYANAN } from '../lib/merek'
// Banner judul bersama
import KepalaHalaman from '../components/KepalaHalaman'
import FormDataTamu, { DATA_TAMU_KOSONG } from '../components/FormDataTamu'
// Modal tiket bukti pendaftaran antrean
import TiketAntrean from '../components/TiketAntrean'

// 5. Import ikon dari library lucide-react untuk visualisasi UI
import {
  Ticket,         // Ikon untuk antrean/tiket
  CalendarDays,   // Ikon untuk tanggal antrean
  Clock,          // Ikon untuk waktu/jam
  FileText,       // Ikon untuk dokumen persyaratan
  Info,           // Ikon untuk informasi
  ArrowRight,     // Ikon panah kanan untuk navigasi
  ChevronDown,    // Ikon panah bawah pada pilihan layanan
  Loader2,        // Ikon loading spinner
  AlertCircle,    // Ikon peringatan untuk error
  X               // Ikon X untuk tutup modal formulir
} from 'lucide-react'

// 6. Import file CSS lama: tampilan halaman ini sekarang memakai kelas Tailwind,
// tetapi beberapa kelas di file ini masih dipakai halaman Antrean, jadi tetap dimuat
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

  // 22. Ubah waktu antrean menjadi teks singkat, contoh: "20/11/2026, 14.11.44"
  const formatWaktuSingkat = (waktu) => new Date(waktu).toLocaleString('id-ID')

  // 23. Return JSX: Struktur tampilan Dashboard Pengunjung
  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">

      {/* ======================================== */}
      {/* BAGIAN 1: BANNER JUDUL */}
      {/* ======================================== */}
      {/* Banner biru muda berisi nama aplikasi & instansi (komponen bersama) */}
      <KepalaHalaman
        judul={NAMA_APLIKASI}
        subjudul={INSTANSI}
        deskripsi="Sistem layanan antrean dan informasi pelayanan sosial yang mudah, cepat, dan transparan."
        judulBiru
        garisBawah
      />

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

      {/* ======================================== */}
      {/* BAGIAN 2: 2 KOLOM (Ambil Antrean & Antrean Saya) */}
      {/* ======================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Kolom Kiri: Form Ambil Nomor Antrean */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-3 mb-3">
            <Ticket size={28} strokeWidth={2} className="text-[#1565c0]" />
            <h2 className="text-xl font-bold text-[#0f1e33]">Ambil Nomor Antrean</h2>
          </div>
          <p className="text-slate-600 mb-5 leading-relaxed">
            Pilih layanan yang ingin Anda tuju dan dapatkan nomor antrean secara online.
          </p>

          {/* Tampilkan pesan error jika ada */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2 mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Pilihan layanan (panah bawah digambar sendiri agar rapi) */}
          <div className="relative mb-5">
            <select
              value={selectedLayanan}
              onChange={(e) => setSelectedLayanan(e.target.value)}
              aria-label="Pilih Layanan"
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-5 py-3.5 pr-12 text-slate-800 font-medium shadow-sm focus:outline-none focus:border-[#1976d2] focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Pilih Layanan</option>
              {/* Looping data layanan dari database untuk pilihan dropdown */}
              {layanans.map((layanan) => (
                <option key={layanan.id} value={layanan.id}>
                  {layanan.nama_layanan}
                </option>
              ))}
            </select>
            <ChevronDown size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" />
          </div>

          {/* Tombol Ambil Antrean dengan tanda loading */}
          <button
            onClick={bukaFormData}
            disabled={loading || !selectedLayanan}
            className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-[#0d5bc4] hover:bg-[#0b4fa9] text-white font-bold py-3.5 shadow-md shadow-blue-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Memproses...
              </>
            ) : (
              <>
                <Ticket size={22} />
                Ambil Nomor Antrean
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        {/* Kolom Kanan: Antrean Saya (3 antrean terbaru) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={28} strokeWidth={2} className="text-[#1565c0]" />
            <h2 className="text-xl font-bold text-[#0f1e33] flex-1">Antrean Saya</h2>
            {/* Tautan ke halaman Riwayat Antrean */}
            {antreans.length > 0 && (
              <button
                onClick={() => navigate('/riwayat')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1565c0] hover:underline"
              >
                Lihat Semua <ArrowRight size={18} />
              </button>
            )}
          </div>

          {/* Tampilan jika pengunjung belum punya antrean */}
          {antreans.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Ticket size={56} strokeWidth={1} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700">Belum ada antrean</p>
              <p className="text-sm">Anda belum mengambil nomor antrean.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {antreans.slice(0, 3).map((antrean) => (
                <div key={antrean.id} className="flex items-center gap-3 sm:gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-3 sm:px-4 py-3">
                  {/* Nomor antrean dalam kotak biru muda */}
                  <div className="rounded-lg bg-blue-100/70 px-2.5 sm:px-3 py-1.5 text-lg sm:text-xl font-extrabold text-[#1565c0]">
                    {antrean.nomor_antrean}
                  </div>
                  {/* Garis pemisah tipis */}
                  <span className="hidden sm:block w-px self-stretch bg-slate-200" aria-hidden="true" />
                  {/* Nama layanan + waktu ambil (+ status di bawahnya khusus layar HP) */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{antrean.layanan?.nama_layanan}</p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-600">
                      <CalendarDays size={15} className="flex-shrink-0" />
                      {formatWaktuSingkat(antrean.created_at)}
                    </p>
                    <span className={`sm:hidden inline-block mt-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${WARNA_STATUS[antrean.status] || 'bg-slate-100 text-slate-700'}`}>
                      {getStatusLabel(antrean.status)}
                    </span>
                  </div>
                  {/* Label status berwarna di sisi kanan (layar lebar) */}
                  <span className={`hidden sm:inline-block rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${WARNA_STATUS[antrean.status] || 'bg-slate-100 text-slate-700'}`}>
                    {getStatusLabel(antrean.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================== */}
      {/* BAGIAN 3: INFORMASI PELAYANAN (ringkas) */}
      {/* ======================================== */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7 mb-8">
        <div className="flex items-center gap-3 mb-5">
          <Info size={28} strokeWidth={2} className="text-[#1565c0]" />
          <h2 className="text-xl font-bold text-[#0f1e33]">Informasi Pelayanan</h2>
        </div>
        {/* 3 bagian: jam operasional | persyaratan | tombol */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x divide-slate-200 items-center">
          <div className="flex gap-3 md:pr-6">
            <Clock size={28} strokeWidth={1.8} className="text-[#1565c0] flex-shrink-0" />
            <div>
              <h4 className="font-bold text-slate-800">Jam Operasional</h4>
              <p className="text-slate-600">{HARI_LAYANAN}</p>
              <p className="text-lg font-extrabold text-[#1565c0]">{JAM_LAYANAN}</p>
            </div>
          </div>
          <div className="flex gap-3 md:px-6">
            <FileText size={28} strokeWidth={1.8} className="text-[#1565c0] flex-shrink-0" />
            <div>
              <h4 className="font-bold text-slate-800">Persyaratan Layanan</h4>
              <p className="text-slate-600">Cek dokumen yang diperlukan untuk setiap layanan.</p>
            </div>
          </div>
          {/* Tombol ke halaman Informasi Pelayanan lengkap */}
          <div className="md:pl-6 flex md:justify-center">
            <button
              onClick={() => navigate('/informasi')}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1565c0] px-7 py-3 font-bold text-[#1565c0] hover:bg-blue-50 transition"
            >
              Lihat Informasi Lengkap <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================== */}
      {/* BAGIAN 4: KAKI HALAMAN (footer) */}
      {/* ======================================== */}
      <footer className="flex flex-col sm:flex-row sm:justify-between gap-2 border-t border-slate-200 pt-5 text-sm text-slate-600">
        <span>© {new Date().getFullYear()} {INSTANSI}. All rights reserved.</span>
        <span>{NAMA_APLIKASI} – Pelayanan Mudah, Cepat, dan Transparan.</span>
      </footer>

      {/* ======================================== */}
      {/* BAGIAN 5: MODAL FORMULIR & TIKET */}
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