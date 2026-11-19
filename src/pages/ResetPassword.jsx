// ========================================
// FILE: ResetPassword.jsx
// DESKRIPSI: Dibuka dari tautan email "Atur Ulang Kata Sandi".
// Versi Supabase, alamat: /reset-password?token_hash=...&type=recovery&email=...
// (token_hash baru ditukarkan ke Supabase saat tombol Simpan ditekan, karena hanya bisa dipakai sekali)
// ========================================
// useState = menyimpan data yang bisa berubah di halaman
import { useEffect, useState } from 'react'
// useSearchParams = membaca ?token=...&email=... dari alamat halaman
import { Link, useSearchParams } from 'react-router-dom'
// Ikon-ikon dari lucide-react
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'
// Penerjemah ke Supabase (POST /reset-password -> Supabase Auth)
import api from '../lib/api'
// Klien Supabase (cek sesi jika memakai template email bawaan Supabase)
import { supabase } from '../lib/supabase'
// Fungsi bantu pesan error backend
import { pesanError } from '../lib/antrean'
// Kerangka halaman publik
import KartuPublik, { kelasInput, kelasTombol } from '../components/KartuPublik'
// Daftar persyaratan kata sandi (dicentang otomatis saat mengetik)
import SyaratPassword, { passwordMemenuhiSyarat } from '../components/SyaratPassword'

// Komponen halaman Buat Kata Sandi Baru
export default function ResetPassword() {
  // Baca token & email dari tautan email
  const [params] = useSearchParams()
  const token = params.get('token_hash') || ''
  const [email, setEmail] = useState(params.get('email') || '')
  // Tanpa token_hash: cek apakah Supabase sudah membuat sesi dari tautan (template bawaan)
  const [adaSesi, setAdaSesi] = useState(null)
  useEffect(() => {
    if (token) return
    supabase.auth.getSession().then(({ data }) => {
      setAdaSesi(Boolean(data.session))
      if (data.session?.user?.email) setEmail(data.session.user.email)
    })
  }, [token])

  // Isi form: kata sandi baru + konfirmasinya
  const [form, setForm] = useState({ password: '', password_confirmation: '' })
  // true = kata sandi ditampilkan sebagai teks biasa
  const [lihat, setLihat] = useState(false)
  // Status sedang menyimpan
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Pesan sukses dari backend
  const [berhasil, setBerhasil] = useState('')

  // Dijalankan saat tombol "Simpan Kata Sandi" ditekan
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    // Cek di browser dulu: kedua kata sandi harus sama
    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi kata sandi tidak sama.')
      return
    }
    setLoading(true)
    try {
      // Kirim kode dari email + kata sandi baru (diproses Supabase Auth)
      const res = await api.post('/reset-password', { token_hash: token, ...form })
      // Semua sesi lama dicabut backend: bersihkan juga sesi di browser ini
      localStorage.removeItem('token')
      setBerhasil(res.data.message)
    } catch (err) {
      // Gagal (misal tautan kedaluwarsa): tampilkan pesan
      setError(pesanError(err, 'Gagal mengatur ulang kata sandi.'))
    } finally {
      setLoading(false)
    }
  }

  // Masih memeriksa sesi (khusus tautan tanpa token_hash)
  if (!token && adaSesi === null) {
    return <KartuPublik ikon={<Loader2 className="w-8 h-8 animate-spin" />} judul="Memeriksa Tautan..." deskripsi="Mohon tunggu sebentar." />
  }

  // Tautan tidak lengkap (dibuka tanpa token & tanpa sesi)
  if (!token && !adaSesi) {
    return (
      <KartuPublik judul="Tautan Tidak Valid" deskripsi="Tautan atur ulang kata sandi tidak lengkap atau rusak.">
        <Link to="/lupa-password" className={kelasTombol}>Minta Tautan Baru</Link>
      </KartuPublik>
    )
  }

  // Tampilan setelah berhasil: tombol menuju login
  if (berhasil) {
    return (
      <KartuPublik ikon={<CheckCircle2 className="w-8 h-8" />} judul="Kata Sandi Diperbarui" deskripsi={berhasil}>
        {/* Pakai <a> agar halaman dimuat ulang dan sesi lama benar-benar bersih */}
        <a href="/login" className={kelasTombol}>Masuk Sekarang</a>
      </KartuPublik>
    )
  }

  return (
    <KartuPublik
      ikon={<Lock className="w-8 h-8" />}
      judul="Buat Kata Sandi Baru"
      deskripsi={email ? `Untuk akun ${email}` : 'Masukkan kata sandi baru Anda.'}
    >
      {/* Form kata sandi baru */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}{' '}
            {error.includes('kedaluwarsa') && (
              <Link to="/lupa-password" className="font-semibold underline">Minta tautan baru</Link>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Kata Sandi Baru</label>
          <div className="relative">
            <input
              type={lihat ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimal 8 karakter"
              className={`${kelasInput} pr-12`}
              minLength={8}
              required
            />
            <button type="button" onClick={() => setLihat(!lihat)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {lihat ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Ulangi Kata Sandi Baru</label>
          <input
            type={lihat ? 'text' : 'password'}
            value={form.password_confirmation}
            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
            className={kelasInput}
            minLength={8}
            required
          />
          {/* Persyaratan kata sandi */}
          <SyaratPassword password={form.password} konfirmasi={form.password_confirmation} />
        </div>
        {/* Tombol aktif hanya jika syarat terpenuhi dan konfirmasi sama */}
        <button
          type="submit"
          disabled={loading || !passwordMemenuhiSyarat(form.password) || form.password !== form.password_confirmation}
          className={kelasTombol}
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</> : 'Simpan Kata Sandi'}
        </button>
      </form>
    </KartuPublik>
  )
}
