// ========================================
// FILE: Login.jsx
// DESKRIPSI: Halaman login untuk SEMUA pengguna (pengunjung dan petugas).
// Tidak ada pilihan jenis pengguna: backend memeriksa email/nomor HP dan password,
// lalu role dibaca dari database dan pengguna diarahkan ke dashboard yang sesuai.
// ========================================

// Hook React: useState (data form), useRef (untuk memindahkan fokus ke kolom yang salah)
import { useState, useRef } from 'react'
// Link untuk pindah halaman tanpa reload, useNavigate untuk pindah lewat kode
import { Link, useNavigate } from 'react-router-dom'
// Fungsi login dari AuthContext
import { useAuth } from '../context/AuthContext'
// Kirim ulang email verifikasi (untuk akun yang belum verifikasi email)
import { kirimUlangVerifikasi } from '../lib/api'
// Ambil pesan error yang jelas
import { pesanError } from '../lib/antrean'
// Notifikasi (toast)
import { useToast } from '../components/ToastProvider'
// Ikon
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Ticket,
  FileText,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react'

// Halaman tujuan setelah login, ditentukan oleh role dari database
const HALAMAN_ROLE = {
  pengunjung: '/',
  petugas_pendaftaran: '/petugas',
  petugas_pelayanan: '/petugas',
}

// Versi Supabase: fitur Lupa Password sudah berjalan (email dikirim lewat Supabase Auth + Gmail SMTP),
// jadi tautan "Lupa password?" ditampilkan.
const LUPA_PASSWORD_AKTIF = true

// Pola format email sederhana
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Menyeragamkan nomor HP ke bentuk 08xxxxxxxxxx (aturan sama dengan backend)
function normalisasiNomor(nilai) {
  let bersih = nilai.replace(/[\s\-.()]/g, '')
  if (bersih.startsWith('+62')) bersih = '0' + bersih.slice(3)
  else if (bersih.startsWith('62')) bersih = '0' + bersih.slice(2)
  return bersih
}

// Memeriksa kolom email/nomor HP. Mengembalikan pesan error, atau '' jika valid.
function periksaIdentitas(nilai) {
  const teks = nilai.trim()
  if (!teks) return 'Email atau nomor HP wajib diisi.'
  if (teks.includes('@')) {
    return POLA_EMAIL.test(teks) ? '' : 'Format email tidak valid.'
  }
  return /^08[1-9][0-9]{7,10}$/.test(normalisasiNomor(teks)) ? '' : 'Format nomor HP tidak valid.'
}

// Memeriksa kolom password. Di halaman login hanya diperiksa wajib diisi.
function periksaPassword(nilai) {
  return nilai ? '' : 'Password wajib diisi.'
}

