
 // ========================================
 // FILE: InformasiPelayanan.jsx
 // ========================================

 // Mengimpor hook useState dari React untuk mengelola state atau data yang dapat berubah.
import { useState, useEffect } from 'react'
import api from '../lib/api'
// Navigasi ke Dashboard saat tombol "Ambil Nomor Antrean" diklik
import { useNavigate } from 'react-router-dom'
// Data login: kartu ajakan ambil antrean hanya untuk pengunjung
import { useAuth } from '../context/AuthContext'
// Banner judul bersama
import KepalaHalaman from '../components/KepalaHalaman'
// Nama instansi, alamat, hari & jam pelayanan (satu sumber)
import { INSTANSI, ALAMAT_KANTOR, HARI_LAYANAN, JAM_LAYANAN } from '../lib/merek'

// Mengimpor kumpulan ikon dari library lucide-react.
// Setiap ikon digunakan sebagai elemen visual untuk memperjelas informasi pada halaman.
import {
  FileText,      // Ikon dokumen persyaratan
  ChevronDown,   // Ikon panah pada pilihan layanan
  CheckCircle2,  // Ikon centang di setiap persyaratan
  Info,          // Ikon petunjuk pelayanan
  Calendar,      // Ikon hari pelayanan
  Clock,         // Ikon jam operasional
  MapPin,        // Ikon lokasi kantor
  Ticket,        // Ikon tiket antrean
  ArrowRight     // Ikon panah pada tombol
} from 'lucide-react'

// Mengimpor file CSS yang berisi pengaturan tampilan dan desain halaman Informasi Pelayanan.
import './InformasiPelayanan.css'

