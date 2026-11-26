// ========================================
// FILE: petugas/DashboardPelayanan.jsx
// DESKRIPSI: Dashboard PETUGAS PELAYANAN (4 komputer loket).
// Sesuai alur:
//  - Daftar antrean TERVERIFIKASI tampil dengan format "A001 - Siti Nurhaliza"
//  - Klik "Ambil"        : TERVERIFIKASI -> DIPANGGIL (komputer loket mengumumkan panggilan lewat speaker)
//  - Klik "Panggil Ulang": mengulang pengumuman suara (status tidak berubah)
//  - Klik "Mulai Layani" : DIPANGGIL     -> DILAYANI
//  - Klik "Selesai"      : DILAYANI      -> SELESAI
//  - Klik "Tidak Hadir"  : DIPANGGIL     -> DIBATALKAN (pengunjung tidak datang)
// Satu petugas hanya memegang SATU antrean. Data diperbarui otomatis setiap 5 detik.
// ========================================
// useState = simpan data; useCallback = simpan fungsi; useRef = simpan nilai tanpa render ulang
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  // Ikon-ikon dari lucide-react
  Megaphone, Play, CheckCircle2, UserX, ListOrdered, Loader2, Volume2, VolumeX, Users, Repeat, AlertTriangle,
  LayoutGrid, ChevronDown, Phone, ClipboardList,
} from 'lucide-react'
// Klien API (penerjemah ke Supabase, lihat lib/api.js)
import api from '../../lib/api'
// Fungsi bantu format jam, pesan error, dan alamat singkat
import { formatJam, pesanError, alamatSingkat } from '../../lib/antrean'
// Data petugas yang login (nama dipakai sebagai nama loket)
import { useAuth } from '../../context/AuthContext'
// Notifikasi kecil di pojok layar
import { useToast } from '../../components/ToastProvider'
// Jendela konfirmasi buatan sendiri
import { useDialog } from '../../components/DialogProvider'
// Komponen kecil bersama untuk dashboard petugas
import { BannerSapaan, StatCard, BadgeStatus, BadgeJenis, PesanGagal, usePolling, bunyiTing } from './komponen'
// Gaya tampilan dashboard petugas
import '../DashboardPetugas.css'
// Suara pemanggilan antrean (ding-dong + dibacakan dalam bahasa Indonesia)
import { umumkanPanggilan, ambilNomorLoket, simpanNomorLoket, adaSuaraIndonesia } from '../../lib/suara'

// Data diperbarui otomatis setiap 5 detik
const REFRESH_INTERVAL = 5000

