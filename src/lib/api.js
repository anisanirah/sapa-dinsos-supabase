// ========================================
// FILE: lib/api.js
// DESKRIPSI: "Penerjemah" antara halaman-halaman React dan Supabase.
//
// Pada versi Laravel, halaman memanggil backend lewat axios, misalnya:
//     api.get('/antreans/my')   atau   api.put(`/antreans/${id}/call`)
// Agar TAMPILAN & KODE HALAMAN TETAP SAMA, file ini menyediakan fungsi api.get/post/put
// dengan alamat yang sama persis, tetapi di dalamnya memakai supabase-js:
//     '/antreans/my'          -> supabase.rpc('antrean_saya')
//     '/antreans/{id}/call'   -> supabase.rpc('ambil_antrean', { p_id: id })
// Hasilnya dibentuk seperti jawaban axios: { data: ... }.
// Jika gagal, error dibentuk seperti error axios: err.response.status & err.response.data
// (berisi message, kode, errors) sehingga pesanError() dan halaman lama tetap bekerja.
// ========================================

// Klien Supabase (lihat lib/supabase.js)
import { supabase } from './supabase'

// ----------------------------------------
// BAGIAN 1. PEMBENTUK ERROR (meniru bentuk error axios + Laravel)
// ----------------------------------------

// Kode error -> status HTTP (seperti yang dulu dikirim Laravel)
const STATUS_KODE = {
  tidak_login: 401,
  akun_nonaktif: 401,
  tidak_berhak: 403,
  email_belum_terverifikasi: 403,
  tidak_ditemukan: 404,
  sudah_diambil: 409,
  status_berubah: 409,
  terlalu_banyak_percobaan: 429,
}

// Membuat error berbentuk seperti error axios.
// status: angka HTTP, message: pesan, kode: kode singkat, errors: { kolom: [pesan] }, tambahan: data lain
export function buatGalat(status, message, kode = null, errors = null, tambahan = {}) {
  // Error biasa JavaScript, ditambah properti "response" seperti axios
  const galat = new Error(message)
  galat.response = {
    status,
    data: { message, ...(kode ? { kode } : {}), ...(errors ? { errors } : {}), ...tambahan },
  }
  return galat
}

// Error "tidak ada koneksi" (sama dengan axios: code = 'ERR_NETWORK', tanpa response)
function galatJaringan() {
  const galat = new Error('Tidak dapat terhubung ke server.')
  galat.code = 'ERR_NETWORK'
  return galat
}

// Mengecek apakah error disebabkan internet putus / server tidak bisa dihubungi
export function apakahGalatJaringan(error) {
  const pesan = String(error?.message || '')
  return (
    error?.name === 'AuthRetryableFetchError' ||
    pesan.includes('Failed to fetch') ||
    pesan.includes('NetworkError') ||
    pesan.includes('Load failed') ||
    pesan.includes('fetch failed')
  )
}

// Mengubah error dari fungsi database (supabase.rpc) menjadi error bergaya axios.
// Fungsi database mengirim: message = pesan, hint = kode, details = daftar error per kolom.
export function galatDariRpc(error) {
  // Internet putus / project Supabase sedang tidur
  if (apakahGalatJaringan(error)) return galatJaringan()

  // Sesi login tidak valid / kedaluwarsa (kode bawaan PostgREST)
  if (error?.code === 'PGRST301' || error?.code === 'PGRST303' || /JWT/i.test(error?.message || '')) {
    return buatGalat(401, 'Sesi login Anda sudah berakhir. Silakan login kembali.', 'tidak_login')
  }

  // Tidak punya hak menjalankan fungsi (misal belum login)
  if (error?.code === '42501') {
    return buatGalat(403, 'Anda tidak memiliki akses untuk tindakan ini.', 'tidak_berhak')
  }

  // Kode singkat dari fungsi database (lihat _galat() di supabase/02_fungsi.sql)
  const kode = error?.hint || null

  // Daftar error per kolom: [["kolom","pesan"], ...] -> { kolom: ["pesan"] } (urutan dijaga)
  let errors = null
  if (error?.details && error.details.startsWith('[')) {
    try {
      errors = Object.fromEntries(JSON.parse(error.details).map(([kolom, pesan]) => [kolom, [pesan]]))
    } catch {
      errors = null
    }
  }

  return buatGalat(STATUS_KODE[kode] || 422, error?.message || 'Terjadi kesalahan. Silakan coba lagi.', kode, errors)
}

