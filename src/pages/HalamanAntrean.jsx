// ========================================
// FILE: HalamanAntrean.jsx
// DESKRIPSI: Halaman "Antrean Saya" untuk pengunjung.
// Menampilkan antrean HARI INI yang masih berjalan, QR Code (isi = kode_barcode),
// posisi antrean, petugas yang memanggil, dan riwayat singkat.
// Data diperbarui otomatis setiap 10 detik.
// ========================================

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
// QR Code dengan logo DINSOS di tengah
import QrDinsos from '../components/QrDinsos'
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronRight,
  Copy,
  Users,
  List,
  Info,
  Loader2,
  Megaphone,
  XCircle,
} from 'lucide-react'
import { useToast } from '../components/ToastProvider'
// Jendela konfirmasi buatan sendiri
import { useDialog } from '../components/DialogProvider'
import { STATUS_AKTIF, isHariIni, labelStatus, formatTanggal, formatJam, pesanError } from '../lib/antrean'
import './HalamanAntrean.css'

// Interval pembaruan otomatis (milidetik)
const REFRESH_INTERVAL = 10000

// Urutan tahap untuk progres pelayanan
const URUTAN = ['menunggu', 'terverifikasi', 'dipanggil', 'dilayani', 'selesai']

// Penjelasan singkat untuk setiap status
const PENJELASAN = {
  menunggu: 'Silakan datang ke kantor Dinas Sosial dan tunjukkan QR Code ini ke meja pendaftaran untuk di-scan.',
  terverifikasi: 'Kehadiran Anda sudah diverifikasi. Silakan duduk dan tunggu nomor Anda dipanggil oleh petugas pelayanan.',
  dipanggil: 'Nomor Anda sedang dipanggil! Segera menuju loket petugas yang memanggil.',
  dilayani: 'Anda sedang dilayani oleh petugas.',
}