// Komponen Dashboard Petugas Pelayanan
export default function DashboardPelayanan() {
  const toast = useToast()
  // Fungsi untuk menampilkan jendela konfirmasi
  const tanya = useDialog()
  const { user } = useAuth()

  // Antrean yang sedang saya tangani (dipanggil / dilayani), null jika tidak ada
  const [milikSaya, setMilikSaya] = useState(null)
  // Daftar antrean terverifikasi (siap diambil)
  const [daftar, setDaftar] = useState([])
  // Statistik & antrean yang sedang ditangani petugas lain
  const [stats, setStats] = useState(null)
  const [diproses, setDiproses] = useState([])

  const [loadingAwal, setLoadingAwal] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  // id antrean yang tombolnya sedang diproses (mencegah klik dobel)
  const [sedangKlik, setSedangKlik] = useState(null)
  // Bunyi saat ada antrean baru (bisa dimatikan)
  const [suaraAktif, setSuaraAktif] = useState(() => localStorage.getItem('suaraPelayanan') !== 'mati')
  const jumlahSebelumnya = useRef(null)
  // Nomor loket komputer ini (dipakai dalam kalimat panggilan), bisa diubah petugas
  const [loket, setLoket] = useState(() => ambilNomorLoket(user?.profile?.nama))
  // false = komputer ini tidak punya suara berbahasa Indonesia (tampilkan peringatan)
  const [suaraIndonesia, setSuaraIndonesia] = useState(true)

  // Saat data akun baru termuat, isi nomor loket dari nama akun (misal "Petugas Pelayanan 2" -> 2)
  useEffect(() => {
    if (!loket) setLoket(ambilNomorLoket(user?.profile?.nama))
  }, [user, loket])

  // Periksa sekali apakah browser memiliki suara berbahasa Indonesia
  useEffect(() => {
    adaSuaraIndonesia().then(setSuaraIndonesia)
  }, [])

  // Ambil 3 data sekaligus: antrean milik saya, daftar terverifikasi, dan statistik
  const fetchData = useCallback(async () => {
    try {
      const [sayaRes, daftarRes, statsRes] = await Promise.all([
        api.get('/pelayanan/saya'),
        api.get('/pelayanan/daftar'),
        api.get('/dashboard/stats'),
      ])
      const daftarBaru = daftarRes.data || []
      setMilikSaya(sayaRes.data.antrean)
      setDaftar(daftarBaru)
      setStats(statsRes.data.stats)
      setDiproses(statsRes.data.sedang_diproses || [])
      setErrorMessage(null)

      // Bunyi "ting" jika jumlah antrean siap-ambil bertambah
      if (jumlahSebelumnya.current !== null && daftarBaru.length > jumlahSebelumnya.current && suaraAktif) {
        bunyiTing()
      }
      jumlahSebelumnya.current = daftarBaru.length
    } catch (err) {
      setErrorMessage(pesanError(err, 'Gagal memperbarui data.') + ' Data terakhir tetap ditampilkan.')
    } finally {
      setLoadingAwal(false)
    }
  }, [suaraAktif])

  // Jalankan fetchData sekarang dan setiap 5 detik
  usePolling(fetchData, REFRESH_INTERVAL)

  // Menjalankan aksi tombol (Ambil / Mulai / Selesai / Tidak Hadir)
  // Fungsi umum untuk semua tombol: kirim PUT /api/antreans/{id}/{jalur}
  // Mengembalikan true jika berhasil
  const aksi = async (antrean, jalur, pesanGagal) => {
    setSedangKlik(antrean.id)
    try {
      const res = await api.put(`/antreans/${antrean.id}/${jalur}`)
      toast.success(res.data.message)
      return true
    } catch (err) {
      // 409 = sudah diambil petugas lain / status berubah -> cukup muat ulang daftar
      toast.error(pesanError(err, pesanGagal))
      return false
    } finally {
      setSedangKlik(null)
      fetchData()
    }
  }

  // Umumkan panggilan lewat speaker komputer ini (jika suara dinyalakan)
  const panggilDenganSuara = (a) => {
    if (!suaraAktif) return
    umumkanPanggilan({ nomor: a.nomor_antrean, nama: a.nama_tampil, loket })
  }

  // Kirim panggilan ke LAYAR TV ruang tunggu (halaman /layar).
  // Jika gagal (misal internet putus), petugas cukup diberi tahu; pelayanan tetap jalan.
  const tampilkanDiLayar = async (a) => {
    // Nomor loket wajib dipilih agar layar tahu pengunjung harus ke loket mana
    if (!loket) {
      toast.error('Pilih nomor "Loket" di kanan atas agar panggilan tampil di layar TV.')
      return false
    }
    try {
      await api.put(`/antreans/${a.id}/umumkan`, { loket: Number(loket) })
      return true
    } catch (err) {
      toast.error(pesanError(err, 'Panggilan belum tampil di layar TV.'))
      return false
    }
  }

  // "Ambil": TERVERIFIKASI -> DIPANGGIL, lalu tampil di layar TV & diumumkan
  const ambil = async (a) => {
    const berhasil = await aksi(a, 'call', 'Gagal mengambil antrean.')
    if (berhasil) {
      tampilkanDiLayar(a)
      panggilDenganSuara(a)
    }
  }

  // "Panggil Ulang": tampil lagi di layar TV & diumumkan ulang (status tidak berubah)
  const panggilUlang = async (a) => {
    const tampil = await tampilkanDiLayar(a)
    panggilDenganSuara(a)
    if (tampil) toast.success(`Nomor ${a.nomor_antrean} dipanggil ulang.`)
  }

  // Simpan pilihan nomor loket di browser komputer ini
  const ubahLoket = (nilai) => {
    setLoket(nilai)
    simpanNomorLoket(nilai)
  }
  // "Mulai Layani": DIPANGGIL -> DILAYANI
  const mulai = (a) => aksi(a, 'mulai', 'Gagal memulai pelayanan.')
  // "Selesai": DILAYANI -> SELESAI
  const selesai = (a) => aksi(a, 'selesai', 'Gagal menyelesaikan pelayanan.')
  // "Tidak Hadir": DIPANGGIL -> DIBATALKAN (minta konfirmasi dulu)
  const tidakHadir = async (a) => {
    const yakin = await tanya({
      varian: 'peringatan',
      ikon: 'tidakHadir',
      judul: 'Pengunjung tidak hadir?',
      pesan: 'Pastikan nomor sudah dipanggil beberapa kali. Antrean ini akan dibatalkan dan Anda bisa mengambil antrean berikutnya.',
      antrean: { nomor: a.nomor_antrean, nama: a.nama_tampil, keterangan: a.layanan?.nama_layanan },
      teksYa: 'Tandai Tidak Hadir',
    })
    if (!yakin) return
    aksi(a, 'tidak-hadir', 'Gagal menandai tidak hadir.')
  }

  // Nyalakan / matikan suara: bunyi "ting" antrean baru + pengumuman panggilan (pilihan disimpan di browser)
  const ubahSuara = () => {
    const baru = !suaraAktif
    setSuaraAktif(baru)
    localStorage.setItem('suaraPelayanan', baru ? 'nyala' : 'mati')
    if (baru) bunyiTing()
  }

  // Antrean petugas lain (bukan milik saya)
  const petugasLain = diproses.filter((a) => a.id !== milikSaya?.id)

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 lg:block lg:space-y-6">
      {/* ===== JUDUL HALAMAN + pilihan loket & suara ===== */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Kotak ikon biru di samping judul */}
          <span className="flex w-12 h-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#0d5bc4] text-white shadow-md shadow-blue-200">
            <LayoutGrid size={26} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0f1e33]">Dashboard Pelayanan</h1>
            <p className="text-slate-500 text-sm mt-0.5">Ambil antrean yang sudah terverifikasi, sistem akan memanggil lewat speaker, lalu layani sampai selesai.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Pilihan nomor loket komputer ini (dibacakan & tampil di layar TV) */}
          <div className="relative">
            <select
              value={loket}
              onChange={(e) => ubahLoket(e.target.value)}
              aria-label="Nomor loket"
              className="appearance-none rounded-xl border border-slate-200 bg-white pl-5 pr-11 py-2.5 font-semibold text-slate-800 shadow-sm focus:outline-none focus:border-[#1976d2] focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Pilih Loket</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={String(n)}>Loket {n}</option>)}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
          </div>
          {/* Nyalakan/matikan suara (bunyi antrean baru + pengumuman panggilan) */}
          <button
            onClick={ubahSuara}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold transition ${suaraAktif ? 'border-[#1976d2] text-[#1565c0] bg-blue-50/60 hover:bg-blue-50' : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'}`}
            title="Suara panggilan & bunyi antrean baru"
          >
            {suaraAktif ? <Volume2 size={20} /> : <VolumeX size={20} />} Suara {suaraAktif ? 'Nyala' : 'Mati'}
          </button>
        </div>
      </div>

      {/* Peringatan jika komputer belum punya suara bahasa Indonesia */}
      {suaraAktif && !suaraIndonesia && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 text-sm text-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>
            Browser di komputer ini belum memiliki suara berbahasa Indonesia, jadi pengumuman bisa terdengar berlogat asing.
            Gunakan Google Chrome atau Microsoft Edge versi terbaru dan pastikan komputer terhubung ke internet.
          </span>
        </div>
      )}

      <PesanGagal pesan={errorMessage} onCobaLagi={fetchData} />

      {/* ===== BANNER SAPAAN + JAM ===== */}
      <BannerSapaan nama={user?.profile?.nama || 'Petugas'} subjudul="Daftar antrean diperbarui otomatis setiap 5 detik." />

      {/* ===== EMPAT KARTU STATISTIK ===== */}
      {/* Di HP statistik ditaruh setelah kartu kerja (order-last), di layar lebar tetap di atas */}
      <div className="order-last lg:order-none grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<ListOrdered size={28} />} color="blue" label="Siap Dipanggil" value={stats?.terverifikasi ?? 0} sub="Sudah terverifikasi" />
        <StatCard icon={<Megaphone size={28} />} color="orange" label="Sedang Diproses" value={(stats?.dipanggil ?? 0) + (stats?.dilayani ?? 0)} sub="Dipanggil + dilayani" />
        <StatCard icon={<CheckCircle2 size={28} />} color="green" label="Selesai Hari Ini" value={stats?.selesai ?? 0} sub="Semua loket" />
        <StatCard icon={<Users size={28} />} color="red" label="Belum Verifikasi" value={stats?.menunggu ?? 0} sub="Masih di meja pendaftaran" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ===== KIRI: ANTREAN YANG SEDANG SAYA TANGANI ===== */}
        <div className="lg:col-span-2">
          <div className={`rounded-2xl overflow-hidden shadow-sm border-2 bg-white ${milikSaya ? 'border-blue-200' : 'border-dashed border-slate-300'}`}>
            {/* Kepala kartu biru muda + label loket */}
            <div className="flex items-center gap-3 px-6 py-4 bg-blue-50/70 border-b border-blue-100">
              <Megaphone size={26} className="text-[#1565c0]" />
              <h3 className="flex-1 text-xl font-bold text-[#0f1e33]">Antrean Saya</h3>
              {loket && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-[#1565c0]">Loket {loket}</span>
              )}
            </div>

            <div className="p-6">
              {milikSaya ? (
                <>
                  <div className="text-center">
                    {/* Label status di baris sendiri, di atas nomor */}
                    <div><BadgeStatus status={milikSaya.status} /></div>
                    {/* Nomor antrean dalam kotak biru muda */}
                    <div className="mx-auto mt-3 inline-block rounded-2xl bg-blue-100/70 px-8 py-2 text-6xl font-extrabold text-[#0d47a1] tracking-tight">
                      {milikSaya.nomor_antrean}
                    </div>
                    <div className="text-2xl font-bold text-[#0f1e33] mt-2">{milikSaya.nama_tampil}</div>
                    <div className="text-slate-600">{alamatSingkat(milikSaya)}</div>
                    <div className="text-slate-600">{milikSaya.layanan?.nama_layanan}</div>
                    {milikSaya.no_telp_pengunjung && (
                      <div className="mt-1 inline-flex items-center gap-1.5 text-slate-700">
                        <Phone size={16} /> {milikSaya.no_telp_pengunjung}
                      </div>
                    )}
                  </div>
                  {/* Keperluan yang ditulis pengunjung, agar petugas langsung tahu kebutuhannya */}
                  {milikSaya.keperluan && (
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700">
                      <span className="font-semibold">Keperluan:</span> {milikSaya.keperluan}
                    </div>
                  )}

                  {/* Status DIPANGGIL: teks panggilan + Panggil Ulang + Tidak Hadir / Mulai Layani */}
                  {milikSaya.status === 'dipanggil' && (
                    <>
                      <div className="mt-4 flex gap-3 bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-sm text-slate-700">
                        <Volume2 size={22} className="text-[#1565c0] flex-shrink-0" />
                        <div>
                          {suaraAktif ? 'Diumumkan lewat speaker: ' : 'Panggil secara lisan: '}
                          <em>&quot;Nomor antrean <strong>{milikSaya.nomor_antrean}</strong>, atas nama <strong>{milikSaya.nama_tampil}</strong>,
                          silakan menuju loket {loket || 'pelayanan'}.&quot;</em>
                          <div className="text-xs text-slate-500 mt-1">Dipanggil pukul {formatJam(milikSaya.waktu_dipanggil)}</div>
                        </div>
                      </div>
                      {/* Ulangi pengumuman jika pengunjung belum datang ke loket */}
                      <button
                        onClick={() => panggilUlang(milikSaya)}
                        className="w-full mt-4 py-3 rounded-xl border-2 border-[#1976d2] bg-blue-50/50 text-[#1565c0] font-bold hover:bg-blue-50 inline-flex items-center justify-center gap-2"
                      >
                        <Repeat size={20} /> Panggil Ulang
                      </button>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <button
                          onClick={() => tidakHadir(milikSaya)}
                          disabled={sedangKlik === milikSaya.id}
                          className="py-3 rounded-xl border-2 border-red-300 text-red-600 font-bold hover:bg-red-50 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <UserX size={20} /> Tidak Hadir
                        </button>
                        <button
                          onClick={() => mulai(milikSaya)}
                          disabled={sedangKlik === milikSaya.id}
                          className="py-3 rounded-xl bg-[#0d5bc4] hover:bg-[#0b4fa9] text-white font-bold shadow-md shadow-blue-200 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {sedangKlik === milikSaya.id ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />} Mulai Layani
                        </button>
                      </div>
                    </>
                  )}

                  {/* Status DILAYANI: tombol Selesai */}
                  {milikSaya.status === 'dilayani' && (
                    <>
                      <p className="text-center text-sm text-slate-600 mt-4">
                        Dilayani sejak pukul {formatJam(milikSaya.waktu_mulai_dilayani)}.
                      </p>
                      <button
                        onClick={() => selesai(milikSaya)}
                        disabled={sedangKlik === milikSaya.id}
                        className="w-full mt-4 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-md shadow-green-200 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {sedangKlik === milikSaya.id ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />} Selesai
                      </button>
                    </>
                  )}
                </>
              ) : (
                // Belum memegang antrean
                <div className="text-center py-6">
                  <Megaphone size={52} strokeWidth={1.5} className="mx-auto text-blue-200" />
                  <p className="text-slate-600 mt-3">Anda sedang tidak menangani antrean.</p>
                  {daftar.length > 0 ? (
                    <button
                      onClick={() => ambil(daftar[0])}
                      disabled={sedangKlik !== null}
                      className="mt-4 px-6 py-3 rounded-xl bg-[#0d5bc4] hover:bg-[#0b4fa9] text-white font-bold shadow-md shadow-blue-200 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <Megaphone size={20} /> Ambil Berikutnya ({daftar[0].nomor_antrean})
                    </button>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1">Belum ada antrean terverifikasi.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== KANAN: DAFTAR ANTREAN TERVERIFIKASI ===== */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-start gap-3 px-6 py-5 border-b border-slate-100">
            <ListOrdered size={26} className="text-[#1565c0] mt-0.5" />
            <div>
              <h3 className="text-xl font-bold text-[#0f1e33]">Antrean Siap Dipanggil ({daftar.length})</h3>
              <p className="text-slate-500">Urut dari yang paling dulu diverifikasi.</p>
            </div>
          </div>
          {daftar.length === 0 ? (
            <div className="text-center py-16 px-6">
              <ClipboardList size={72} strokeWidth={1.3} className="mx-auto text-blue-200" />
              <p className="mt-4 text-lg font-bold text-[#0f1e33]">Belum ada antrean terverifikasi.</p>
              <p className="text-slate-500 mt-1">Antrean muncul otomatis setelah barcode di-scan petugas pendaftaran.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {/* Satu baris untuk setiap antrean terverifikasi (baris pertama diberi warna) */}
              {daftar.map((a, i) => (
                <li key={a.id} className={`px-6 py-4 flex items-center gap-4 ${i === 0 ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    {/* Format sesuai alur: A001 - Siti Nurhaliza */}
                    <div className="font-semibold text-slate-800 truncate">
                      <span className="text-[#1565c0] font-extrabold">{a.nomor_antrean}</span> - {a.nama_tampil}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{a.layanan?.nama_layanan}</span>
                      {a.desa_kelurahan && <span>• {alamatSingkat(a)}</span>}
                      <BadgeJenis jenis={a.jenis_pendaftaran} />
                      <span>Verifikasi {formatJam(a.waktu_verifikasi)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => ambil(a)}
                    disabled={!!milikSaya || sedangKlik !== null}
                    title={milikSaya ? 'Selesaikan dulu antrean Anda' : 'Ambil antrean ini'}
                    className="px-5 py-2 rounded-xl bg-[#0d5bc4] hover:bg-[#0b4fa9] text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sedangKlik === a.id ? <Loader2 size={16} className="animate-spin" /> : 'Ambil'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ===== ANTREAN YANG SEDANG DITANGANI PETUGAS LAIN ===== */}
      {petugasLain.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#0f1e33] mb-3">Sedang Ditangani Petugas Lain</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {petugasLain.map((a) => (
              <div key={a.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-[#1565c0]">{a.nomor_antrean}</span>
                  <BadgeStatus status={a.status} />
                </div>
                <div className="text-sm text-slate-800 truncate">{a.nama_tampil}</div>
                <div className="text-xs text-slate-500">oleh {a.dilayani_oleh?.profile?.nama || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