// Pengganti "interceptor 401" axios: jika sesi habis / akun dinonaktifkan,
// hapus sesi di browser lalu arahkan ke halaman login.
async function tanganiSesiHabis(galat) {
  if (galat?.response?.status !== 401) return
  // Hapus sesi login di browser ini saja
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  // Hapus data tampilan yang tersimpan di browser
  localStorage.removeItem('user')
  localStorage.removeItem('userName')
  localStorage.removeItem('userRole')
  localStorage.removeItem('isLoggedIn')
  // Arahkan ke login (kecuali sedang di halaman login/register)
  if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
    window.location.href = '/login'
  }
}

// Memanggil fungsi database lalu mengembalikan { data } seperti axios
async function rpc(nama, parameter = {}) {
  let hasil
  try {
    hasil = await supabase.rpc(nama, parameter)
  } catch (e) {
    // fetch() melempar error (tanpa jaringan)
    throw apakahGalatJaringan(e) ? galatJaringan() : e
  }
  if (hasil.error) {
    const galat = galatDariRpc(hasil.error)
    await tanganiSesiHabis(galat)
    throw galat
  }
  return { data: hasil.data }
}

// ----------------------------------------
// BAGIAN 2. FUNGSI BANTU KATA SANDI & EMAIL
// ----------------------------------------

// Syarat kata sandi wajib (sama dengan components/SyaratPassword.jsx)
export function kataSandiValid(password = '') {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)
}

// Pesan jika kata sandi belum memenuhi syarat
const PESAN_SYARAT = 'Kata sandi belum memenuhi persyaratan (huruf besar, huruf kecil, angka, minimal 8 karakter).'

// Mengubah error dari Supabase Auth (login, ubah kata sandi, kirim email) menjadi pesan Indonesia
export function galatDariAuth(error, cadangan = 'Terjadi kesalahan. Silakan coba lagi.') {
  // Tanpa koneksi
  if (apakahGalatJaringan(error)) return galatJaringan()
  const kode = error?.code || ''
  const pesan = String(error?.message || '')
  // Terlalu sering (login / kirim email)
  if (error?.status === 429 || kode.startsWith('over_')) {
    if (kode === 'over_email_send_rate_limit') {
      return buatGalat(429, 'Batas pengiriman email sedang tercapai. Tunggu beberapa menit lalu coba lagi.', 'terlalu_banyak_percobaan')
    }
    return buatGalat(429, 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.', 'terlalu_banyak_percobaan')
  }
  // Kata sandi terlalu lemah menurut pengaturan Supabase
  if (kode === 'weak_password') return buatGalat(422, PESAN_SYARAT, 'validasi', { password: [PESAN_SYARAT] })
  // Kata sandi baru sama dengan yang lama
  if (kode === 'same_password' || pesan.includes('different from the old')) {
    const p = 'Kata sandi baru harus berbeda dari kata sandi lama.'
    return buatGalat(422, p, 'validasi', { password: [p] })
  }
  // Akun diblokir (dinonaktifkan administrator)
  if (kode === 'user_banned' || pesan.includes('banned')) {
    return buatGalat(403, 'Akun dinonaktifkan. Silakan hubungi administrator.', 'akun_nonaktif')
  }
  // Format email ditolak
  if (kode === 'email_address_invalid' || kode === 'validation_failed') {
    return buatGalat(422, 'Format email tidak valid.', 'validasi', { email: ['Format email tidak valid.'] })
  }
  // Pesan cadangan
  return buatGalat(error?.status || 422, cadangan)
}

// Alamat halaman aplikasi (dipakai di tautan email). Contoh: https://sapa-dinsos.vercel.app
const asal = () => window.location.origin

// Mengirim ulang email verifikasi ke alamat email tertentu (dipakai di halaman Login)
export async function kirimUlangVerifikasi(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${asal()}/verifikasi-email` },
  })
  if (error) throw galatDariAuth(error, 'Email verifikasi gagal dikirim. Pastikan layanan email aktif, lalu coba lagi.')
  return { message: 'Email verifikasi telah dikirim ulang. Silakan periksa kotak masuk Anda.' }
}

// ----------------------------------------
// BAGIAN 3. PENANGAN SETIAP ALAMAT (route) LAMA
// ----------------------------------------

// GET /layanans -> baca tabel layanans (boleh dibaca semua pengguna login, diatur RLS)
async function ambilLayanan() {
  const { data, error } = await supabase.from('layanans').select('*').order('id')
  if (error) {
    const galat = galatDariRpc(error)
    await tanganiSesiHabis(galat)
    throw galat
  }
  return { data }
}

// PUT /password -> ubah kata sandi (wajib isi kata sandi lama)
async function ubahKataSandi(body) {
  const { password_lama = '', password = '', password_confirmation = '' } = body || {}
  // Validasi seperti AuthController::ubahPassword
  if (!password_lama) throw buatGalat(422, 'Kata sandi lama wajib diisi.', 'validasi', { password_lama: ['Kata sandi lama wajib diisi.'] })
  if (!password) throw buatGalat(422, 'Kata sandi baru wajib diisi.', 'validasi', { password: ['Kata sandi baru wajib diisi.'] })
  if (!kataSandiValid(password)) throw buatGalat(422, PESAN_SYARAT, 'validasi', { password: [PESAN_SYARAT] })
  if (password !== password_confirmation) throw buatGalat(422, 'Konfirmasi kata sandi baru tidak sama.', 'validasi', { password: ['Konfirmasi kata sandi baru tidak sama.'] })
  if (password === password_lama) throw buatGalat(422, 'Kata sandi baru harus berbeda dari kata sandi lama.', 'validasi', { password: ['Kata sandi baru harus berbeda dari kata sandi lama.'] })

  // Periksa kata sandi lama di database
  const { data: benar } = await rpc('cek_password_lama', { p_password: password_lama })
  if (!benar) throw buatGalat(422, 'Kata sandi lama salah.', 'validasi', { password_lama: ['Kata sandi lama salah.'] })

  // Simpan kata sandi baru di Supabase Auth
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw galatDariAuth(error, 'Gagal mengubah kata sandi.')

  // Keluarkan semua perangkat LAIN demi keamanan; perangkat ini tetap login
  await supabase.auth.signOut({ scope: 'others' }).catch(() => {})
  return { data: { message: 'Kata sandi berhasil diubah.' } }
}

// POST /lupa-password -> kirim tautan atur ulang kata sandi ke email
async function lupaKataSandi(body) {
  const email = String(body?.email || '').trim()
  if (!email) throw buatGalat(422, 'Email wajib diisi.', 'validasi', { email: ['Email wajib diisi.'] })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw buatGalat(422, 'Format email tidak valid.', 'validasi', { email: ['Format email tidak valid.'] })

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${asal()}/reset-password` })
  if (error) {
    // Diminta terlalu sering
    if (error.status === 429 || String(error.code || '').startsWith('over_')) {
      throw buatGalat(429, 'Tunggu sebentar sebelum meminta tautan lagi.', 'terlalu_banyak_percobaan')
    }
    throw galatDariAuth(error, 'Email gagal dikirim. Pastikan layanan email aktif, lalu coba lagi.')
  }
  // Jawaban SELALU sama (terdaftar atau tidak) agar email orang lain tidak bisa ditebak
  return { data: { message: 'Jika email tersebut terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim. Periksa kotak masuk Anda.' } }
}

