// ========================================
// FILE: ScanQR.jsx
// DESKRIPSI: Halaman scan barcode untuk PETUGAS PENDAFTARAN.
// Alur: scan barcode -> backend cek valid/tidak ->
//   - Valid  : status MENUNGGU -> TERVERIFIKASI (antrean masuk ke komputer pelayanan)
//   - Tidak  : ditolak, pengunjung diarahkan untuk daftar ulang
// ========================================

// Hook React: useState (data tampilan), useEffect (jalankan kamera), useRef (simpan nilai tanpa render ulang)
import { useState, useEffect, useRef } from 'react'
// useNavigate untuk pindah halaman lewat kode
import { useNavigate } from 'react-router-dom'
// Penerjemah ke Supabase (lihat lib/api.js)
import api from '../lib/api'
// Pustaka scan kamera
import { Html5Qrcode } from 'html5-qrcode'
// Ikon
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw
} from 'lucide-react'
// CSS halaman ini
import './ScanQR.css'

// Kode error dari backend yang artinya barcode TIDAK VALID (tolak / daftar ulang)
const KODE_BARCODE_TIDAK_VALID = ['tidak_ditemukan', 'kedaluwarsa']

function ScanQR() {
  const navigate = useNavigate()

  // Tahap layar: idle | scanning | verifying | success | error
  const [scanStatus, setScanStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState(null)
  const [errorKode, setErrorKode] = useState(null)
  const [verifiedAntrean, setVerifiedAntrean] = useState(null)
  // Ganti angka ini untuk menyalakan ulang kamera
  const [scannerKey, setScannerKey] = useState(0)
  // Pesan jika kamera tidak bisa dipakai (input manual / alat scanner tetap bisa dipakai)
  const [kameraError, setKameraError] = useState(null)
  // Isi kotak input manual (diketik atau dari alat scanner USB)
  const [kodeManual, setKodeManual] = useState('')
  // Penanda agar satu barcode tidak diproses dua kali
  const sudahDiproses = useRef(false)
  // Fungsi untuk mematikan kamera (diisi oleh useEffect)
  const hentikanKameraRef = useRef(null)
  // Kotak input manual (agar bisa difokuskan otomatis)
  const inputRef = useRef(null)

  // Kirim kode barcode ke backend: MENUNGGU -> TERVERIFIKASI
  const prosesKode = async (kode) => {
    const bersih = (kode || '').trim()
    if (!bersih || sudahDiproses.current) return
    sudahDiproses.current = true

    // Matikan kamera dulu sebelum tampilan kamera hilang
    if (hentikanKameraRef.current) await hentikanKameraRef.current()

    setScanStatus('verifying')
    try {
      const response = await api.post('/antreans/verify-qr', { qr_data: bersih })
      setVerifiedAntrean(response.data.antrean)
      setScanStatus('success')
    } catch (err) {
      console.error('Error verifying QR:', err)
      setErrorMessage(err.response?.data?.message || 'Gagal memverifikasi barcode.')
      setErrorKode(err.response?.data?.kode || null)
      setScanStatus('error')
    }
  }

  // Menyalakan kamera saat halaman dibuka / saat "Scan Lagi"
  useEffect(() => {
    let dibatalkan = false
    let berjalan = false
    const scanner = new Html5Qrcode('qr-reader')

    const hentikan = async () => {
      if (!berjalan) return
      berjalan = false
      try {
        await scanner.stop()
        scanner.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    hentikanKameraRef.current = hentikan

    const proses = scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (teksQR) => prosesKode(teksQR),
        () => {} // "QR belum terdeteksi" itu normal, abaikan
      )
      .then(() => {
        berjalan = true
        // Halaman ditutup, atau kode sudah diproses lewat input manual saat kamera masih menyala
        if (dibatalkan || sudahDiproses.current) return hentikan()
        setScanStatus('scanning')
      })
      .catch((err) => {
        if (dibatalkan) return
        console.error('Error starting scanner:', err)
        // Kamera gagal: JANGAN hentikan proses, petugas masih bisa pakai input manual / alat scanner
        setKameraError('Kamera tidak dapat digunakan. Gunakan alat scanner atau ketik kode booking di kotak bawah.')
      })

    // Fokuskan kotak input agar alat scanner USB langsung bisa dipakai
    setTimeout(() => inputRef.current?.focus(), 100)

    return () => {
      dibatalkan = true
      hentikanKameraRef.current = null
      proses.then(hentikan)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerKey])

  // Kirim dari kotak input manual (Enter dari alat scanner juga memicu ini)
  const handleSubmitManual = (e) => {
    e.preventDefault()
    prosesKode(kodeManual)
  }

  // Siap scan pengunjung berikutnya
  const handleReset = () => {
    sudahDiproses.current = false
    setVerifiedAntrean(null)
    setErrorMessage(null)
    setErrorKode(null)
    setKameraError(null)
    setKodeManual('')
    setScanStatus('idle')
    setScannerKey((k) => k + 1)
  }

  // Kembali ke Dashboard Petugas
  const handleBack = () => {
    navigate('/petugas')
  }

  // Apakah error ini karena barcode tidak valid? (flowchart: Tolak / Daftar ulang)
  const barcodeTidakValid = KODE_BARCODE_TIDAK_VALID.includes(errorKode)

  return (
    <div className="scan-qr-page">
      {/* --- BAGIAN 1: HEADER --- */}
      <div className="scan-qr-header">
        <button onClick={handleBack} className="btn-back">
          <ArrowLeft size={20} />
          Kembali
        </button>
        <div className="header-content">
          <h1>Scan Barcode Antrean</h1>
          <p>Scan barcode pengunjung (kamera atau alat scanner) untuk memverifikasi kehadiran.</p>
        </div>
      </div>

      {/* --- BAGIAN 2: KONTEN UTAMA --- */}
      <div className="scan-qr-content">
        {scanStatus === 'idle' || scanStatus === 'scanning' ? (
          // Tampilan kamera
          <div className="scanner-container">
            <div className="scanner-header">
              <Camera size={24} className="scanner-icon" />
              <h2>Kamera Scanner</h2>
            </div>

            {/* Tempat kamera ditampilkan oleh Html5Qrcode */}
            <div id="qr-reader" className="qr-reader"></div>

            {kameraError ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">{kameraError}</p>
            ) : (
              <div className="scanner-instruction">
                <p>Arahkan kamera ke barcode pengunjung</p>
                <p className="scanner-tip">Barcode akan terbaca otomatis saat terdeteksi</p>
              </div>
            )}

            {/* Input manual: untuk ALAT SCANNER USB (otomatis mengetik + Enter) atau diketik petugas */}
            <form onSubmit={handleSubmitManual} className="mt-4 flex gap-2">
              <input
                ref={inputRef}
                value={kodeManual}
                onChange={(e) => setKodeManual(e.target.value)}
                placeholder="Scan / ketik kode DNS-..."
                className="flex-1 min-w-0 px-4 py-3 border-2 border-gray-200 rounded-lg font-mono text-sm uppercase placeholder:normal-case placeholder:font-sans focus:border-[#1976d2] outline-none"
                autoComplete="off"
              />
              <button type="submit" disabled={!kodeManual.trim()} className="px-5 py-3 rounded-lg bg-[#1976d2] text-white font-semibold disabled:opacity-50">
                Verifikasi
              </button>
            </form>
          </div>
        ) : scanStatus === 'verifying' ? (
          // Tampilan loading saat menunggu jawaban backend
          <div className="verifying-container">
            <Loader2 className="verifying-spinner" size={48} />
            <h2>Memverifikasi barcode...</h2>
            <p>Mohon tunggu sebentar</p>
          </div>
        ) : scanStatus === 'success' ? (
          // Tampilan barcode VALID -> antrean TERVERIFIKASI
          <div className="success-container">
            <CheckCircle2 size={64} className="success-icon" />
            <h2>Barcode Valid, Antrean Terverifikasi!</h2>

            {verifiedAntrean && (
              <div className="verified-info">
                <div className="info-row">
                  <span className="info-label">Nomor Antrean:</span>
                  <span className="info-value nomor">{verifiedAntrean.nomor_antrean}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Nama Pengunjung:</span>
                  {/* nama_tampil dari backend: berlaku untuk pendaftar online maupun langsung */}
                  <span className="info-value">{verifiedAntrean.nama_tampil || '-'}</span>
                </div>
                {verifiedAntrean.desa_kelurahan && (
                  <div className="info-row">
                    <span className="info-label">Alamat:</span>
                    <span className="info-value">{verifiedAntrean.desa_kelurahan}, {verifiedAntrean.kecamatan}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Layanan:</span>
                  <span className="info-value">{verifiedAntrean.layanan?.nama_layanan || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  {/* Lencana status TERVERIFIKASI (styling Tailwind) */}
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                    Terverifikasi
                  </span>
                </div>
              </div>
            )}

            {/* Keterangan alur selanjutnya */}
            <p className="scanner-tip">
              Antrean ini sudah muncul di komputer petugas pelayanan. Silakan arahkan pengunjung untuk menunggu dipanggil.
            </p>

            <div className="success-actions">
              <button onClick={handleReset} className="btn-scan-again">
                <RefreshCw size={18} />
                Scan Lagi
              </button>
              <button onClick={handleBack} className="btn-back-dashboard">
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        ) : scanStatus === 'error' ? (
          // Tampilan error / barcode ditolak
          <div className="error-container">
            <AlertCircle size={64} className="error-icon" />
            {/* Judul menyesuaikan: barcode tidak valid, sudah diproses, atau error lain */}
            <h2>
              {barcodeTidakValid
                ? 'Barcode Tidak Valid'
                : errorKode === 'sudah_diproses'
                  ? 'Barcode Tidak Dapat Diproses'
                  : 'Terjadi Kesalahan'}
            </h2>
            <p className="error-message">{errorMessage}</p>
            {/* Sesuai flowchart: barcode tidak valid -> tolak / daftar ulang */}
            {barcodeTidakValid && (
              <p className="scanner-tip">
                Arahkan pengunjung untuk daftar ulang (online, atau daftar langsung lewat Dashboard).
              </p>
            )}

            <div className="error-actions">
              <button onClick={handleReset} className="btn-retry">
                <RefreshCw size={18} />
                Scan Lagi
              </button>
              <button onClick={handleBack} className="btn-back-dashboard">
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Ekspor komponen
export default ScanQR
