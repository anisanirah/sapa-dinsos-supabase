// ========================================
// FILE: AuthContext.jsx
// DESKRIPSI: Menyimpan data login (user) dan menyediakan fungsi
// login, register, dan logout untuk seluruh aplikasi.
// Versi Supabase: login memakai Supabase Auth, data diri & role diambil dari
// fungsi database data_saya() (role SELALU dari database, bukan dari pilihan di layar).
// ========================================

// Fungsi React untuk membuat dan memakai context
import { createContext, useContext, useState, useEffect } from 'react'
// Klien Supabase
import { supabase } from '../lib/supabase'
// Penerjemah ke Supabase + pembentuk error bergaya Laravel
import api, { buatGalat, galatDariAuth, galatDariRpc, apakahGalatJaringan, kataSandiValid } from '../lib/api'
// Notifikasi (toast)
import { useToast } from '../components/ToastProvider'

// Wadah data login
const AuthContext = createContext()

// Pola format email sederhana
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Menyeragamkan nomor HP ke bentuk 08xxxxxxxxxx (aturan sama dengan backend)
function normalisasiNomor(nilai = '') {
  let bersih = String(nilai).replace(/[\s\-.()]/g, '')
  if (bersih.startsWith('+62')) bersih = '0' + bersih.slice(3)
  else if (bersih.startsWith('62')) bersih = '0' + bersih.slice(2)
  return bersih
}

// Menyimpan nama & role ke browser (dipakai TopBar/Sidebar sebagai cadangan tampilan)
function simpanSesi(user) {
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('userName', user?.profile?.nama || user?.name || 'User')
  localStorage.setItem('userRole', user?.profile?.role || 'pengunjung')
  localStorage.setItem('isLoggedIn', 'true')
}

// Menghapus data tampilan login dari browser
function hapusSesi() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('userName')
  localStorage.removeItem('userRole')
  localStorage.removeItem('isLoggedIn')
}

// Mengambil data pengguna yang sedang login dari database (GET /me versi lama)
async function muatPengguna() {
  const { data, error } = await supabase.rpc('data_saya')
  if (error) throw galatDariRpc(error)
  return data
}

