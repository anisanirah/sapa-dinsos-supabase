// FILE: src/components/LayarPembuka.jsx
// DESKRIPSI: Layar pembuka (splash screen) "SAPA DINSOS".
// Tampil sekitar 2 detik setiap kali aplikasi dibuka di tab baru
// (misalnya saat pengunjung mengeklik link dari email), lalu menghilang perlahan.
// Dalam satu tab yang sama, layar ini hanya muncul sekali agar tidak mengganggu.

// Mengimpor hook React
import { useEffect, useState } from 'react'
// Mengimpor identitas aplikasi
import { NAMA_APLIKASI, KEPANJANGAN, SLOGAN, INSTANSI } from '../lib/merek'
// Mengimpor gaya (animasi) layar pembuka
import './LayarPembuka.css'

// Kunci penyimpanan untuk menandai bahwa layar pembuka sudah tampil di tab ini
const KUNCI = 'sapa_pembuka_tampil'

// Lama layar pembuka tampil (milidetik) sebelum mulai menghilang
const LAMA_TAMPIL = 2200
// Lama animasi menghilang (milidetik)
const LAMA_HILANG = 500

// Mengecek apakah layar pembuka sudah pernah tampil di tab ini
function sudahTampil() {
  // try-catch: beberapa browser (mode privat) bisa menolak sessionStorage
  try {
    return sessionStorage.getItem(KUNCI) === '1'
  } catch {
    return false
  }
}

// Menandai bahwa layar pembuka sudah tampil
function tandaiTampil() {
  try {
    sessionStorage.setItem(KUNCI, '1')
  } catch {
    // Abaikan jika penyimpanan tidak tersedia
  }
}

export default function LayarPembuka() {
  // tahap: 'tampil' -> 'hilang' (animasi memudar) -> 'selesai' (dihapus dari layar)
  const [tahap, setTahap] = useState(() => (sudahTampil() ? 'selesai' : 'tampil'))

  // Mengatur waktu: setelah LAMA_TAMPIL mulai memudar, lalu dihapus
  useEffect(() => {
    // Jika sudah pernah tampil, tidak perlu melakukan apa-apa
    if (tahap !== 'tampil') return
    // Tandai sudah tampil agar tidak muncul lagi saat pindah halaman di tab ini
    tandaiTampil()
    const t1 = setTimeout(() => setTahap('hilang'), LAMA_TAMPIL)
    const t2 = setTimeout(() => setTahap('selesai'), LAMA_TAMPIL + LAMA_HILANG)
    // Bersihkan timer jika komponen dilepas
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [tahap])

  // Pengguna bisa mengetuk layar untuk langsung masuk tanpa menunggu
  const lewati = () => {
    if (tahap !== 'tampil') return
    setTahap('hilang')
    setTimeout(() => setTahap('selesai'), LAMA_HILANG)
  }

  // Setelah selesai, layar pembuka tidak ditampilkan lagi
  if (tahap === 'selesai') return null

  // Memecah nama aplikasi per kata agar bisa diwarnai berbeda (SAPA putih, DINSOS kuning muda)
  const [kata1, ...sisa] = NAMA_APLIKASI.split(' ')

  return (
    <div
      className={`pembuka ${tahap === 'hilang' ? 'pembuka-hilang' : ''}`}
      onClick={lewati}
      role="status"
      aria-label={`${NAMA_APLIKASI} sedang dibuka`}
    >
      {/* Lingkaran hiasan di latar belakang */}
      <span className="pembuka-hiasan pembuka-hiasan-1" aria-hidden="true" />
      <span className="pembuka-hiasan pembuka-hiasan-2" aria-hidden="true" />

      <div className="pembuka-isi">
        {/* Logo DINSOS di dalam lingkaran putih, dengan gelombang "sapaan" di sekelilingnya */}
        <div className="pembuka-logo-wadah">
          <span className="pembuka-gelombang" aria-hidden="true" />
          <span className="pembuka-gelombang pembuka-gelombang-2" aria-hidden="true" />
          <div className="pembuka-logo">
            <img src="/images/logo-dinsos.png" alt="Logo DINSOS" />
          </div>
        </div>

        {/* Nama aplikasi */}
        <h1 className="pembuka-nama">
          <span>{kata1}</span> <span className="pembuka-nama-aksen">{sisa.join(' ')}</span>
        </h1>

        {/* Kepanjangan dan instansi */}
        <p className="pembuka-kepanjangan">{KEPANJANGAN}</p>
        <p className="pembuka-instansi">{INSTANSI}</p>

        {/* Slogan */}
        <p className="pembuka-slogan">“{SLOGAN}”</p>

        {/* Garis pemuatan */}
        <div className="pembuka-muat" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  )
}