// POST /reset-password -> simpan kata sandi baru memakai kode (token_hash) dari email
async function aturUlangKataSandi(body) {
  const { token_hash = '', password = '', password_confirmation = '' } = body || {}
  if (!password) throw buatGalat(422, 'Kata sandi baru wajib diisi.', 'validasi', { password: ['Kata sandi baru wajib diisi.'] })
  if (!kataSandiValid(password)) throw buatGalat(422, PESAN_SYARAT, 'validasi', { password: [PESAN_SYARAT] })
  if (password !== password_confirmation) throw buatGalat(422, 'Konfirmasi kata sandi tidak sama.', 'validasi', { password: ['Konfirmasi kata sandi tidak sama.'] })

  const pesanKedaluwarsa = 'Tautan atur ulang kata sandi tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.'

  if (token_hash) {
    // Tukarkan kode dari email menjadi sesi sementara (kode hanya bisa dipakai sekali)
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
    if (error) {
      if (apakahGalatJaringan(error)) throw galatJaringan()
      throw buatGalat(422, pesanKedaluwarsa, 'kedaluwarsa')
    }
  } else {
    // Template email bawaan Supabase: sesi sudah dibuat otomatis dari tautan
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw buatGalat(422, pesanKedaluwarsa, 'kedaluwarsa')
  }

  // Simpan kata sandi baru
  const { error: galatUbah } = await supabase.auth.updateUser({ password })
  if (galatUbah) throw galatDariAuth(galatUbah, 'Gagal mengatur ulang kata sandi.')

  // Keluarkan SEMUA perangkat (termasuk sesi sementara ini), sama seperti Laravel
  await supabase.auth.signOut({ scope: 'global' }).catch(() => {})
  return { data: { message: 'Kata sandi berhasil diatur ulang. Silakan login dengan kata sandi baru.' } }
}

// POST /email/kirim-ulang -> kirim ulang email verifikasi untuk pengguna yang sedang login
async function kirimUlangUntukSaya() {
  const { data } = await supabase.auth.getUser()
  const pengguna = data?.user
  if (!pengguna) throw buatGalat(401, 'Sesi login Anda sudah berakhir. Silakan login kembali.', 'tidak_login')
  if (pengguna.email_confirmed_at) {
    return { data: { message: 'Email Anda sudah terverifikasi.', sudah_terverifikasi: true } }
  }
  return { data: await kirimUlangVerifikasi(pengguna.email) }
}

