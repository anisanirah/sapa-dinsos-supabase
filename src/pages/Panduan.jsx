// ========================================
// FILE: Panduan.jsx
// DESKRIPSI: Panduan penggunaan sesuai alur sistem antrean DINSOS.
// Isi menyesuaikan role pengguna yang sedang login.
// ========================================
// Data login: untuk tahu role pengguna
import { useAuth } from '../context/AuthContext'
// Ikon tanda tanya dari lucide-react
import { HelpCircle } from 'lucide-react'

// Isi panduan untuk setiap role. Format langkah: [judul, penjelasan]
const PANDUAN = {
  // Panduan untuk masyarakat (pengunjung)
  pengunjung: {
    judul: 'Panduan untuk Pengunjung',
    langkah: [
      ['Verifikasi email', 'Setelah mendaftar, buka email dari SAPA DINSOS dan klik "Verifikasi Email". Tanpa ini Anda belum bisa mengambil antrean online.'],
      ['Ambil nomor antrean', 'Di Dashboard, pilih jenis layanan lalu klik "Ambil Nomor Antrean". Anda mendapat nomor (contoh A001) dan QR Code. Satu akun hanya bisa memiliki satu antrean aktif per hari.'],
      ['Datang ke kantor', 'Datang ke Dinas Sosial pada HARI YANG SAMA. Antrean yang tidak diproses hari itu otomatis dibatalkan.'],
      ['Scan di meja pendaftaran', 'Tunjukkan QR Code di menu "Antrean" kepada petugas pendaftaran. Status berubah menjadi "Terverifikasi".'],
      ['Tunggu dipanggil', 'Petugas pelayanan memanggil nomor Anda secara lisan. Halaman "Antrean" juga menampilkan status "Dipanggil" dan nama petugas yang memanggil.'],
      ['Dilayani sampai selesai', 'Datang ke loket petugas tersebut. Setelah selesai, riwayat tersimpan di menu "Riwayat Antrean".'],
    ],
  },
  // Panduan untuk petugas di meja pendaftaran
  petugas_pendaftaran: {
    judul: 'Panduan untuk Petugas Pendaftaran',
    langkah: [
      ['Pengunjung daftar online', 'Buka menu "Scan Barcode", lalu scan QR Code di HP pengunjung dengan kamera atau alat scanner. Jika valid, status menjadi "Terverifikasi" dan otomatis muncul di 3 komputer pelayanan.'],
      ['Pengunjung datang langsung', 'Di Dashboard, isi form "Daftar Langsung" (nama, nomor HP bila ada, layanan). Sistem membuat nomor antrean + barcode.'],
      ['Cetak / verifikasi tiket', 'Setelah daftar langsung, klik "Cetak Tiket" untuk memberikan tiket kepada pengunjung, lalu klik "Verifikasi Sekarang" (pengunjung sudah hadir di tempat).'],
      ['Barcode ditolak', 'Jika barcode tidak valid atau kedaluwarsa, minta pengunjung mendaftar ulang (online atau langsung).'],
      ['Membatalkan antrean', 'Antrean yang salah input atau pengunjungnya pulang sebelum dipanggil dapat dibatalkan dari tabel di Dashboard.'],
    ],
  },
  // Panduan untuk petugas di 3 komputer pelayanan
  petugas_pelayanan: {
    judul: 'Panduan untuk Petugas Pelayanan',
    langkah: [
      ['Lihat daftar antrean', 'Dashboard menampilkan antrean yang sudah TERVERIFIKASI (format: A001 - Nama). Daftar diperbarui otomatis setiap beberapa detik.'],
      ['Ambil antrean', 'Klik "Ambil" pada antrean paling atas. Status menjadi "Dipanggil". Panggil nomor dan nama pengunjung secara lisan. Satu petugas hanya memegang satu antrean.'],
      ['Mulai layani', 'Saat pengunjung tiba di loket, klik "Mulai Layani".'],
      ['Selesai', 'Setelah pelayanan selesai, klik "Selesai". Riwayat tercatat dan Anda bisa mengambil antrean berikutnya.'],
      ['Pengunjung tidak datang', 'Jika sudah dipanggil beberapa kali tetapi tidak datang, klik "Tidak Hadir" lalu ambil antrean berikutnya.'],
    ],
  },
}

// Komponen halaman Panduan
export default function Panduan() {
  const { user } = useAuth()
  // Pilih panduan sesuai role; jika role tidak dikenal pakai panduan pengunjung
  const isi = PANDUAN[user?.profile?.role] || PANDUAN.pengunjung

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-teal-500 text-white flex items-center justify-center">
          <HelpCircle size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isi.judul}</h1>
          <p className="text-gray-500 text-sm">Ikuti langkah berikut sesuai urutan.</p>
        </div>
      </div>

      {/* Daftar langkah bernomor */}
      <ol className="space-y-3">
        {isi.langkah.map(([judul, teks], i) => (
          <li key={judul} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4">
            <span className="w-8 h-8 flex-shrink-0 rounded-full bg-[#1976d2] text-white font-bold flex items-center justify-center">{i + 1}</span>
            <div>
              <h3 className="font-semibold text-gray-800">{judul}</h3>
              <p className="text-sm text-gray-600 mt-1">{teks}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Ringkasan alur status antrean */}
      <div className="mt-6 text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-4">
        Alur status antrean: <strong>Menunggu</strong> → <strong>Terverifikasi</strong> (scan barcode) →{' '}
        <strong>Dipanggil</strong> → <strong>Dilayani</strong> → <strong>Selesai</strong>.
      </div>
    </div>
  )
}
