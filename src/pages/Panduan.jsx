// ========================================
// FILE: Panduan.jsx
// DESKRIPSI: Panduan penggunaan sesuai alur sistem antrean DINSOS.
// Isi menyesuaikan role pengguna yang sedang login.
// Tampilan: banner judul, lalu langkah bernomor dengan garis penghubung
// dan kotak ikon di setiap langkah.
// ========================================
// Data login: untuk tahu role pengguna
import { useAuth } from '../context/AuthContext'
// Banner judul bersama
import KepalaHalaman from '../components/KepalaHalaman'
// Ikon-ikon dari lucide-react (satu ikon untuk setiap langkah)
import {
  BookOpen,      // Ikon buku untuk banner panduan
  Mail,          // Verifikasi email
  Ticket,        // Ambil nomor antrean
  Building2,     // Datang ke kantor
  QrCode,        // Scan barcode / QR Code
  Users,         // Tunggu dipanggil
  CheckCircle2,  // Selesai dilayani
  UserPlus,      // Daftar langsung
  Printer,       // Cetak tiket
  ShieldAlert,   // Barcode ditolak
  XCircle,       // Membatalkan antrean
  BarChart3,     // Rekap layanan
  ListOrdered,   // Daftar antrean
  Megaphone,     // Panggil dengan suara
  Repeat,        // Panggil ulang
  PlayCircle,    // Mulai layani
  UserX,         // Pengunjung tidak datang
  Info,          // Ikon info pada kotak alur status
  MonitorPlay    // Layar antrean TV
} from 'lucide-react'

// Isi panduan untuk setiap role. Format langkah: [ikon, judul, penjelasan]
const PANDUAN = {
  pengunjung: {
    judul: 'Panduan untuk Pengunjung',
    deskripsi: 'Ikuti langkah berikut untuk mendapatkan pelayanan di Dinas Sosial.',
    langkah: [
      [Mail, 'Verifikasi Email', 'Setelah mendaftar, buka email dari SAPA DINSOS dan klik "Verifikasi Email". Tanpa verifikasi, Anda belum bisa mengambil antrean online.'],
      [Ticket, 'Ambil Nomor Antrean', 'Di Dashboard, pilih jenis layanan lalu klik "Ambil Nomor Antrean". Anda mendapat nomor (contoh: A001) dan QR Code. Satu akun hanya bisa memiliki satu antrean aktif per hari.'],
      [Building2, 'Datang ke Kantor', 'Datang ke Dinas Sosial pada hari yang sama. Antrean yang tidak diproses pada hari tersebut akan otomatis dibatalkan.'],
      [QrCode, 'Scan di Meja Pendaftaran', 'Tunjukkan QR Code di menu "Antrean" kepada petugas pendaftaran. Status akan berubah menjadi "Terverifikasi".'],
      [Users, 'Tunggu Dipanggil', 'Petugas pelayanan akan memanggil nomor Anda lewat suara panggilan. Halaman "Antrean" juga menampilkan status "Dipanggil" dan nama petugas yang memanggil.'],
      [CheckCircle2, 'Dilayani sampai Selesai', 'Datang ke loket petugas sesuai panggilan. Setelah pelayanan selesai, riwayat tersimpan di menu "Riwayat Antrean".'],
    ],
  },
  petugas_pendaftaran: {
    judul: 'Panduan untuk Petugas Pendaftaran',
    deskripsi: 'Ikuti langkah berikut sesuai urutan.',
    langkah: [
      [QrCode, 'Pengunjung Daftar Online', 'Buka menu "Scan Barcode", lalu scan QR Code di HP pengunjung dengan kamera atau alat scanner. Jika valid, status menjadi "Terverifikasi" dan otomatis muncul di 4 komputer pelayanan.'],
      [UserPlus, 'Pengunjung Datang Langsung', 'Di Dashboard, isi form "Daftar Langsung" (nama, nomor HP bila ada, layanan). Sistem membuat nomor antrean + barcode.'],
      [Printer, 'Cetak / Verifikasi Tiket', 'Setelah daftar langsung, klik "Cetak Tiket" untuk memberikan tiket kepada pengunjung, lalu klik "Verifikasi Sekarang" (pengunjung sudah hadir di tempat).'],
      [ShieldAlert, 'Barcode Ditolak', 'Jika barcode tidak valid atau kedaluwarsa, minta pengunjung mendaftar ulang (online atau langsung).'],
      [XCircle, 'Membatalkan Antrean', 'Antrean yang salah input atau pengunjungnya pulang sebelum dipanggil dapat dibatalkan dari tabel di Dashboard.'],
      [BarChart3, 'Rekap Layanan', 'Buka menu "Rekap Layanan" untuk melihat jumlah permohonan per jenis layanan (tag), hari ini atau per bulan. Klik "Unduh PDF" untuk laporan resmi berkop surat (misalnya pilih "Bulan Ini" di akhir bulan).'],
    ],
  },
  petugas_pelayanan: {
    judul: 'Panduan untuk Petugas Pelayanan',
    deskripsi: 'Ikuti langkah berikut sesuai urutan.',
    langkah: [
      [ListOrdered, 'Lihat Daftar Antrean', 'Dashboard menampilkan antrean yang sudah TERVERIFIKASI (format: A001 - Nama). Daftar diperbarui otomatis setiap beberapa detik.'],
      [Megaphone, 'Ambil Antrean', 'Klik "Ambil" pada antrean paling atas. Status menjadi "Dipanggil" dan komputer mengumumkan nomor, nama, serta nomor loket lewat speaker. Satu petugas hanya memegang satu antrean.'],
      [Repeat, 'Panggil Ulang & Nomor Loket', 'Setiap panggilan otomatis tampil di Layar Antrean (TV ruang tunggu). Jika pengunjung belum datang, klik "Panggil Ulang". Pastikan pilihan "Loket" di kanan atas sesuai nomor loket komputer ini.'],
      [PlayCircle, 'Mulai Layani', 'Saat pengunjung tiba di loket, klik "Mulai Layani".'],
      [CheckCircle2, 'Selesai', 'Setelah pelayanan selesai, klik "Selesai". Riwayat tercatat dan Anda bisa mengambil antrean berikutnya.'],
      [UserX, 'Pengunjung Tidak Datang', 'Jika sudah dipanggil beberapa kali tetapi tidak datang, klik "Tidak Hadir" lalu ambil antrean berikutnya.'],
      [BarChart3, 'Rekap Layanan', 'Buka menu "Rekap Layanan" untuk melihat jumlah permohonan per jenis layanan (tag), hari ini atau per bulan. Klik "Unduh PDF" untuk laporan resmi berkop surat (misalnya pilih "Bulan Ini" di akhir bulan).'],
      [MonitorPlay, 'Layar Antrean (TV)', 'Di TV/komputer ruang tunggu, buka alamat sapa-dinsos.vercel.app/layar (tanpa login), lalu klik "Mulai dengan Suara". Layar menampilkan nomor yang dipanggil dan loket tujuan secara otomatis.'],
    ],
  },
}