export default function Login() {
  // Isi kolom form
  const [identitas, setIdentitas] = useState('')
  const [password, setPassword] = useState('')
  // Tampilkan / sembunyikan password
  const [tampilPassword, setTampilPassword] = useState(false)
  // Pesan error per kolom, dan pesan error umum dari server
  const [errors, setErrors] = useState({ identitas: '', password: '' })
  const [pesanForm, setPesanForm] = useState('')
  // Status proses login
  const [loading, setLoading] = useState(false)
  // Email akun yang belum diverifikasi (untuk tombol "Kirim Ulang Email Verifikasi")
  const [emailBelumVerifikasi, setEmailBelumVerifikasi] = useState('')
  // Status tombol kirim ulang: { loading, pesan }
  const [kirimUlang, setKirimUlang] = useState({ loading: false, pesan: '' })

  // Referensi kolom untuk memindahkan fokus
  const refIdentitas = useRef(null)
  const refPassword = useRef(null)

  // Fungsi login, pindah halaman, dan notifikasi
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // Saat mengetik di kolom identitas: simpan isi dan hilangkan pesan error kolom itu
  const ubahIdentitas = (e) => {
    setIdentitas(e.target.value)
    setErrors((sebelumnya) => ({ ...sebelumnya, identitas: '' }))
    setPesanForm('')
  }

  // Saat mengetik di kolom password: simpan isi dan hilangkan pesan error kolom itu
  const ubahPassword = (e) => {
    setPassword(e.target.value)
    setErrors((sebelumnya) => ({ ...sebelumnya, password: '' }))
    setPesanForm('')
  }

  // Dijalankan saat tombol "Masuk" ditekan
  const kirimForm = async (e) => {
    // Cegah halaman reload
    e.preventDefault()
    setPesanForm('')
    setEmailBelumVerifikasi('')
    setKirimUlang({ loading: false, pesan: '' })

    // 1. Validasi di browser (backend tetap memvalidasi ulang)
    const errorBaru = {
      identitas: periksaIdentitas(identitas),
      password: periksaPassword(password),
    }
    setErrors(errorBaru)

    // Jika ada yang salah, fokus ke kolom pertama yang bermasalah lalu berhenti
    if (errorBaru.identitas) {
      refIdentitas.current?.focus()
      return
    }
    if (errorBaru.password) {
      refPassword.current?.focus()
      return
    }

    // 2. Kirim ke backend
    setLoading(true)
    try {
      const data = await login(identitas.trim(), password)
      // Role dibaca dari jawaban backend (berasal dari database)
      const role = data.user?.profile?.role
      const nama = data.user?.profile?.nama || data.user?.name || ''
      toast.success(`Selamat datang, ${nama}.`, 'Login berhasil')
      // Arahkan ke dashboard sesuai role
      navigate(HALAMAN_ROLE[role] || '/', { replace: true })
    } catch (err) {
      const respons = err.response
      if (!respons) {
        // Tidak ada jawaban dari server (server mati / tidak ada koneksi)
        const pesan = 'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.'
        setPesanForm(pesan)
        toast.error(pesan, 'Login gagal')
      } else if (respons.status === 422 && respons.data?.errors) {
        // Kesalahan format dari backend, ditampilkan di bawah kolom terkait
        const dariServer = respons.data.errors
        setErrors({
          identitas: dariServer.login?.[0] || '',
          password: dariServer.password?.[0] || '',
        })
        refIdentitas.current?.focus()
      } else {
        // Email/password salah, akun dinonaktifkan, terlalu banyak percobaan, dan sebagainya
        const pesan = respons.data?.message || 'Login gagal. Silakan coba lagi.'
        setPesanForm(pesan)
        // Email belum diverifikasi: tampilkan tombol kirim ulang email verifikasi
        if (respons.data?.kode === 'email_belum_terverifikasi') {
          setEmailBelumVerifikasi(respons.data.email || '')
        }
        toast.error(pesan, 'Login gagal')
      }
    } finally {
      // Matikan loading, berhasil maupun gagal
      setLoading(false)
    }
  }

  // Kirim ulang email verifikasi ke akun yang belum diverifikasi
  const handleKirimUlang = async () => {
    setKirimUlang({ loading: true, pesan: '' })
    try {
      const hasil = await kirimUlangVerifikasi(emailBelumVerifikasi)
      setKirimUlang({ loading: false, pesan: hasil.message })
    } catch (err) {
      setKirimUlang({ loading: false, pesan: pesanError(err, 'Gagal mengirim ulang email.') })
    }
  }

  // Gaya kolom isian: merah jika ada error, biru saat fokus jika normal
  const gayaKolom = (adaError) =>
    `w-full rounded-xl border-2 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
      adaError
        ? 'border-red-500 bg-red-50/50 focus:border-red-500 focus:ring-red-100'
        : 'border-slate-200 bg-slate-50 focus:border-[#1976d2] focus:bg-white focus:ring-blue-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:flex lg:items-center lg:justify-center lg:p-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-2">

        {/* ===== KOLOM KIRI: identitas dan informasi sistem (disembunyikan di layar kecil) ===== */}
        <section className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-[#1565c0] via-[#1976d2] to-[#42a5f5] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          {/* Hiasan lingkaran sederhana */}
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-white/10"></div>
          <div className="pointer-events-none absolute -bottom-6 right-40 h-32 w-32 rounded-full bg-white/10"></div>

          <div className="relative">
            {/* Logo dan identitas instansi */}
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md">
                <img src="/images/logo-dinsos.png" alt="Logo DINSOS" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-2xl font-extrabold tracking-wide">SAPA DINSOS</p>
                <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                  Dinas Sosial Kabupaten Majalengka
                </p>
              </div>
            </div>

            {/* Judul dan deskripsi */}
            <h1 className="mt-12 text-4xl font-bold leading-tight">
              Selamat Datang di SAPA DINSOS
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-blue-50">
              Sistem Antrean Pelayanan Dinas Sosial Kabupaten Majalengka. Sapa, Daftar, Dilayani: mudah, cepat, dan transparan.
            </p>

            {/* Fitur utama */}
            <ul className="mt-10 space-y-6">
              <li className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Ticket className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-lg font-semibold">Ambil Antrean Online</span>
                  <span className="text-sm text-blue-100">Dari rumah, tanpa perlu antre lama di kantor.</span>
                </span>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <FileText className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-lg font-semibold">Informasi Pelayanan</span>
                  <span className="text-sm text-blue-100">Lihat daftar layanan dan persyaratannya.</span>
                </span>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Clock className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-lg font-semibold">Pantau Status Antrean</span>
                  <span className="text-sm text-blue-100">Cek status antrean Anda secara langsung.</span>
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ===== KOLOM KANAN: formulir login ===== */}
        <section className="flex flex-col justify-center">
          {/* Logo ringkas (hanya tampil di layar kecil karena kolom kiri disembunyikan) */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <img src="/images/logo-dinsos.png" alt="Logo DINSOS" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-xl font-extrabold tracking-wide text-[#1976d2]">SAPA DINSOS</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Dinas Sosial Kabupaten Majalengka
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-10">
            {/* Ikon dan judul */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-[#1976d2]">
                <User className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-slate-900 sm:text-3xl">Masuk ke Akun Anda</h2>
              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                Silakan masuk untuk melanjutkan ke layanan antrean.
              </p>
            </div>

            {/* Pesan error umum dari server (email/password salah, akun nonaktif, dan sebagainya) */}
            {pesanForm && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{pesanForm}</span>
              </div>
            )}

            {/* Tombol kirim ulang email verifikasi (hanya untuk akun yang belum verifikasi email) */}
            {emailBelumVerifikasi && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={handleKirimUlang}
                  disabled={kirimUlang.loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1976d2] py-2.5 text-sm font-semibold text-[#1976d2] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {kirimUlang.loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</> : 'Kirim Ulang Email Verifikasi'}
                </button>
                {kirimUlang.pesan && (
                  <p className="rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-600">{kirimUlang.pesan}</p>
                )}
              </div>
            )}

            {/* Formulir. noValidate = validasi memakai pesan kita sendiri, bukan bawaan browser */}
            <form onSubmit={kirimForm} noValidate className="mt-6 space-y-5">
              {/* Kolom email / nomor HP */}
              <div>
                <label htmlFor="login-identitas" className="mb-2 block text-sm font-semibold text-slate-700">
                  Email atau Nomor HP
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-identitas"
                    ref={refIdentitas}
                    type="text"
                    autoComplete="username"
                    value={identitas}
                    onChange={ubahIdentitas}
                    disabled={loading}
                    placeholder="nama@email.com atau 08xxxxxxxxxx"
                    aria-invalid={Boolean(errors.identitas)}
                    aria-describedby={errors.identitas ? 'login-identitas-error' : undefined}
                    className={`${gayaKolom(errors.identitas)} pl-12 pr-4`}
                  />
                </div>
                {errors.identitas && (
                  <p id="login-identitas-error" role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errors.identitas}
                  </p>
                )}
              </div>

              {/* Kolom password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  {/* Tautan Lupa Password: baru ditampilkan setelah fiturnya benar-benar jadi */}
                  {LUPA_PASSWORD_AKTIF && (
                    <Link to="/lupa-password" className="text-sm font-semibold text-[#1976d2] hover:text-[#1565c0]">
                      Lupa password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    ref={refPassword}
                    type={tampilPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={ubahPassword}
                    disabled={loading}
                    placeholder="Masukkan password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    className={`${gayaKolom(errors.password)} pl-12 pr-14`}
                  />
                  {/* Tombol mata: diberi jarak dari tepi dan padding kanan input dibuat lebar (pr-14) agar teks tidak menabrak ikon */}
                  <button
                    type="button"
                    onClick={() => setTampilPassword((nilai) => !nilai)}
                    disabled={loading}
                    aria-label={tampilPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    {tampilPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="login-password-error" role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Tombol Masuk: nonaktif dan menampilkan loading selama proses */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1976d2] py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#1565c0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Masuk
                  </>
                )}
              </button>
            </form>

            {/* Pemisah */}
            <div className="my-6 flex items-center gap-4 text-sm text-slate-400">
              <span className="h-px flex-1 bg-slate-200"></span>
              atau
              <span className="h-px flex-1 bg-slate-200"></span>
            </div>

            {/* Tombol Daftar Akun (khusus pengunjung) */}
            <Link
              to="/register"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1976d2] py-3 text-base font-semibold text-[#1976d2] transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.99]"
            >
              <UserPlus className="h-5 w-5" />
              Daftar Akun
            </Link>

            {/* Catatan untuk petugas (akun petugas tidak bisa didaftarkan sendiri) */}
            <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
              Pendaftaran akun hanya untuk pengunjung. Petugas Dinas Sosial masuk menggunakan akun yang disediakan oleh pengelola sistem.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
