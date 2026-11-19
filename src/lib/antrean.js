// ========================================
// FILE: lib/antrean.js
// DESKRIPSI: Fungsi bantu yang dipakai di banyak halaman
// (label status, warna status, cek "hari ini", dan pesan error dari backend).
// ========================================

// Label status yang mudah dipahami pengunjung & petugas
export const LABEL_STATUS = {
  menunggu: 'Menunggu Verifikasi',
  terverifikasi: 'Terverifikasi',
  dipanggil: 'Dipanggil',
  dilayani: 'Sedang Dilayani',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

// Warna badge status (kelas Tailwind)
export const WARNA_STATUS = {
  menunggu: 'bg-amber-100 text-amber-800',
  terverifikasi: 'bg-blue-100 text-blue-800',
  dipanggil: 'bg-yellow-100 text-yellow-800',
  dilayani: 'bg-purple-100 text-purple-800',
  selesai: 'bg-green-100 text-green-800',
  dibatalkan: 'bg-red-100 text-red-800',
}

// Status yang dianggap "masih berjalan"
export const STATUS_AKTIF = ['menunggu', 'terverifikasi', 'dipanggil', 'dilayani']

// Label status (cadangan: tampilkan apa adanya)
export const labelStatus = (status) => LABEL_STATUS[status] || status

// Cek apakah tanggal antrean (format "2026-11-17" atau ISO) adalah hari ini (waktu lokal)
export function isHariIni(tanggal) {
  if (!tanggal) return false
  const t = String(tanggal).slice(0, 10)
  const d = new Date()
  const hariIni = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return t === hariIni
}

// Ambil pesan error yang paling jelas dari jawaban Supabase
export function pesanError(err, cadangan = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (err?.code === 'ERR_NETWORK') {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda, lalu coba lagi.'
  }
  const errors = err?.response?.data?.errors
  if (errors) {
    const pertama = Object.values(errors)[0]
    if (Array.isArray(pertama) && pertama[0]) return pertama[0]
  }
  return err?.response?.data?.message || cadangan
}

// Format jam "08:15" dari tanggal/ISO
export function formatJam(waktu) {
  if (!waktu) return '-'
  return new Date(waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// Format tanggal "17 November 2026"
export function formatTanggal(waktu) {
  if (!waktu) return '-'
  return new Date(waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Daftar 26 kecamatan di Kabupaten Majalengka (harus sama dengan _daftar_kecamatan() di supabase/02_fungsi.sql)
export const KECAMATAN = [
  'Argapura', 'Banjaran', 'Bantarujeg', 'Cigasong', 'Cikijing', 'Cingambul',
  'Dawuan', 'Jatitujuh', 'Jatiwangi', 'Kadipaten', 'Kasokandel', 'Kertajati',
  'Lemahsugih', 'Leuwimunding', 'Ligung', 'Maja', 'Majalengka', 'Malausma',
  'Palasah', 'Panyingkiran', 'Rajagaluh', 'Sindang', 'Sindangwangi', 'Sukahaji',
  'Sumberjaya', 'Talaga',
  'Luar Kabupaten Majalengka',
]

// Alamat singkat: "Tonjong, Kec. Majalengka"
export function alamatSingkat(antrean) {
  if (!antrean?.desa_kelurahan) return ''
  if (!antrean.kecamatan || antrean.kecamatan === 'Luar Kabupaten Majalengka') {
    return [antrean.desa_kelurahan, antrean.kecamatan].filter(Boolean).join(', ')
  }
  return `${antrean.desa_kelurahan}, Kec. ${antrean.kecamatan}`
}
