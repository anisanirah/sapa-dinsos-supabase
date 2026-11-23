// ========================================
// FILE: petugas/DashboardPendaftaran.jsx
// DESKRIPSI: Dashboard PETUGAS PENDAFTARAN (meja pendaftaran).
// Sesuai alur:
//  1. Pengunjung online  -> petugas SCAN BARCODE -> status TERVERIFIKASI
//  2. Pengunjung langsung -> petugas input data -> dapat nomor + barcode -> cetak tiket -> verifikasi
//  3. Antrean yang salah input / pengunjung pulang -> dibatalkan
// Data diperbarui otomatis setiap 10 detik.
// ========================================
// useState = simpan data; useCallback = simpan fungsi agar tidak dibuat ulang
import { useState, useCallback } from 'react'
// useNavigate = pindah halaman lewat kode
import { useNavigate } from 'react-router-dom'
import {
  // Ikon-ikon dari lucide-react
  UsersRound, Clock3, CheckCircle2, ShieldCheck, QrCode, ArrowRight,
  UserPlus, Printer, X, XCircle, Loader2, Search,
} from 'lucide-react'
// QR Code dengan logo DINSOS di tengah
import QrDinsos from '../../components/QrDinsos'
// Klien API (penerjemah ke Supabase, lihat lib/api.js)
import api from '../../lib/api'
// Fungsi bantu format jam, pesan error, dan alamat singkat
import { formatJam, pesanError, alamatSingkat } from '../../lib/antrean'
// Kolom buku tamu (nama, HP, desa, kecamatan, keperluan)
import FormDataTamu, { DATA_TAMU_KOSONG } from '../../components/FormDataTamu'
// Data petugas yang login
import { useAuth } from '../../context/AuthContext'
// Notifikasi kecil di pojok layar
import { useToast } from '../../components/ToastProvider'
// Jendela konfirmasi buatan sendiri (dengan kolom alasan)
import { useDialog } from '../../components/DialogProvider'
import {
  // Komponen kecil bersama untuk dashboard petugas
  BannerSapaan, StatCard, BadgeStatus, BadgeJenis, PesanGagal, TiketCetak, usePolling,
} from './komponen'
// Gaya tampilan dashboard petugas
import '../DashboardPetugas.css'

// Data diperbarui otomatis setiap 10 detik
const REFRESH_INTERVAL = 10000
// Isi awal form daftar langsung
const FORM_KOSONG = { ...DATA_TAMU_KOSONG, layanan_id: '' }

