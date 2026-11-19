// ========================================
// FILE: TiketCetak.jsx
// DESKRIPSI: Tampilan tiket antrean khusus untuk DICETAK / DISIMPAN SEBAGAI PDF (kertas A4).
// Bentuknya seperti dokumen resmi: kop surat Dinas Sosial, judul, nomor antrean + QR Code,
// tabel data pengunjung, ketentuan, dan catatan kaki.
// Tidak terlihat di layar. Saat tombol Cetak ditekan (window.print),
// CSS di index.css menyembunyikan seluruh aplikasi dan hanya menampilkan tiket ini.
// Dipakai oleh: tiket pengunjung (TiketAntrean) dan tiket daftar langsung (petugas).
// ========================================

// createPortal = menaruh tiket langsung di <body>, di luar aplikasi (#root)
import { createPortal } from 'react-dom'
// QR Code dengan logo DINSOS di tengah
import QrDinsos from './QrDinsos'
// Fungsi bantu format tanggal, jam, label status, dan alamat singkat
import { formatTanggal, formatJam, labelStatus, alamatSingkat } from '../lib/antrean'

// Props: antrean = data antrean dari backend
export default function TiketCetak({ antrean }) {
  // Tidak ada data -> tidak ada yang dicetak
  if (!antrean) return null

  // Label jenis pendaftaran
  const jenis = antrean.jenis_pendaftaran === 'langsung' ? 'Langsung (di kantor)' : 'Online'

  // Baris tabel data pengunjung: [label, nilai]
  const rincian = [
    ['Nama Lengkap', antrean.nama_pengunjung || antrean.nama_tampil || '-'],
    ['Nomor HP', antrean.no_telp_pengunjung || '-'],
    ['Alamat', alamatSingkat(antrean) || '-'],
    ['Jenis Layanan', antrean.layanan?.nama_layanan || '-'],
    ['Keperluan', antrean.keperluan || '-'],
    ['Jenis Pendaftaran', jenis],
    ['Waktu Pendaftaran', `${formatTanggal(antrean.tanggal || antrean.created_at)}, pukul ${formatJam(antrean.created_at)} WIB`],
    ['Status', labelStatus(antrean.status)],
  ]

  // Waktu dokumen dicetak (untuk catatan kaki)
  const dicetak = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })

  // Render ke <body> agar tidak ikut tersembunyi bersama #root saat print
  return createPortal(
    <div className="area-cetak">
      {/* ===== 1. KOP SURAT ===== */}
      <div className="cetak-kop">
        {/* Logo DINSOS di kiri */}
        <img src="/images/logo-dinsos.png" alt="Logo DINSOS" className="cetak-kop-logo" />
        {/* Nama instansi + alamat di tengah */}
        <div className="cetak-kop-teks">
          <div className="cetak-kop-pemda">PEMERINTAH KABUPATEN MAJALENGKA</div>
          <div className="cetak-kop-dinas">DINAS SOSIAL</div>
          <div className="cetak-kop-alamat">
            Jl. Raya K.H. Abdul Halim No. 498, Tonjong, Kec. Majalengka, Kabupaten Majalengka, Jawa Barat 45411
          </div>
        </div>
      </div>
      {/* Garis ganda di bawah kop */}
      <div className="cetak-kop-garis" />

      {/* ===== 2. JUDUL DOKUMEN ===== */}
      <div className="cetak-judul">BUKTI PENDAFTARAN ANTREAN</div>
      <div className="cetak-subjudul">SAPA DINSOS · Sistem Antrean Pelayanan Dinas Sosial Kabupaten Majalengka</div>

      {/* ===== 3. NOMOR ANTREAN (kiri) + QR CODE (kanan) ===== */}
      <div className="cetak-utama">
        {/* Kotak nomor antrean */}
        <div className="cetak-nomor-kotak">
          <div className="cetak-label">NOMOR ANTREAN</div>
          <div className="cetak-nomor">{antrean.nomor_antrean}</div>
          <div className="cetak-layanan">{antrean.layanan?.nama_layanan}</div>
          <div className="cetak-tanggal">{formatTanggal(antrean.tanggal || antrean.created_at)}</div>
        </div>
        {/* QR Code + kode */}
        <div className="cetak-qr-kotak">
          <QrDinsos nilai={antrean.kode_barcode} ukuran={210} />
          <div className="cetak-kode">{antrean.kode_barcode}</div>
          <div className="cetak-qr-ket">Scan di meja pendaftaran</div>
        </div>
      </div>

      {/* ===== 4. TABEL DATA PENGUNJUNG ===== */}
      <div className="cetak-bagian">DATA PENGUNJUNG</div>
      <table className="cetak-tabel">
        <tbody>
          {rincian.map(([label, nilai]) => (
            <tr key={label}>
              <td className="cetak-tabel-label">{label}</td>
              <td className="cetak-tabel-titik">:</td>
              {/* Keperluan dibatasi maksimal 3 baris agar tiket tetap 1 halaman */}
              <td className={label === 'Keperluan' ? 'cetak-batas-3' : undefined}>{nilai}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== 5. KETENTUAN ===== */}
      <div className="cetak-bagian">KETENTUAN</div>
      <ol className="cetak-ketentuan">
        <li>Tunjukkan bukti ini (cetak atau di layar HP) kepada petugas di meja pendaftaran untuk di-scan.</li>
        <li>Antrean hanya berlaku pada tanggal tersebut. Antrean yang tidak diverifikasi pada hari itu otomatis dibatalkan.</li>
        <li>Setelah diverifikasi, tunggu nomor Anda dipanggil oleh petugas pelayanan.</li>
        <li>Bawa dokumen persyaratan sesuai jenis layanan (lihat menu Informasi Pelayanan).</li>
        <li>Jika nomor sudah dipanggil tetapi Anda tidak hadir, antrean dapat ditandai tidak hadir.</li>
      </ol>

      {/* ===== 6. CATATAN KAKI ===== */}
      <div className="cetak-kaki">
        Dokumen ini dicetak otomatis oleh sistem pada {dicetak} dan sah tanpa tanda tangan.
      </div>
    </div>,
    document.body
  )
}