// Penyedia data login: membungkus seluruh aplikasi
export function AuthProvider({ children }) {
  // Data pengguna yang sedang login (null jika belum login)
  const [user, setUser] = useState(null)
  // Token sesi (disediakan agar sama dengan versi lama; jarang dipakai)
  const [token, setToken] = useState(null)
  // Status memuat data pengguna
  const [loading, setLoading] = useState(true)
  // Fungsi notifikasi
  const toast = useToast()

  // Saat aplikasi dibuka: cek apakah masih ada sesi login tersimpan di browser
  useEffect(() => {
    let aktif = true

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!data.session) return
        setToken(data.session.access_token)
        try {
          // Tanyakan ke database siapa pemilik sesi ini
          const pengguna = await muatPengguna()
          if (aktif) {
            setUser(pengguna)
            simpanSesi(pengguna)
          }
        } catch (err) {
          // Sesi tidak valid / akun dinonaktifkan: hapus sesi (kecuali hanya masalah internet)
          if (err?.code !== 'ERR_NETWORK') {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
            hapusSesi()
          }
        }
      })
      .finally(() => {
        if (aktif) setLoading(false)
      })

    // Dengarkan perubahan sesi: keluar, atau masuk dari tautan email (verifikasi / atur ulang)
    const { data: langganan } = supabase.auth.onAuthStateChange((peristiwa, sesi) => {
      setToken(sesi?.access_token || null)
      if (peristiwa === 'SIGNED_OUT') {
        setUser(null)
        return
      }
      if (peristiwa === 'SIGNED_IN' || peristiwa === 'USER_UPDATED') {
        // Jalankan setelah callback selesai (aturan supabase-js agar tidak macet)
        setTimeout(() => {
          muatPengguna()
            .then((pengguna) => {
              if (aktif && pengguna) {
                setUser(pengguna)
                simpanSesi(pengguna)
              }
            })
            .catch(() => {})
        }, 0)
      }
    })

    // Berhenti mendengarkan saat komponen dilepas
    return () => {
      aktif = false
      langganan?.subscription?.unsubscribe()
    }
  }, [])

  // Login dengan email ATAU nomor HP. Supabase memeriksa akun dan password.
  const login = async (identitas, password) => {
    const teks = String(identitas || '').trim()
    let email = teks

    // 1. Login dengan NOMOR HP: cari email pemiliknya (hanya jika kata sandi benar)
    if (!teks.includes('@')) {
      const nomor = normalisasiNomor(teks)
      let hasil
      try {
        hasil = await supabase.rpc('email_untuk_login', { p_hp: nomor, p_password: password })
      } catch (e) {
        throw apakahGalatJaringan(e) ? galatDariAuth(e) : e
      }
      if (hasil.error) throw galatDariRpc(hasil.error)
      // Tidak ada akun atau kata sandi salah -> pesan SAMA seperti Laravel
      if (!hasil.data) throw buatGalat(422, 'Email atau password salah.', 'kredensial_salah')
      email = hasil.data
    }

    // 2. Masuk ke Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const kode = error.code || ''
      // Email belum diverifikasi: beri tahu & sertakan email agar bisa kirim ulang
      if (kode === 'email_not_confirmed' || String(error.message).includes('not confirmed')) {
        throw buatGalat(403,
          'Email Anda belum diverifikasi. Buka email dari SAPA DINSOS lalu klik tautan verifikasi, atau kirim ulang email di bawah.',
          'email_belum_terverifikasi', null, { email })
      }
      // Email / password salah (pesan sama untuk keduanya agar tidak bisa ditebak)
      if (kode === 'invalid_credentials' || String(error.message).includes('Invalid login')) {
        throw buatGalat(422, 'Email atau password salah.', 'kredensial_salah')
      }
      throw galatDariAuth(error, 'Login gagal. Silakan coba lagi.')
    }

    // 3. Ambil data diri & role dari database
    let pengguna
    try {
      pengguna = await muatPengguna()
    } catch (err) {
      // Akun dinonaktifkan atau gagal memuat: batalkan login
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      hapusSesi()
      if (err?.response?.data?.kode === 'akun_nonaktif') {
        throw buatGalat(403, 'Akun dinonaktifkan. Silakan hubungi administrator.', 'akun_nonaktif')
      }
      throw err
    }

    simpanSesi(pengguna)
    setToken(data.session?.access_token || null)
    setUser(pengguna)
    return { message: 'Login berhasil', user: pengguna, profile: pengguna?.profile }
  }

  // Pendaftaran akun pengunjung (role dikunci 'pengunjung' oleh trigger database)
  const register = async (form) => {
    // Rapikan isian
    const nama = String(form.nama || '').trim()
    const email = String(form.email || '').trim()
    const noTelp = normalisasiNomor(form.no_telp || '')
    const alamat = String(form.alamat || '').trim()

    // Validasi seperti AuthController::register (pesan berbahasa Indonesia)
    const errors = {}
    if (!nama) errors.nama = ['Nama lengkap wajib diisi.']
    else if (nama.length > 255) errors.nama = ['Nama terlalu panjang.']
    else if (!/^[\p{L}\s.'-]+$/u.test(nama)) errors.nama = ['Nama hanya boleh berisi huruf, spasi, titik, apostrof, dan tanda hubung.']
    if (!email) errors.email = ['Email wajib diisi.']
    else if (!POLA_EMAIL.test(email)) errors.email = ['Format email tidak valid.']
    if (!noTelp) errors.no_telp = ['Nomor HP wajib diisi.']
    else if (!/^08[1-9][0-9]{7,10}$/.test(noTelp)) errors.no_telp = ['Format nomor HP tidak valid. Contoh: 081234567890.']
    if (!form.password) errors.password = ['Password wajib diisi.']
    else if (!kataSandiValid(form.password)) errors.password = ['Kata sandi belum memenuhi persyaratan (huruf besar, huruf kecil, angka, minimal 8 karakter).']
    else if (form.password !== form.password_confirmation) errors.password = ['Konfirmasi password tidak sama dengan password.']
    if (!form.setuju) errors.setuju = ['Anda harus menyetujui syarat dan ketentuan serta kebijakan privasi.']
    if (alamat.length > 500) errors.alamat = ['Alamat terlalu panjang.']
    if (Object.keys(errors).length) {
      throw buatGalat(422, Object.values(errors)[0][0], 'validasi', errors)
    }

    // Nomor HP tidak boleh dipakai akun lain
    let cekHp
    try {
      cekHp = await supabase.rpc('hp_sudah_dipakai', { p_hp: noTelp })
    } catch (e) {
      // fetch() gagal total (tanpa internet)
      cekHp = { error: e }
    }
    if (cekHp.error) throw apakahGalatJaringan(cekHp.error) ? galatDariAuth(cekHp.error) : galatDariRpc(cekHp.error)
    if (cekHp.data) throw buatGalat(422, 'Nomor HP sudah digunakan.', 'validasi', { no_telp: ['Nomor HP sudah digunakan.'] })

    // Buat akun di Supabase Auth. Nama, HP, alamat disimpan ke profil oleh trigger database.
    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: { nama, no_telp: noTelp, alamat },
        // Tujuan tautan verifikasi di email
        emailRedirectTo: `${window.location.origin}/verifikasi-email`,
      },
    })
    if (error) {
      const kode = error.code || ''
      if (kode === 'user_already_exists' || kode === 'email_exists' || String(error.message).includes('already registered')) {
        throw buatGalat(422, 'Email sudah digunakan.', 'validasi', { email: ['Email sudah digunakan.'] })
      }
      if (String(error.message).includes('Database error')) {
        throw buatGalat(422, 'Nomor HP sudah digunakan atau tidak valid.', 'validasi', { no_telp: ['Nomor HP sudah digunakan atau tidak valid.'] })
      }
      // Pengiriman email gagal (SMTP belum diatur / salah)
      if (kode === 'unexpected_failure' || String(error.message).toLowerCase().includes('sending')) {
        throw buatGalat(503, 'Akun gagal dibuat karena email verifikasi tidak bisa dikirim. Hubungi pengelola sistem.')
      }
      throw galatDariAuth(error, 'Register gagal. Silakan coba lagi.')
    }

    // Supabase tidak memberi tahu email ganda secara langsung: ditandai dengan identities kosong
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw buatGalat(422, 'Email sudah digunakan.', 'validasi', { email: ['Email sudah digunakan.'] })
    }

    // Jika verifikasi email dimatikan di Supabase, pengguna langsung masuk (seperti Laravel)
    if (data.session) {
      const pengguna = await muatPengguna()
      simpanSesi(pengguna)
      setUser(pengguna)
      return { message: 'Registrasi berhasil.', email_terkirim: true, user: pengguna }
    }

    // Normal: pengguna harus membuka email verifikasi dulu, lalu login
    return {
      message: `Registrasi berhasil. Email verifikasi telah dikirim ke ${email}. Buka email tersebut, klik tautan verifikasi, lalu masuk.`,
      email_terkirim: true,
      perlu_verifikasi: true,
    }
  }

  // Memuat ulang data pengguna (dipakai setelah ubah profil / verifikasi email)
  const refreshUser = async () => {
    const pengguna = await muatPengguna()
    setUser(pengguna)
    simpanSesi(pengguna)
    return pengguna
  }

  // Logout: keluar dari Supabase (perangkat ini saja), lalu hapus data di browser
  const logout = async () => {
    try {
      await api.post('/logout')
    } catch (err) {
      console.error('Logout error:', err)
    }
    hapusSesi()
    setToken(null)
    setUser(null)
    toast.success('Anda berhasil logout.')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook untuk memakai data login: const { user, login } = useAuth()
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
