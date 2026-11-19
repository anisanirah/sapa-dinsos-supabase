// ========================================
// FILE: PenangkapError.jsx
// DESKRIPSI: "Penangkap error" (Error Boundary).
// Jika ada bagian tampilan yang error, aplikasi TIDAK menjadi layar putih,
// tetapi menampilkan pesan error + tombol untuk memuat ulang.
// Pesan error ditampilkan agar mudah dilaporkan (di-screenshot) ke pengembang.
// ========================================

// Component = kelas dasar React (Error Boundary wajib berbentuk class)
import { Component } from 'react'

export default class PenangkapError extends Component {
  constructor(props) {
    super(props)
    // error = null berarti tidak ada error
    this.state = { error: null }
  }

  // Dipanggil React saat ada error di dalam tampilan -> simpan errornya
  static getDerivedStateFromError(error) {
    return { error }
  }

  // Catat detail error di console (untuk pengembang)
  componentDidCatch(error, info) {
    console.error('Error tampilan:', error, info?.componentStack)
  }

  // Muat ulang halaman
  muatUlang = () => {
    window.location.reload()
  }

  // Keluar & bersihkan data login di browser ini, lalu ke halaman login
  keluar = () => {
    localStorage.clear()
    window.location.href = '/login'
  }

  render() {
    // Tidak ada error -> tampilkan aplikasi seperti biasa
    if (!this.state.error) return this.props.children

    // Ada error -> tampilkan kotak pesan (pakai style biasa agar tetap tampil walau CSS gagal)
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#f5f7fa', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          {/* Logo */}
          <img src="/images/logo-dinsos.png" alt="Logo DINSOS" style={{ height: 48, margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>Terjadi kesalahan pada tampilan</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>
            Silakan muat ulang halaman. Jika masih terjadi, screenshot pesan di bawah ini dan kirim ke pengelola sistem.
          </p>
          {/* Pesan error asli (untuk dilaporkan) */}
          <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fef2f2', color: '#991b1b', borderRadius: 12, padding: 12, fontSize: 12, marginTop: 12 }}>
            {String(this.state.error?.message || this.state.error)}
            {'\n'}Halaman: {window.location.pathname}
          </pre>
          {/* Petunjuk khusus: error karena fitur terjemahan otomatis browser (Google Translate) */}
          {/insertBefore|removeChild|Node/.test(String(this.state.error?.message)) && (
            <p style={{ textAlign: 'left', background: '#fffbeb', color: '#92400e', borderRadius: 12, padding: 12, fontSize: 13, marginTop: 8 }}>
              Kemungkinan karena fitur <b>Terjemahkan</b> di browser sedang aktif. Matikan terjemahan
              (ketuk menu titik tiga di Chrome, lalu pilih tampilkan halaman asli), kemudian tekan Muat Ulang.
            </p>
          )}
          {/* Tombol aksi */}
          <button onClick={this.muatUlang} style={{ width: '100%', marginTop: 12, padding: '12px 0', borderRadius: 12, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 15 }}>
            Muat Ulang
          </button>
          <button onClick={this.keluar} style={{ width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 12, border: '2px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14 }}>
            Keluar &amp; Masuk Lagi
          </button>
        </div>
      </div>
    )
  }
}