// Komponen Dashboard Petugas Pendaftaran
export default function DashboardPendaftaran() {
  const navigate = useNavigate()
  const toast = useToast()
  // Fungsi untuk menampilkan jendela konfirmasi
  const tanya = useDialog()
  const { user } = useAuth()

  // --- Data dari backend ---
  const [stats, setStats] = useState(null)
  const [antreans, setAntreans] = useState([])
  const [layanans, setLayanans] = useState([])
  const [loadingAwal, setLoadingAwal] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)

  // --- Form daftar langsung ---
  const [form, setForm] = useState(FORM_KOSONG)
  const [menyimpan, setMenyimpan] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [errorKolom, setErrorKolom] = useState({})

  // Tiket yang baru dibuat / dipilih untuk dicetak (modal)
  const [tiket, setTiket] = useState(null)
  const [memverifikasi, setMemverifikasi] = useState(false)

  // Filter tabel
  const [filter, setFilter] = useState('menunggu')
  const [cari, setCari] = useState('')

  // Ambil statistik + daftar antrean hari ini
  // Ambil statistik (GET /dashboard/stats) dan antrean hari ini (GET /antreans/today) sekaligus
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, antreanRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/antreans/today'),
      ])
      setStats(statsRes.data.stats)
      setAntreans(antreanRes.data || [])
      setErrorMessage(null)
    } catch (err) {
      setErrorMessage(pesanError(err, 'Gagal memperbarui data.') + ' Data terakhir tetap ditampilkan.')
    } finally {
      setLoadingAwal(false)
    }
  }, [])

  // Jalankan fetchData sekarang dan setiap 10 detik
  usePolling(fetchData, REFRESH_INTERVAL)

  // Daftar layanan cukup diambil sekali
  usePolling(async () => {
    if (layanans.length) return
    try {
      const res = await api.get('/layanans')
      setLayanans(res.data || [])
    } catch { /* dicoba lagi pada putaran berikutnya */ }
  }, 60000)

  // Simpan pendaftaran langsung
  // Simpan pendaftaran LANGSUNG (POST /api/antreans/langsung)
  const handleDaftarLangsung = async (e) => {
    e.preventDefault()
    setErrorForm('')
    setErrorKolom({})
    setMenyimpan(true)
    try {
      const res = await api.post('/antreans/langsung', form)
      // Tampilkan modal tiket berisi nomor + barcode
      setTiket(res.data.antrean)
      setForm(FORM_KOSONG)
      toast.success(`Nomor ${res.data.antrean.nomor_antrean} berhasil dibuat.`)
      fetchData()
    } catch (err) {
      setErrorForm(pesanError(err, 'Gagal menyimpan pendaftaran.'))
      const errBackend = err.response?.data?.errors || {}
      setErrorKolom(Object.fromEntries(Object.entries(errBackend).map(([k, v]) => [k, v[0]])))
    } finally {
      setMenyimpan(false)
    }
  }

  // Cetak tiket (yang tampil saat print hanya <TiketCetak/>)
  const cetak = () => window.print()

  // Pengunjung langsung sudah ada di tempat -> verifikasi dengan barcode tiketnya
  // Pengunjung langsung sudah di tempat: verifikasi pakai barcode tiketnya (POST /api/antreans/verify-qr)
  const verifikasiSekarang = async () => {
    if (!tiket?.kode_barcode) return
    setMemverifikasi(true)
    try {
      const res = await api.post('/antreans/verify-qr', { qr_data: tiket.kode_barcode })
      toast.success(`${res.data.antrean.nomor_antrean} terverifikasi dan masuk ke daftar petugas pelayanan.`)
      setTiket(null)
      fetchData()
    } catch (err) {
      toast.error(pesanError(err, 'Gagal memverifikasi.'))
    } finally {
      setMemverifikasi(false)
    }
  }

  // Batalkan antrean dengan alasan (PUT /api/antreans/{id}/batal)
  const batalkan = async (antrean) => {
    // Tampilkan jendela konfirmasi + kolom alasan, lalu tunggu jawaban petugas
    const hasil = await tanya({
      varian: 'bahaya',
      ikon: 'batal',
      judul: 'Batalkan antrean?',
      pesan: 'Antrean yang dibatalkan tidak bisa dipulihkan.',
      antrean: { nomor: antrean.nomor_antrean, nama: antrean.nama_tampil, keterangan: antrean.layanan?.nama_layanan },
      input: {
        label: 'Alasan pembatalan',
        placeholder: 'Tulis alasan (boleh dikosongkan)',
        pilihanCepat: ['Salah input data', 'Pengunjung pulang', 'Pendaftaran ganda', 'Persyaratan belum lengkap'],
      },
      teksYa: 'Ya, Batalkan',
    })
    if (!hasil) return // petugas menekan "Batal"
    const alasan = hasil.alasan
    try {
      const res = await api.put(`/antreans/${antrean.id}/batal`, { alasan })
      toast.success(res.data.message)
      fetchData()
    } catch (err) {
      toast.error(pesanError(err, 'Gagal membatalkan antrean.'))
    }
  }

  // Data tabel sesuai filter & pencarian
  // Saring tabel berdasarkan tab status dan kata pencarian
  const kataCari = cari.trim().toLowerCase()
  const dataTabel = antreans
    .filter((a) => filter === 'semua' || a.status === filter)
    .filter((a) => !kataCari ||
      a.nomor_antrean.toLowerCase().includes(kataCari) ||
      (a.nama_tampil || '').toLowerCase().includes(kataCari) ||
      alamatSingkat(a).toLowerCase().includes(kataCari))

  // Hitung jumlah antrean untuk status tertentu (angka di tombol tab)
  const jumlah = (status) => antreans.filter((a) => a.status === status).length

  // Tampilan saat data pertama kali dimuat
  if (loadingAwal) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner"></div>
        <span className="ml-3 text-gray-600">Memuat data...</span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Pendaftaran</h1>
        <p className="text-gray-500 text-sm mt-1">Meja pendaftaran: scan barcode pengunjung online dan daftarkan pengunjung yang datang langsung.</p>
      </div>

      {/* Pesan kuning jika gagal memperbarui data */}
      <PesanGagal pesan={errorMessage} onCobaLagi={fetchData} />

      <BannerSapaan nama={user?.profile?.nama || 'Petugas'} subjudul="Verifikasi kehadiran pengunjung sebelum masuk antrean pelayanan." />

      {/* --- STATISTIK --- */}
      {/* Empat kartu statistik hari ini */}
      <div className="stats-grid">
        <StatCard icon={<UsersRound size={24} />} color="blue" label="Total Antrean Hari Ini" value={stats?.total ?? 0}
          sub={`Online ${stats?.online ?? 0} • Langsung ${stats?.langsung ?? 0}`} />
        <StatCard icon={<Clock3 size={24} />} color="orange" label="Menunggu Verifikasi" value={stats?.menunggu ?? 0}
          sub="Belum scan barcode" />
        <StatCard icon={<ShieldCheck size={24} />} color="green" label="Terverifikasi" value={stats?.terverifikasi ?? 0}
          sub="Menunggu diambil petugas pelayanan" />
        <StatCard icon={<CheckCircle2 size={24} />} color="red" label="Selesai Dilayani" value={stats?.selesai ?? 0}
          sub={`Dibatalkan ${stats?.dibatalkan ?? 0}`} />
      </div>

      {/* --- AKSI: SCAN + DAFTAR LANGSUNG --- */}
      {/* Baris aksi: tombol scan (kiri) + form daftar langsung (kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Scan barcode */}
        <button
          onClick={() => navigate('/scan-qr')}
          className="lg:col-span-2 text-left bg-gradient-to-br from-[#1976d2] to-[#0d47a1] text-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-between min-h-[220px]"
        >
          <div>
            <QrCode size={44} />
            <h3 className="text-xl font-bold mt-4">Scan Barcode Pengunjung</h3>
            <p className="text-blue-100 text-sm mt-1">
              Untuk pengunjung yang daftar online. Bisa memakai kamera atau alat scanner USB.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 font-semibold mt-4">Buka Scanner <ArrowRight size={18} /></span>
        </button>

        {/* Form daftar langsung */}
        <form onSubmit={handleDaftarLangsung} className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="text-[#1976d2]" />
            <h3 className="text-lg font-bold text-gray-800">Daftar Langsung (Datang ke Kantor)</h3>
          </div>
          {errorForm && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">{errorForm}</div>}
          {/* Kolom buku tamu (nomor HP boleh kosong untuk warga yang tidak punya HP) */}
          <FormDataTamu
            data={form}
            onUbah={(kolom, nilai) => setForm((f) => ({ ...f, [kolom]: nilai }))}
            hpWajib={false}
            errors={errorKolom}
          />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Jenis Layanan *</label>
            {/* Gaya kotak disamakan dengan kolom data tamu (sudut bulat + cahaya biru saat aktif) */}
            <select
              value={form.layanan_id}
              onChange={(e) => setForm({ ...form, layanan_id: e.target.value })}
              className="w-full cursor-pointer rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 outline-none transition hover:border-blue-200 focus:border-[#1976d2] focus:ring-4 focus:ring-blue-100"
              required
            >
              <option value="">-- Pilih Layanan --</option>
              {layanans.map((l) => <option key={l.id} value={l.id}>{l.nama_layanan}</option>)}
            </select>
          </div>
          <button type="submit" disabled={menyimpan} className="w-full py-3 rounded-xl bg-[#1976d2] hover:bg-[#1565c0] text-white font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition hover:-translate-y-0.5 disabled:opacity-50">
            {menyimpan ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : <><UserPlus size={18} /> Buat Nomor Antrean</>}
          </button>
        </form>
      </div>

      {/* --- TABEL ANTREAN HARI INI --- */}
      {/* Tabel antrean hari ini (dengan tab & pencarian) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Antrean Hari Ini</h3>
            <p className="text-sm text-gray-500">Diperbarui otomatis setiap 10 detik.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {[
              ['menunggu', 'Menunggu'],
              ['terverifikasi', 'Terverifikasi'],
              ['semua', 'Semua'],
            ].map(([kunci, label]) => (
              <button
                key={kunci}
                onClick={() => setFilter(kunci)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${filter === kunci ? 'bg-[#1976d2] text-white border-[#1976d2]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                {label} ({kunci === 'semua' ? antreans.length : jumlah(kunci)})
              </button>
            ))}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nomor / nama / desa"
                className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-full text-sm outline-none focus:border-[#1976d2]"
              />
            </div>
          </div>
        </div>

        {dataTabel.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Clock3 size={44} className="mx-auto mb-2 opacity-30" />
            <p>Tidak ada antrean pada daftar ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3">No.</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Layanan</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Daftar</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Satu baris tabel untuk setiap antrean */}
                {dataTabel.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-[#1976d2]">{a.nomor_antrean}</td>
                    <td className="px-4 py-3">
                      <div>{a.nama_tampil}</div>
                      <div className="text-xs text-gray-500">{alamatSingkat(a)}</div>
                    </td>
                    <td className="px-4 py-3">{a.layanan?.nama_layanan || '-'}</td>
                    <td className="px-4 py-3"><BadgeJenis jenis={a.jenis_pendaftaran} /></td>
                    <td className="px-4 py-3">{formatJam(a.created_at)}</td>
                    <td className="px-4 py-3">
                      <BadgeStatus status={a.status} />
                      {a.status === 'dibatalkan' && a.alasan_batal && (
                        <div className="text-xs text-gray-500 mt-1">{a.alasan_batal}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {/* Tiket pendaftar langsung bisa dicetak ulang / diverifikasi dari sini */}
                        {a.jenis_pendaftaran === 'langsung' && a.kode_barcode && a.status === 'menunggu' && (
                          <button onClick={() => setTiket(a)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#1976d2] hover:bg-blue-100 font-medium inline-flex items-center gap-1">
                            <Printer size={14} /> Tiket
                          </button>
                        )}
                        {['menunggu', 'terverifikasi'].includes(a.status) && (
                          <button onClick={() => batalkan(a)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium inline-flex items-center gap-1">
                            <XCircle size={14} /> Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL TIKET (setelah daftar langsung / klik "Tiket") --- */}
      {tiket && (
        <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-4" onClick={() => setTiket(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTiket(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <div className="text-center">
              <p className="text-sm text-gray-500">Nomor Antrean</p>
              <p className="text-5xl font-extrabold text-[#1976d2]">{tiket.nomor_antrean}</p>
              <p className="font-semibold text-gray-800 mt-1">{tiket.nama_pengunjung || tiket.nama_tampil}</p>
              <p className="text-sm text-gray-500">{alamatSingkat(tiket)}</p>
              <p className="text-sm text-gray-500">{tiket.layanan?.nama_layanan}</p>
              <div className="my-4 inline-block p-2 bg-white border rounded-lg">
                <QrDinsos nilai={tiket.kode_barcode} ukuran={170} />
              </div>
              <p className="font-mono text-xs text-gray-400 break-all">{tiket.kode_barcode}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button onClick={cetak} className="py-2.5 rounded-lg border-2 border-[#1976d2] text-[#1976d2] font-semibold inline-flex items-center justify-center gap-2">
                <Printer size={16} /> Cetak Tiket
              </button>
              <button onClick={verifikasiSekarang} disabled={memverifikasi} className="py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                {memverifikasi ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Verifikasi
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Pengunjung sudah di tempat? Klik <strong>Verifikasi Sekarang</strong> agar antrean langsung masuk ke petugas pelayanan.
            </p>
          </div>
        </div>
      )}

      {/* Isi yang dicetak printer (tersembunyi di layar) */}
      <TiketCetak antrean={tiket} />
    </div>
  )
}
