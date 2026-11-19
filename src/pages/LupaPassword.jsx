// ========================================
// FILE: LupaPassword.jsx
// DESKRIPSI: Pengguna mengisi email -> backend mengirim tautan atur ulang kata sandi.
// ========================================
// useState = menyimpan data yang bisa berubah di halaman
import { useState } from 'react'
// Link = pindah halaman tanpa memuat ulang browser
import { Link } from 'react-router-dom'
// Ikon-ikon dari lucide-react
import { KeyRound, Loader2, MailCheck } from 'lucide-react'
// Klien API (penerjemah ke Supabase, lihat lib/api.js)
import api from '../lib/api'
// Fungsi bantu untuk mengambil pesan error dari backend
import { pesanError } from '../lib/antrean'
// Kerangka halaman publik + kelas input & tombol yang seragam
import KartuPublik, { kelasInput, kelasTombol } from '../components/KartuPublik'

// Komponen halaman Lupa Kata Sandi
export default function LupaPassword() {
  // Email yang diketik pengguna
  const [email, setEmail] = useState('')
  // Status sedang mengirim (tombol dimatikan sementara)
  const [loading, setLoading] = useState(false)
  // Pesan error untuk ditampilkan
  const [error, setError] = useState('')
  // Pesan sukses dari backend (jika ada, form disembunyikan)
  const [terkirim, setTerkirim] = useState('')

  // Dijalankan saat tombol "Kirim Tautan" ditekan
  const handleSubmit = async (e) => {
    // Cegah browser memuat ulang halaman saat form dikirim
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Minta backend mengirim email berisi tautan atur ulang kata sandi
      const res = await api.post('/lupa-password', { email: email.trim() })
      // Simpan pesan sukses -> tampilan berganti ke "Periksa Email Anda"
      setTerkirim(res.data.message)
    } catch (err) {
      // Gagal: tampilkan pesan dari backend
      setError(pesanError(err, 'Gagal mengirim tautan. Silakan coba lagi.'))
    } finally {
      // Selesai: aktifkan lagi tombol
      setLoading(false)
    }
  }

  return (
    // Tampilan: kerangka halaman publik dengan judul sesuai kondisi
    <KartuPublik
      ikon={terkirim ? <MailCheck className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
      judul={terkirim ? 'Periksa Email Anda' : 'Lupa Kata Sandi'}
      deskripsi={terkirim ? null : 'Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.'}
    >
      {/* Jika email sudah terkirim -> tampilkan petunjuk, jika belum -> tampilkan form */}
      {terkirim ? (
        <div className="space-y-6">
          <p className="text-center text-gray-600">{terkirim}</p>
          <p className="text-center text-sm text-gray-500">
            Tidak menerima email? Periksa folder <strong>Spam</strong>, atau hubungi petugas pendaftaran di kantor
            Dinas Sosial.
          </p>
          <Link to="/login" className={kelasTombol}>Kembali ke Halaman Login</Link>
        </div>
      ) : (
        // Form isian email
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className={kelasInput}
              required
              autoFocus
            />
          </div>
          {/* Tombol kirim (berputar saat loading) */}
          <button type="submit" disabled={loading} className={kelasTombol}>
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</> : 'Kirim Tautan'}
          </button>
          <p className="text-center text-sm text-gray-600">
            Ingat kata sandi?{' '}
            <Link to="/login" className="text-[#1976d2] font-semibold">Masuk di sini</Link>
          </p>
        </form>
      )}
    </KartuPublik>
  )
}
