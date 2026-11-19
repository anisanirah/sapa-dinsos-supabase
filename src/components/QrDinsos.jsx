// ========================================
// FILE: QrDinsos.jsx
// DESKRIPSI: QR Code antrean dengan LOGO DINSOS di tengahnya.
// Dipakai di: tiket pengunjung, halaman Antrean Saya, tiket petugas, dan tiket cetak.
// ========================================

// Komponen QR Code dari library qrcode.react
import { QRCodeSVG } from 'qrcode.react'

// Props:
// - nilai  : isi QR (kode_barcode dari backend, contoh: DNS-AB12...)
// - ukuran : lebar/tinggi QR dalam pixel (bawaan 180)
export default function QrDinsos({ nilai, ukuran = 180 }) {
  // Jika belum ada kode, jangan tampilkan apa pun
  if (!nilai) return null

  // Logo berupa LENCANA persegi (kotak putih bersudut bulat + bingkai biru + lambang Majalengka),
  // file: public/images/logo-dinsos-qr.png. Ukurannya 30% dari lebar QR (termasuk ruang putih di sekelilingnya)
  // -> hanya menutup sekitar 9% luas QR. Karena level koreksi "H" (bisa memulihkan
  // sampai 30% bagian yang tertutup), QR tetap terbaca walaupun bagian tengahnya ditutup logo.
  const ukuranLogo = Math.round(ukuran * 0.30)

  return (
    <QRCodeSVG
      value={nilai}               // isi QR
      size={ukuran}               // ukuran QR
      level="H"                   // tingkat koreksi error tertinggi (wajib jika ada logo)
      marginSize={2}              // bingkai putih kecil di sekeliling QR
      fgColor="#000000"           // hitam: paling mudah dibaca kamera & alat scanner
      bgColor="#ffffff"           // latar putih
      imageSettings={{
        src: '/images/logo-dinsos-qr.png', // lencana logo di folder public/images
        width: ukuranLogo,
        height: ukuranLogo,
        excavate: true,           // kosongkan kotak QR di bawah logo agar logo bersih
      }}
    />
  )
}