// 4. Definisi komponen utama Halaman Informasi Pelayanan
// Komponen ini bertanggung jawab untuk menampilkan seluruh informasi layanan Dinas Sosial.
function InformasiPelayanan() {

  // 5. State untuk menyimpan layanan yang sedang dipilih user di dropdown
  // Nilai default-nya adalah 'Bantuan Sosial Tunai'
  // useState digunakan agar tampilan persyaratan dapat berubah sesuai pilihan pengguna.
  const [selectedLayanan, setSelectedLayanan] = useState('Bantuan Sosial Tunai')

  // Navigasi & peran pengguna (petugas tidak melihat ajakan ambil antrean)
  const navigate = useNavigate()
  const { user } = useAuth()
  const bolehAmbilAntrean = (user?.profile?.role || 'pengunjung') === 'pengunjung'

  // 7. Data statis untuk persyaratan berdasarkan jenis layanan yang dipilih
  // Object ini menggunakan nama layanan sebagai key dan daftar persyaratan sebagai value.
  // Setiap layanan memiliki persyaratan dokumen yang berbeda.
  const persyaratanData = {
    'Bantuan Sosial Tunai': [
      'Fotokopi Kartu Tanda Penduduk (KTP)',
      'Fotokopi Kartu Keluarga (KK)',
      'Surat Keterangan Tidak Mampu (SKTM) dari Desa/Kelurahan',
      'Data pendukung lainnya sesuai ketentuan program'
    ],
    'Rehabilitasi Sosial': [
      'Fotokopi KTP',
      'Surat rujukan dari Puskesmas/Rumah Sakit',
      'Pas foto 3x4 sebanyak 2 lembar',
      'Surat keterangan dokter'
    ],
    'Perlindungan Sosial': [
      'Fotokopi KTP dan KK',
      'Surat keterangan dari desa/kelurahan',
      'Dokumen pendukung lainnya'
    ],
    'Pemberdayaan Sosial': [
      'Fotokopi KTP',
      'Proposal kegiatan',
      'Surat keterangan domisili',
      'Data peserta kegiatan'
    ],
    'Aktivasi BPJS/KIS': [
      'Fotokopi Kartu Tanda Penduduk (KTP)',
      'Fotokopi Kartu Keluarga (KK)',
      'Fotokopi kartu BPJS Kesehatan/KIS (jika sudah memiliki)',
      'Surat Keterangan Tidak Mampu (SKTM) dari Desa/Kelurahan'
    ]
  }

  // 7b. Persyaratan TERBARU dari database (GET /layanans). Jika gagal dimuat, pakai data statis di atas.
  const [persyaratanServer, setPersyaratanServer] = useState({})
  useEffect(() => {
    api.get('/layanans')
      .then((res) => {
        const hasil = {}
        ;(res.data || []).forEach((l) => {
          // Kolom persyaratan disimpan per baris (dipisah "Enter")
          const daftar = (l.persyaratan || '').split('\n').map((x) => x.trim()).filter(Boolean)
          if (daftar.length) hasil[l.nama_layanan] = daftar
        })
        setPersyaratanServer(hasil)
      })
      .catch(() => {})
  }, [])
  const dataPersyaratan = Object.keys(persyaratanServer).length ? persyaratanServer : persyaratanData

  // 8. Data statis untuk alur/petunjuk pelayanan kepada masyarakat
  // Array ini berisi urutan langkah yang harus dilakukan masyarakat ketika mengakses pelayanan.
  // Setiap objek memiliki nomor urut, judul langkah, dan deskripsi.
  const petunjukPelayanan = [
    { nomor: 1, title: 'Pilih Layanan', deskripsi: 'Tentukan jenis layanan yang Anda butuhkan.' },
    { nomor: 2, title: 'Siapkan Persyaratan', deskripsi: 'Lengkapi dokumen sesuai ketentuan layanan.' },
    { nomor: 3, title: 'Ambil Nomor Antrean', deskripsi: 'Lakukan pengambilan nomor antrean secara online.' },
    { nomor: 4, title: 'Scan Barcode & Tunggu', deskripsi: 'Datang ke kantor pada hari yang sama, tunjukkan QR Code ke meja pendaftaran, lalu tunggu nomor Anda dipanggil.' },
    { nomor: 5, title: 'Proses Pelayanan', deskripsi: 'Petugas akan memverifikasi dokumen dan memberikan layanan.' }
  ]

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">

      {/* --- BAGIAN 1: BANNER JUDUL --- */}
      {/* Banner bersama: judul halaman, nama instansi, dan penjelasan singkat */}
      <KepalaHalaman
        judul="Informasi Pelayanan"
        subjudul={INSTANSI}
        deskripsi="Temukan informasi lengkap mengenai persyaratan, prosedur, dan ketentuan pelayanan di Dinas Sosial."
      />

      {/* --- BAGIAN 2: PERSYARATAN & PETUNJUK (2 KOLOM) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Kolom Kiri: Persyaratan Pelayanan */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
            <FileText size={28} strokeWidth={2} className="text-[#1565c0]" />
            <h3 className="text-xl font-bold text-[#0f1e33]">Persyaratan Pelayanan</h3>
          </div>

          {/* Pilihan layanan: saat diganti, daftar persyaratan ikut berubah */}
          <label className="block font-semibold text-slate-800 mb-2">Pilih Layanan</label>
          <div className="relative mb-5">
            <select
              value={selectedLayanan}
              onChange={(e) => setSelectedLayanan(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-5 py-3.5 pr-12 font-medium text-slate-800 shadow-sm focus:outline-none focus:border-[#1976d2] focus:ring-4 focus:ring-blue-100"
            >
              {/* Object.keys() mengambil seluruh nama layanan sebagai pilihan dropdown */}
              {Object.keys(dataPersyaratan).map((layanan) => (
                <option key={layanan} value={layanan}>{layanan}</option>
              ))}
            </select>
            <ChevronDown size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#1565c0]" />
          </div>

          {/* Judul persyaratan dalam kotak biru muda */}
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 mb-2">
            <FileText size={24} className="text-[#1565c0] flex-shrink-0" />
            <h4 className="font-bold text-[#0f1e33]">Persyaratan {selectedLayanan}</h4>
          </div>

          {/* Daftar dokumen yang harus disiapkan */}
          <ul className="divide-y divide-slate-100">
            {(dataPersyaratan[selectedLayanan] || []).map((item, index) => (
              <li key={index} className="flex items-start gap-3 py-3 text-slate-800">
                <CheckCircle2 size={20} strokeWidth={2} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Kolom Kanan: Petunjuk Pelayanan (langkah bernomor dengan garis penghubung) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
            <Info size={28} strokeWidth={2} className="text-[#1565c0]" />
            <h3 className="text-xl font-bold text-[#0f1e33]">Petunjuk Pelayanan</h3>
          </div>
          <ol className="relative">
            {petunjukPelayanan.map((item, i) => (
              <li key={item.nomor} className="relative flex gap-4 pb-5 last:pb-0">
                {/* Garis tegak penghubung antar nomor (tidak ada di langkah terakhir) */}
                {i < petunjukPelayanan.length - 1 && (
                  <span className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-blue-100" aria-hidden="true" />
                )}
                {/* Bulatan nomor langkah */}
                <span className="relative z-10 flex w-9 h-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1976d2] font-bold text-white ring-4 ring-blue-100">
                  {item.nomor}
                </span>
                <div>
                  <h4 className="font-bold text-[#0f1e33]">{item.title}</h4>
                  <p className="text-sm text-slate-600">{item.deskripsi}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* --- BAGIAN 3: INFORMASI OPERASIONAL & AJAKAN AMBIL ANTREAN --- */}
      <div className={`grid grid-cols-1 ${bolehAmbilAntrean ? 'lg:grid-cols-2' : ''} gap-6`}>

        {/* Kartu Informasi Operasional (Hari, Jam, Lokasi) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-3 mb-5">
            <Clock size={28} strokeWidth={2} className="text-[#1565c0]" />
            <h3 className="text-xl font-bold text-[#0f1e33]">Informasi Operasional</h3>
          </div>
          <div className="space-y-3">
            {[
              [Calendar, 'Hari Pelayanan', HARI_LAYANAN],
              [Clock, 'Jam Operasional', JAM_LAYANAN],
              [MapPin, 'Lokasi', ALAMAT_KANTOR],
            ].map(([Ikon, label, nilai]) => (
              <div key={label} className="flex items-center gap-4 rounded-xl bg-slate-50 px-5 py-4">
                <Ikon size={24} strokeWidth={2} className="text-[#1565c0] flex-shrink-0" />
                <div>
                  <span className="block text-sm text-slate-600">{label}</span>
                  <span className="block font-bold text-[#0f1e33]">{nilai}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kartu ajakan (hanya untuk pengunjung, karena petugas tidak mengambil antrean) */}
        {bolehAmbilAntrean && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d5bc4] to-[#3b8de8] p-7 sm:p-8 text-white flex items-center">
            {/* Hiasan gelombang tipis di bagian bawah */}
            <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 70 C 150 20, 300 110, 600 40 L 600 100 L 0 100 Z" fill="#ffffff" opacity="0.12" />
            </svg>
            <div className="relative flex flex-col sm:flex-row items-center gap-6 w-full">
              {/* Kotak ikon tiket */}
              <div className="flex w-24 h-24 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <Ticket size={52} strokeWidth={1.6} />
              </div>
              <span className="hidden sm:block w-px self-stretch bg-white/40" aria-hidden="true" />
              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-extrabold leading-tight">Siap Mendapatkan Pelayanan?</h3>
                <p className="mt-2 text-blue-50">
                  Ambil nomor antrean sekarang dan dapatkan layanan dengan lebih cepat dan teratur.
                </p>
                {/* Tombol menuju Dashboard (tempat memilih layanan & ambil antrean) */}
                <button
                  onClick={() => navigate('/')}
                  className="mt-5 inline-flex items-center gap-3 rounded-xl bg-white px-7 py-3 font-bold text-[#0d5bc4] hover:bg-blue-50 transition"
                >
                  <Ticket size={22} />
                  Ambil Nomor Antrean
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


export default InformasiPelayanan