function HalamanAntrean() {
  const navigate = useNavigate()
  const toast = useToast()
  // Fungsi untuk menampilkan jendela konfirmasi
  const tanya = useDialog()

  // Antrean hari ini yang masih berjalan (null jika tidak ada)
  const [antreanAktif, setAntreanAktif] = useState(null)
  // Riwayat (selesai / dibatalkan / antrean hari lain)
  const [riwayatAntrean, setRiwayatAntrean] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [membatalkan, setMembatalkan] = useState(false)

  // Ambil data antrean milik pengunjung
  const fetchData = useCallback(async (diam = false) => {
    try {
      if (!diam) setIsLoading(true)
      const response = await api.get('/antreans/my')
      const data = response.data || []

      // Antrean aktif = antrean HARI INI yang statusnya masih berjalan
      const aktif = data.find((a) => STATUS_AKTIF.includes(a.status) && isHariIni(a.tanggal))
      setAntreanAktif(aktif || null)
      setRiwayatAntrean(data.filter((a) => a.id !== aktif?.id).slice(0, 5))
      setError(null)
    } catch (err) {
      console.error('Error fetching antrean:', err)
      if (!diam) setError('Gagal memuat data antrean. Silakan coba lagi.')
    } finally {
      if (!diam) setIsLoading(false)
    }
  }, [])

  // Muat pertama kali + pembaruan otomatis
  useEffect(() => {
    fetchData()
    const timer = setInterval(() => fetchData(true), REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchData])

  // Beri notifikasi saat status berubah menjadi "dipanggil"
  // Simpan status sebelumnya untuk mendeteksi perubahan menjadi "dipanggil"
  const [statusSebelumnya, setStatusSebelumnya] = useState(null)
  useEffect(() => {
    const status = antreanAktif?.status || null
    if (statusSebelumnya && status === 'dipanggil' && statusSebelumnya !== 'dipanggil') {
      toast.info(`Nomor ${antreanAktif.nomor_antrean} dipanggil. Segera menuju loket.`, 'Giliran Anda!')
    }
    setStatusSebelumnya(status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [antreanAktif?.status])

  // Salin kode booking ke clipboard
  const salinKode = () => {
    if (antreanAktif?.kode_barcode) {
      navigator.clipboard.writeText(antreanAktif.kode_barcode)
      toast.success('Kode booking berhasil disalin.')
    }
  }

  // Pengunjung membatalkan antreannya sendiri (hanya selama masih "menunggu")
  const batalkanAntrean = async () => {
    // Tampilkan jendela konfirmasi dan tunggu jawaban pengunjung
    const yakin = await tanya({
      varian: 'bahaya',
      judul: 'Batalkan antrean ini?',
      pesan: 'Nomor antrean ini akan hangus. Anda tetap bisa mengambil antrean baru setelahnya.',
      antrean: {
        nomor: antreanAktif.nomor_antrean,
        nama: antreanAktif.nama_pengunjung,
        keterangan: antreanAktif.layanan?.nama_layanan,
      },
      teksYa: 'Ya, Batalkan',
      teksTidak: 'Tidak Jadi',
    })
    if (!yakin) return
    setMembatalkan(true)
    try {
      const res = await api.put(`/antreans/${antreanAktif.id}/batal-saya`)
      toast.success(res.data.message)
      await fetchData(true)
    } catch (err) {
      toast.error(pesanError(err, 'Gagal membatalkan antrean.'))
    } finally {
      setMembatalkan(false)
    }
  }

  // Kelas CSS untuk warna status
  const getStatusClass = (status) => `status-${status}`

  // Status tahap progres: 'completed' (sudah lewat), 'active' (sekarang), '' (belum)
  const kelasTahap = (tahap) => {
    const sekarang = URUTAN.indexOf(antreanAktif?.status)
    const posisi = URUTAN.indexOf(tahap)
    if (posisi < sekarang) return 'completed'
    if (posisi === sekarang) return 'active'
    return ''
  }

  // Nilai kotak informasi
  const infoPosisi = () => {
    const s = antreanAktif.status
    if (s === 'menunggu') return 'Belum check-in'
    if (s === 'terverifikasi') {
      const n = antreanAktif.jumlah_di_depan ?? 0
      return n === 0 ? 'Anda berikutnya' : `${n} orang`
    }
    return 'Giliran Anda'
  }

  // Nama petugas yang memanggil (dari relasi dilayani_oleh)
  const namaPemanggil = antreanAktif?.dilayani_oleh?.name || '-'

  return (
    <div className="antrean-page">
      {/* --- HEADER --- */}
      {/* Bagian judul halaman */}
      <div className="antrean-header">
        <div className="header-icon">
          <Ticket size={28} strokeWidth={2} />
        </div>
        <div className="header-content">
          <h1>Antrean Saya</h1>
          <p>Pantau nomor antrean dan status pelayanan Anda hari ini. Halaman ini diperbarui otomatis.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <Loader2 className="loading-spinner" size={48} />
          <p>Memuat data antrean Anda...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <AlertCircle size={48} className="error-icon" />
          <p className="error-message">{error}</p>
          <button onClick={() => fetchData()} className="btn-retry">Coba Lagi</button>
        </div>
      ) : !antreanAktif ? (
        <div className="empty-state">
          <div className="empty-icon">
            <AlertCircle size={64} strokeWidth={1.5} />
          </div>
          <h3>Tidak Ada Antrean Aktif Hari Ini</h3>
          <p>Silakan ambil nomor antrean di halaman Dashboard.</p>
          <button className="btn-ambil-antrean" onClick={() => navigate('/')}>
            <Ticket size={18} />
            Ambil Antrean Sekarang
          </button>
        </div>
      ) : (
        <div className="antrean-content">
          {/* --- KOLOM KIRI: Kartu antrean + QR --- */}
          {/* Kolom kiri: kartu nomor antrean + QR Code */}
          <div className="antrean-kiri">
            <div className="kartu-antrean">
              <div className="kartu-header">
                <div className="logo-dinsos">
                  <img src="/images/logo-dinsos.png" alt="Logo DINSOS" />
                </div>
                <div className="instansi-info">
                  <strong>SAPA DINSOS</strong>
                  <span>DINAS SOSIAL KABUPATEN MAJALENGKA</span>
                </div>
              </div>

              <div className="nomor-antrean-besar">
                <span className="label">Nomor Antrean Anda</span>
                <span className="nomor">{antreanAktif.nomor_antrean}</span>
                <span className="layanan">{antreanAktif.layanan?.nama_layanan || '-'}</span>
              </div>

              {/* QR hanya perlu ditunjukkan selama belum di-scan */}
              {antreanAktif.status === 'menunggu' ? (
                <>
                  <div className="kode-booking">
                    <span className="font-mono text-xs break-all">{antreanAktif.kode_barcode}</span>
                    <button onClick={salinKode} className="btn-copy" title="Salin kode booking">
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="qr-code-section">
                    <div className="qr-code">
                      {/* Isi QR = kode_barcode. Hitam di atas putih agar mudah dibaca scanner. */}
                      <QrDinsos nilai={antreanAktif.kode_barcode} ukuran={180} />
                    </div>
                    <p className="qr-label">QR Code Check-in</p>
                    <p className="qr-desc">Tunjukkan QR ini ke petugas pendaftaran saat tiba di kantor Dinas Sosial.</p>
                  </div>
                </>
              ) : (
                <div className="qr-code-section">
                  <CheckCircle2 size={56} className="text-green-600 mx-auto" />
                  <p className="qr-label">Sudah Check-in</p>
                  <p className="qr-desc">
                    Diverifikasi pukul {formatJam(antreanAktif.waktu_verifikasi)}. QR Code tidak perlu ditunjukkan lagi.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* --- KOLOM KANAN: Status --- */}
          {/* Kolom kanan: status, info posisi, progres, petunjuk */}
          <div className="antrean-kanan">
            <div className={`status-card ${antreanAktif.status === 'dipanggil' ? 'ring-4 ring-yellow-300 animate-pulse' : ''}`}>
              <div className="status-header">
                <div className="status-icon">
                  {antreanAktif.status === 'dipanggil' ? <Megaphone size={20} /> : <Users size={20} strokeWidth={2} />}
                </div>
                <div>
                  <h3>Status Antrean</h3>
                  <p className="status-text">{labelStatus(antreanAktif.status)}</p>
                  <p className="status-desc">{PENJELASAN[antreanAktif.status]}</p>
                </div>
              </div>
            </div>

            {/* Informasi nyata dari backend */}
            <div className="info-grid">
              <div className="info-box">
                <div className="info-icon"><List size={20} strokeWidth={2} /></div>
                <div>
                  <span className="info-label">Antrean di Depan Anda</span>
                  <span className="info-value">{infoPosisi()}</span>
                </div>
              </div>
              <div className="info-box">
                <div className="info-icon"><Megaphone size={20} strokeWidth={2} /></div>
                <div>
                  <span className="info-label">Dipanggil Oleh</span>
                  <span className="info-value">{namaPemanggil}</span>
                </div>
              </div>
              <div className="info-box">
                <div className="info-icon"><Calendar size={20} strokeWidth={2} /></div>
                <div>
                  <span className="info-label">Didaftarkan</span>
                  <span className="info-value">{formatJam(antreanAktif.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Progres pelayanan sesuai alur */}
            <div className="progress-card">
              <h3>Progres Pelayanan</h3>
              <div className="progress-steps">
                {[
                  ['menunggu', 'Pendaftaran Berhasil'],
                  ['terverifikasi', 'Check-in (Scan Barcode)'],
                  ['dipanggil', 'Dipanggil Petugas'],
                  ['dilayani', 'Sedang Dilayani'],
                  ['selesai', 'Selesai'],
                ].map(([tahap, label]) => (
                  <div key={tahap} className={`step ${kelasTahap(tahap)}`}>
                    <div className="step-icon"><CheckCircle2 size={16} /></div>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="petunjuk-card">
              <div className="petunjuk-header">
                <Info size={20} strokeWidth={2} />
                <h3>Petunjuk untuk Anda</h3>
              </div>
              <ul className="petunjuk-list">
                <li>Bawa dokumen persyaratan sesuai layanan (lihat menu Informasi Pelayanan).</li>
                <li>Nomor dipanggil secara lisan oleh petugas. Tetap berada di ruang tunggu.</li>
                <li>Jika sudah dipanggil tetapi Anda tidak datang, antrean bisa ditandai tidak hadir.</li>
              </ul>
              {antreanAktif.status === 'menunggu' && (
                <button
                  onClick={batalkanAntrean}
                  disabled={membatalkan}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <XCircle size={16} /> {membatalkan ? 'Membatalkan...' : 'Batalkan Antrean Ini'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- RIWAYAT SINGKAT --- */}
      {!isLoading && !error && (
        <div className="riwayat-section">
          {/* Kelas Tailwind (bukan .riwayat-header) agar tidak bentrok dengan CSS halaman Riwayat */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="riwayat-title">
              <Calendar size={20} strokeWidth={2} />
              <h3>Riwayat Antrean</h3>
            </div>
            <button className="btn-lihat-semua" onClick={() => navigate('/riwayat')}>
              Lihat Semua Riwayat
              <ChevronRight size={16} />
            </button>
          </div>

          {riwayatAntrean.length === 0 ? (
            <div className="riwayat-empty"><p>Belum ada riwayat antrean.</p></div>
          ) : (
            <div className="riwayat-list">
              {riwayatAntrean.map((item) => (
                <div key={item.id} className="riwayat-item">
                  <div className="riwayat-nomor">
                    <Ticket size={18} />
                    <strong>{item.nomor_antrean}</strong>
                  </div>
                  <div className="riwayat-layanan">{item.layanan?.nama_layanan || '-'}</div>
                  <div className="riwayat-tanggal">
                    <Calendar size={14} />
                    {formatTanggal(item.tanggal)}
                  </div>
                  <div className={`riwayat-status ${getStatusClass(item.status)}`} title={item.alasan_batal || ''}>
                    {labelStatus(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default HalamanAntrean