export default function Panduan() {
  const { user } = useAuth()
  // Pilih isi panduan sesuai role (cadangan: panduan pengunjung)
  const isi = PANDUAN[user?.profile?.role] || PANDUAN.pengunjung

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Banner judul dengan ikon buku */}
      <KepalaHalaman ikon={BookOpen} judul={isi.judul} deskripsi={isi.deskripsi} />

      {/* Daftar langkah bernomor */}
      <ol className="relative space-y-3">
        {/* Garis tegak biru muda yang menghubungkan semua nomor langkah */}
        <span className="absolute left-[34px] top-8 bottom-8 w-0.5 bg-blue-100 hidden sm:block" aria-hidden="true" />

        {isi.langkah.map(([Ikon, judul, teks], i) => (
          <li key={judul} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm px-4 sm:px-5 py-4 flex items-center gap-4 sm:gap-6">
            {/* Bulatan nomor langkah */}
            <span className="relative z-10 flex w-9 h-9 flex-shrink-0 items-center justify-center rounded-full bg-[#0d5bc4] font-bold text-white ring-4 ring-white">
              {i + 1}
            </span>
            {/* Kotak ikon biru muda */}
            <span className="hidden sm:flex w-16 h-16 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#1565c0]">
              <Ikon size={30} strokeWidth={1.8} />
            </span>
            {/* Judul dan penjelasan langkah */}
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[#0f1e33]">{judul}</h3>
              <p className="text-slate-600">{teks}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Ringkasan alur status antrean */}
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-slate-700">
        <Info size={24} className="text-[#1565c0] flex-shrink-0" />
        <p>
          Alur status antrean: <strong>Menunggu</strong> → <strong>Terverifikasi</strong> (scan barcode) →{' '}
          <strong>Dipanggil</strong> → <strong>Dilayani</strong> → <strong>Selesai</strong>.
        </p>
      </div>
    </div>
  )
}
