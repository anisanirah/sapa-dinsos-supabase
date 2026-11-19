
 // ========================================
 // FILE: InformasiPelayanan.jsx
 // ========================================

 // Mengimpor hook useState dari React untuk mengelola state atau data yang dapat berubah.
import { useState, useEffect } from 'react'
import api from '../lib/api'

// Mengimpor kumpulan ikon dari library lucide-react.
// Setiap ikon digunakan sebagai elemen visual untuk memperjelas informasi pada halaman.
import {
  ClipboardCheck,
  Heart,
  Users,
  Shield,
  Layers,
  FileText,
  ChevronDown,
  CheckCircle2,  // ← PASTIKAN INI ADA!
  Info,
  Calendar,
  Clock,
  MapPin,
  Ticket
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

  // 6. Data statis untuk daftar jenis layanan (bisa nanti diambil dari API/Database)
  // Array ini menyimpan informasi ikon, nama layanan, dan warna untuk setiap kartu layanan.
  const jenisLayanan = [
    { icon: Heart, title: 'Bantuan Sosial Tunai', color: 'blue' },
    { icon: Users, title: 'Rehabilitasi Sosial', color: 'blue' },
    { icon: Shield, title: 'Perlindungan Sosial', color: 'blue' },
    { icon: Layers, title: 'Pemberdayaan Sosial', color: 'purple' },
    { icon: FileText, title: 'Aktivasi BPJS/KIS', color: 'blue' }
  ]

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

  // 9. Return JSX: Struktur tampilan halaman yang akan dirender ke browser
  // JSX digunakan untuk menggabungkan struktur HTML dengan ekspresi JavaScript dan komponen React.
  return (
    <div className="informasi-page">
      
      {/* --- BAGIAN 1: HEADER HALAMAN --- */}
      {/* Bagian header menampilkan judul halaman, nama instansi, dan deskripsi singkat pelayanan. */}
      <div className="informasi-header">
        <div className="header-content">
          <h1>Informasi Pelayanan</h1>
          <h2>Dinas Sosial Kabupaten Majalengka</h2>
          <p>Temukan informasi lengkap mengenai jenis layanan, persyaratan, prosedur, dan jadwal pelayanan di Dinas Sosial.</p>
        </div>
        <div className="header-illustration">
          <div className="illustration-icon">
            {/* Menampilkan ikon ClipboardCheck dengan ukuran 80px */}
            {/* strokeWidth mengatur ketebalan garis pada ikon. */}
            <ClipboardCheck size={80} strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* --- BAGIAN 2: JENIS LAYANAN (GRID KARTU) --- */}
      {/* Bagian ini menampilkan pilihan jenis layanan dalam bentuk kumpulan kartu. */}
      <div className="section">
        <div className="section-header">
          {/* Ikon Layers digunakan sebagai penanda bagian jenis layanan. */}
          <Layers size={24} strokeWidth={2} className="section-icon" />
          <div>
            <h3>Jenis Layanan</h3>
            <p>Pilih layanan untuk melihat informasi detail, persyaratan, dan prosedur pelayanan.</p>
          </div>
        </div>
        <div className="layanan-grid">
          {/* Melakukan looping (map) pada array jenisLayanan untuk membuat kartu */}
          {/* map() digunakan untuk membaca setiap data layanan dan menghasilkan elemen JSX. */}
          {jenisLayanan.map((layanan, index) => (
            // key digunakan React untuk mengidentifikasi setiap elemen dalam proses rendering daftar.
            // Class CSS dibuat dinamis berdasarkan warna yang terdapat pada data layanan.
            <div key={index} className={`layanan-card ${layanan.color}`}>
              {/* Render ikon dinamis berdasarkan data */}
              {/* Ikon ditampilkan sesuai komponen yang tersimpan pada properti icon. */}
              <layanan.icon size={40} strokeWidth={1.5} />
              {/* Menampilkan nama layanan berdasarkan properti title. */}
              <h4>{layanan.title}</h4>
            </div>
          ))}
        </div>
      </div>

      {/* --- BAGIAN 3: PERSYARATAN & PETUNJUK (2 KOLOM) --- */}
      {/* Bagian ini dibagi menjadi dua kolom, yaitu persyaratan dan petunjuk pelayanan. */}
      <div className="info-grid">
        
        {/* Kolom Kiri: Persyaratan Pelayanan */}
        {/* Menampilkan daftar dokumen yang harus disiapkan oleh masyarakat. */}
        <div className="info-card">
          <div className="card-header">
            <FileText size={24} strokeWidth={2} className="card-icon" />
            <h3>Persyaratan Pelayanan</h3>
          </div>
          <div className="dropdown-container">
            {/* Dropdown untuk memilih jenis layanan, saat berubah akan mengupdate state selectedLayanan */}
            {/* value menghubungkan pilihan dropdown dengan state yang sedang aktif. */}
            {/* onChange menangkap perubahan pilihan pengguna dan memperbarui state menggunakan setSelectedLayanan. */}
            <select 
              value={selectedLayanan}
              onChange={(e) => setSelectedLayanan(e.target.value)}
              className="layanan-dropdown"
            >
              {/* Object.keys() mengambil seluruh nama layanan sebagai pilihan dropdown. */}
              {/* map() mengubah setiap nama layanan menjadi elemen option. */}
              {Object.keys(dataPersyaratan).map((layanan) => (
                <option key={layanan} value={layanan}>{layanan}</option>
              ))}
            </select>
          </div>
          <div className="persyaratan-content">
            {/* Judul persyaratan berubah secara otomatis mengikuti layanan yang dipilih. */}
            <h4>Persyaratan {selectedLayanan}</h4>
            <ul className="persyaratan-list">
              {/* Menampilkan daftar persyaratan sesuai layanan yang dipilih di dropdown */}
              {/* Data diakses melalui key selectedLayanan pada object persyaratanData. */}
              {(dataPersyaratan[selectedLayanan] || []).map((item, index) => (
                <li key={index}>
                  {/* Ikon CheckCircle2 digunakan sebagai penanda setiap persyaratan dokumen. */}
                  <CheckCircle2 size={18} strokeWidth={2} className="check-icon" />
                  {/* Menampilkan nama persyaratan berdasarkan data item. */}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Kolom Kanan: Petunjuk Pelayanan */}
        {/* Menampilkan tahapan pelayanan agar masyarakat memahami prosedur yang harus dilakukan. */}
        <div className="info-card">
          <div className="card-header">
            <Info size={24} strokeWidth={2} className="card-icon" />
            <h3>Petunjuk Pelayanan</h3>
          </div>
          <div className="petunjuk-list">
            {/* Melakukan looping untuk menampilkan langkah-langkah pelayanan */}
            {/* Setiap langkah ditampilkan berdasarkan data yang tersimpan dalam array petunjukPelayanan. */}
            {petunjukPelayanan.map((item) => (
              // item.nomor digunakan sebagai key untuk membedakan setiap langkah pelayanan.
              <div key={item.nomor} className="petunjuk-item">
                {/* Menampilkan nomor urut dari setiap tahapan pelayanan. */}
                <div className="petunjuk-number">{item.nomor}</div>
                <div className="petunjuk-content">
                  {/* Menampilkan judul dan penjelasan dari setiap tahapan pelayanan. */}
                  <h4>{item.title}</h4>
                  <p>{item.deskripsi}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- BAGIAN 4: INFORMASI OPERASIONAL & CALL TO ACTION (CTA) --- */}
      {/* Bagian bawah halaman berisi informasi jadwal operasional dan tombol pengambilan antrean. */}
      <div className="bottom-grid">
        
        {/* Kartu Informasi Operasional (Hari, Jam, Lokasi) */}
        {/* Informasi ini membantu masyarakat mengetahui waktu dan lokasi pelayanan. */}
        <div className="info-card">
          <div className="card-header">
            <Clock size={24} strokeWidth={2} className="card-icon" />
            <h3>Informasi Operasional</h3>
          </div>
          <div className="operasional-list">
            {/* Informasi hari pelayanan kantor. */}
            <div className="operasional-item">
              <Calendar size={20} strokeWidth={2} />
              <div>
                <span className="label">Hari Pelayanan</span>
                <span className="value">Senin – Jumat</span>
              </div>
            </div>
            {/* Informasi jam operasional pelayanan kantor. */}
            <div className="operasional-item">
              <Clock size={20} strokeWidth={2} />
              <div>
                <span className="label">Jam Operasional</span>
                <span className="value">08.00 – 15.00 WIB</span>
              </div>
            </div>
            {/* Informasi alamat lokasi kantor Dinas Sosial Kabupaten Majalengka. */}
            <div className="operasional-item">
              <MapPin size={20} strokeWidth={2} />
              <div>
                <span className="label">Lokasi</span>
                <span className="value">Jl. KH. Abdul Halim No. 123, Kabupaten Majalengka</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kartu Call to Action (Tombol Ambil Antrean) */}
        {/* Bagian CTA bertujuan mengarahkan pengguna untuk melakukan pengambilan nomor antrean. */}
        <div className="cta-card">
          <div className="cta-icon">
            <Ticket size={60} strokeWidth={1.5} />
          </div>
          <h3>Siap Mendapatkan Pelayanan?</h3>
          <p>Ambil nomor antrean sekarang dan dapatkan layanan dengan lebih cepat dan teratur.</p>
          {/* Tombol ini nanti bisa diarahkan ke halaman /antrean menggunakan useNavigate */}
          {/* Ikon Ticket memperjelas fungsi tombol, sedangkan ChevronDown menjadi elemen visual tambahan. */}
          <button className="cta-button">
            <Ticket size={20} strokeWidth={2} />
            Ambil Nomor Antrean
            <ChevronDown size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

// 10. Export komponen agar bisa di-import di file lain (misalnya di App.jsx)
// export default memungkinkan komponen InformasiPelayanan digunakan pada file React lainnya.
export default InformasiPelayanan