// POST /logout -> keluar dari perangkat ini saja (perangkat lain tetap login)
async function keluar() {
  await supabase.auth.signOut({ scope: 'local' })
  return { data: { message: 'Logout berhasil' } }
}

// ----------------------------------------
// BAGIAN 4. DAFTAR ALAMAT LAMA -> FUNGSI BARU
// Setiap baris: [METODE, pola alamat, fungsi penangan(cocok, body)]
// ----------------------------------------
const RUTE = [
  // --- AKUN ---
  ['GET',  /^\/me$/,                            () => rpc('data_saya').then((r) => ({ data: { user: r.data, profile: r.data?.profile } }))],
  ['PUT',  /^\/profile$/,                       (_, b) => rpc('perbarui_profil', { p_nama: b?.nama ?? '', p_alamat: b?.alamat ?? '', p_no_telp: b?.no_telp ?? '' })],
  ['PUT',  /^\/password$/,                      (_, b) => ubahKataSandi(b)],
  ['POST', /^\/lupa-password$/,                 (_, b) => lupaKataSandi(b)],
  ['POST', /^\/reset-password$/,                (_, b) => aturUlangKataSandi(b)],
  ['POST', /^\/email\/kirim-ulang$/,            () => kirimUlangUntukSaya()],
  ['POST', /^\/logout$/,                        () => keluar()],

  // --- LAYANAN ---
  ['GET',  /^\/layanans$/,                      () => ambilLayanan()],

  // --- PENGUNJUNG ---
  ['GET',  /^\/antreans\/my$/,                  () => rpc('antrean_saya')],
  ['POST', /^\/antreans$/,                      (_, b) => rpc('ambil_antrean_online', { p_data: b || {} })],
  ['PUT',  /^\/antreans\/(\d+)\/batal-saya$/,   (m) => rpc('batal_saya', { p_id: Number(m[1]) })],

  // --- PETUGAS PENDAFTARAN ---
  ['POST', /^\/antreans\/langsung$/,            (_, b) => rpc('daftar_langsung', { p_data: b || {} })],
  ['POST', /^\/antreans\/verify-qr$/,           (_, b) => rpc('verifikasi_barcode', { p_kode: b?.qr_data ?? '' })],
  ['PUT',  /^\/antreans\/(\d+)\/batal$/,        (m, b) => rpc('batal_petugas', { p_id: Number(m[1]), p_alasan: b?.alasan ?? null })],

  // --- PETUGAS PELAYANAN ---
  ['GET',  /^\/pelayanan\/daftar$/,             () => rpc('pelayanan_daftar')],
  ['GET',  /^\/pelayanan\/saya$/,               () => rpc('pelayanan_saya')],
  ['PUT',  /^\/antreans\/(\d+)\/call$/,         (m) => rpc('ambil_antrean', { p_id: Number(m[1]) })],
  ['PUT',  /^\/antreans\/(\d+)\/mulai$/,        (m) => rpc('mulai_layani', { p_id: Number(m[1]) })],
  ['PUT',  /^\/antreans\/(\d+)\/selesai$/,      (m) => rpc('selesai_layani', { p_id: Number(m[1]) })],
  ['PUT',  /^\/antreans\/(\d+)\/tidak-hadir$/,  (m) => rpc('tidak_hadir', { p_id: Number(m[1]) })],

  // --- KEDUA PETUGAS ---
  ['GET',  /^\/antreans\/today$/,               () => rpc('antrean_hari_ini')],
  ['GET',  /^\/dashboard\/stats$/,              () => rpc('statistik_dashboard')],
  ['GET',  /^\/antreans\/(\d+)$/,               (m) => rpc('detail_antrean', { p_id: Number(m[1]) })],
]

// Mencari penangan yang cocok dengan metode + alamat, lalu menjalankannya
async function jalankan(metode, alamat, body) {
  // Buang "?..." di belakang alamat jika ada
  const jalur = String(alamat).split('?')[0]
  for (const [m, pola, penangan] of RUTE) {
    const cocok = m === metode && jalur.match(pola)
    if (cocok) return penangan(cocok, body)
  }
  // Alamat belum dikenal (seharusnya tidak terjadi)
  throw buatGalat(404, `Alamat ${metode} ${jalur} tidak dikenal.`, 'tidak_ditemukan')
}

// Objek "api" dengan cara pakai yang sama seperti axios di versi Laravel
const api = {
  // Ambil data
  get: (alamat) => jalankan('GET', alamat),
  // Kirim data baru
  post: (alamat, body) => jalankan('POST', alamat, body),
  // Ubah data
  put: (alamat, body) => jalankan('PUT', alamat, body),
}

// Ekspor klien agar bisa dipakai: import api from '../lib/api'
export default api
