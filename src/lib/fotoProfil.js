// ========================================
// FILE: lib/fotoProfil.js
// DESKRIPSI: Fungsi bantu FOTO PROFIL:
//   - urlFoto()          : mengubah lokasi file menjadi alamat gambar
//   - siapkanFoto()      : memotong foto jadi persegi & memperkecilnya (hemat kuota)
//   - unggahFotoProfil() : unggah ke Supabase Storage lalu catat di profil
//   - hapusFotoProfil()  : hapus foto dari profil dan dari Storage
// Foto disimpan di bucket "foto-profil" dengan folder = id akun
// (lihat supabase/07_foto_profil.sql).
// ========================================

// Koneksi Supabase
import { supabase } from './supabase'

// Nama bucket penyimpanan foto
const BUCKET = 'foto-profil'

// Ukuran akhir foto (piksel, persegi) dan batas ukuran file asli yang boleh dipilih
const UKURAN_FOTO = 400
export const BATAS_FILE_MB = 5

// Ubah lokasi file (misal "id-akun/123.jpg") menjadi alamat gambar yang bisa ditampilkan
export function urlFoto(path) {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Potong foto menjadi persegi (bagian tengah) dan perkecil ke 400x400 piksel, format JPG.
// Hasilnya biasanya hanya 30–80 KB, jadi cepat dibuka dan hemat kuota Supabase.
export function siapkanFoto(file) {
  return new Promise((resolve, reject) => {
    // Hanya file gambar yang boleh dipilih
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar (JPG, PNG, atau WEBP).'))
      return
    }
    // Tolak file yang terlalu besar sebelum diproses
    if (file.size > BATAS_FILE_MB * 1024 * 1024) {
      reject(new Error(`Ukuran foto maksimal ${BATAS_FILE_MB} MB.`))
      return
    }
    const alamatSementara = URL.createObjectURL(file)
    const gambar = new Image()
    gambar.onload = () => {
      // Ambil sisi terpendek supaya potongan tetap persegi
      const sisi = Math.min(gambar.width, gambar.height)
      const x = (gambar.width - sisi) / 2
      const y = (gambar.height - sisi) / 2
      // Gambar ulang ke kanvas berukuran 400x400
      const kanvas = document.createElement('canvas')
      kanvas.width = UKURAN_FOTO
      kanvas.height = UKURAN_FOTO
      const ctx = kanvas.getContext('2d')
      ctx.fillStyle = '#ffffff' // latar putih untuk gambar PNG transparan
      ctx.fillRect(0, 0, UKURAN_FOTO, UKURAN_FOTO)
      ctx.drawImage(gambar, x, y, sisi, sisi, 0, 0, UKURAN_FOTO, UKURAN_FOTO)
      URL.revokeObjectURL(alamatSementara)
      // Simpan sebagai JPG kualitas 85%
      kanvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Foto gagal diproses.'))),
        'image/jpeg',
        0.85
      )
    }
    gambar.onerror = () => {
      URL.revokeObjectURL(alamatSementara)
      reject(new Error('Foto tidak bisa dibaca. Coba pilih foto lain.'))
    }
    gambar.src = alamatSementara
  })
}

// Hapus file lama dari Storage (kesalahan diabaikan karena tidak mengganggu pengguna)
async function hapusFileLama(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
}

// Unggah foto baru: proses -> unggah ke Storage -> catat di profil -> hapus file lama
export async function unggahFotoProfil(file, idAkun) {
  const blob = await siapkanFoto(file)
  // Nama file memakai waktu sekarang agar selalu baru (browser tidak memakai gambar lama)
  const path = `${idAkun}/${Date.now()}.jpg`
  const { error: errUnggah } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (errUnggah) throw new Error('Gagal mengunggah foto. Periksa koneksi internet lalu coba lagi.')

  // Catat lokasi foto di tabel profiles
  const { data, error } = await supabase.rpc('simpan_foto_profil', { p_path: path })
  if (error) {
    // Pencatatan gagal: hapus lagi file yang baru diunggah agar tidak menumpuk
    await hapusFileLama(path)
    throw new Error(error.message || 'Gagal menyimpan foto profil.')
  }
  await hapusFileLama(data?.foto_lama)
  return path
}

// Hapus foto profil: kosongkan di profil lalu hapus filenya
export async function hapusFotoProfil() {
  const { data, error } = await supabase.rpc('simpan_foto_profil', { p_path: null })
  if (error) throw new Error(error.message || 'Gagal menghapus foto profil.')
  await hapusFileLama(data?.foto_lama)
}
