// ========================================
// FILE: lib/supabase.js
// DESKRIPSI: Membuat "klien" Supabase yang dipakai di seluruh aplikasi.
// Pengganti penerjemah ke Supabase, lihat lib/api.js (VITE_API_URL) pada versi lama.
// ========================================

// createClient = fungsi resmi dari pustaka supabase-js untuk terhubung ke project Supabase
import { createClient } from '@supabase/supabase-js'

// Alamat project & kunci publik diambil dari file .env (lokal) atau pengaturan Vercel (online).
// Kunci ini memang boleh terlihat di browser; keamanan data dijaga oleh RLS & fungsi database.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Peringatan jelas jika .env belum diisi (agar tidak bingung saat layar kosong)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Pesan muncul di Console browser (F12)
  console.error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. ' +
    'Salin .env.example menjadi .env lalu isi dari Supabase > Project Settings > API.'
  )
}

// Klien Supabase: dipakai untuk login (supabase.auth) dan memanggil fungsi database (supabase.rpc)
export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_ANON_KEY || 'kunci-belum-diisi', {
  auth: {
    // Simpan sesi login di browser agar tetap masuk setelah halaman dimuat ulang
    persistSession: true,
    // Perpanjang sesi otomatis sebelum habis
    autoRefreshToken: true,
    // Baca tautan login dari email jika memakai template email bawaan Supabase
    detectSessionInUrl: true,
  },
})

// Ekspor bawaan agar bisa dipakai: import supabase from '../lib/supabase'
export default supabase
