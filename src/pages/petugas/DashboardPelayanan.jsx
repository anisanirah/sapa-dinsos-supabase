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
  Megaphone, Play, CheckCircle2, UserX, Hand, ListOrdered, Loader2, Volume2, VolumeX, Users, Repeat, AlertTriangle,
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

  // "Ambil": TERVERIFIKASI -> DIPANGGIL, lalu langsung diumumkan
  const ambil = async (a) => {
    const berhasil = await aksi(a, 'call', 'Gagal mengambil antrean.')
    if (berhasil) panggilDenganSuara(a)
  }

  // "Panggil Ulang": umumkan lagi tanpa mengubah status (pengunjung belum datang ke loket)
  const panggilUlang = (a) => {
    if (!suaraAktif) {
      toast.error('Suara sedang mati. Nyalakan tombol "Suara" di kanan atas terlebih dahulu.')
      return
    }
    panggilDenganSuara(a)
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Pelayanan</h1>
          <p className="text-gray-500 text-sm mt-1">Ambil antrean yang sudah terverifikasi, sistem akan memanggil lewat speaker, lalu layani sampai selesai.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Pilihan nomor loket komputer ini (dibacakan saat memanggil) */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 bg-white">
            Loket
            <select
              value={loket}
              onChange={(e) => ubahLoket(e.target.value)}
              className="bg-transparent font-semibold text-[#1976d2] focus:outline-none"
            >
              <option value="">-</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={String(n)}>{n}</option>)}
            </select>
          </label>
          {/* Nyalakan/matikan suara (bunyi antrean baru + pengumuman panggilan) */}
          <button
            onClick={ubahSuara}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 ${suaraAktif ? 'border-[#1976d2] text-[#1976d2] bg-blue-50' : 'border-gray-300 text-gray-600'}`}
            title="Suara panggilan & bunyi antrean baru"
          >
            {suaraAktif ? <Volume2 size={16} /> : <VolumeX size={16} />} Suara {suaraAktif ? 'Nyala' : 'Mati'}
          </button>
        </div>
      </div>

      {/* Peringatan jika komputer belum punya suara bahasa Indonesia */}
      {suaraAktif && !suaraIndonesia && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-sm text-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>
            Browser di komputer ini belum memiliki suara berbahasa Indonesia, jadi pengumuman bisa terdengar berlogat asing.
            Gunakan Google Chrome atau Microsoft Edge versi terbaru dan pastikan komputer terhubung ke internet.
          </span>
        </div>
      )}

      <PesanGagal pesan={errorMessage} onCobaLagi={fetchData} />

      <BannerSapaan nama={user?.profile?.nama || 'Petugas'} subjudul="Daftar antrean diperbarui otomatis setiap 5 detik." />

      {/* Empat kartu statistik */}
      {/* Di HP statistik ditaruh setelah kartu kerja (order-last), di layar lebar tetap di atas */}
      <div className="stats-grid order-last lg:order-none">
        <StatCard icon={<ListOrdered size={24} />} color="blue" label="Siap Dipanggil" value={stats?.terverifikasi ?? 0} sub="Sudah terverifikasi" />
        <StatCard icon={<Megaphone size={24} />} color="orange" label="Sedang Diproses" value={(stats?.dipanggil ?? 0) + (stats?.dilayani ?? 0)} sub="Dipanggil + dilayani" />
        <StatCard icon={<CheckCircle2 size={24} />} color="green" label="Selesai Hari Ini" value={stats?.selesai ?? 0} sub="Semua loket" />
        <StatCard icon={<Users size={24} />} color="red" label="Belum Verifikasi" value={stats?.menunggu ?? 0} sub="Masih di meja pendaftaran" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* --- KIRI: ANTREAN YANG SEDANG SAYA TANGANI --- */}
        <div className="lg:col-span-2">
          <div className={`rounded-2xl p-6 shadow-sm border-2 ${milikSaya ? (milikSaya.status === 'dipanggil' ? 'border-yellow-400 bg-yellow-50' : 'border-purple-400 bg-purple-50') : 'border-dashed border-gray-300 bg-white'}`}>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Megaphone size={20} className="text-[#1976d2]" /> Antrean Saya
            </h3>

            {milikSaya ? (
              <div className="mt-4">
                <div className="text-center">
                  <BadgeStatus status={milikSaya.status} />
                  <div className="text-6xl font-extrabold text-[#1976d2] mt-3">{milikSaya.nomor_antrean}</div>
                  <div className="text-xl font-semibold text-gray-800 mt-1">{milikSaya.nama_tampil}</div>
                  <div className="text-sm text-gray-600">{alamatSingkat(milikSaya)}</div>
                  <div className="text-sm text-gray-600">{milikSaya.layanan?.nama_layanan}</div>
                  {milikSaya.no_telp_pengunjung && <div className="text-xs text-gray-500">HP: {milikSaya.no_telp_pengunjung}</div>}
                </div>
                {/* Keperluan yang ditulis pengunjung, agar petugas langsung tahu kebutuhannya */}
                {milikSaya.keperluan && (
                  <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                    <span className="font-semibold">Keperluan:</span> {milikSaya.keperluan}
                  </div>
                )}

                {/* Status DIPANGGIL: tampilkan teks panggilan + tombol Tidak Hadir / Mulai Layani */}
                {milikSaya.status === 'dipanggil' && (
                  <>
                    <div className="mt-4 bg-white border border-yellow-200 rounded-lg p-3 text-sm text-gray-700">
                      <Hand size={16} className="inline mr-1 text-yellow-600" />
                      {suaraAktif ? 'Diumumkan lewat speaker: ' : 'Panggil secara lisan: '}
                      <em>&quot;Nomor antrean <strong>{milikSaya.nomor_antrean}</strong>, atas nama <strong>{milikSaya.nama_tampil}</strong>,
                      silakan menuju loket {loket || 'pelayanan'}.&quot;</em>
                      <div className="text-xs text-gray-500 mt-1">Dipanggil pukul {formatJam(milikSaya.waktu_dipanggil)}</div>
                    </div>
                    {/* Ulangi pengumuman jika pengunjung belum datang ke loket */}
                    <button
                      onClick={() => panggilUlang(milikSaya)}
                      className="w-full mt-3 py-3 rounded-lg border-2 border-[#1976d2] text-[#1976d2] font-semibold hover:bg-blue-50 inline-flex items-center justify-center gap-2"
                    >
                      <Repeat size={18} /> Panggil Ulang
                    </button>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => tidakHadir(milikSaya)}
                        disabled={sedangKlik === milikSaya.id}
                        className="py-3 rounded-lg border-2 border-red-300 text-red-600 font-semibold hover:bg-red-50 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <UserX size={18} /> Tidak Hadir
                      </button>
                      <button
                        onClick={() => mulai(milikSaya)}
                        disabled={sedangKlik === milikSaya.id}
                        className="py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {sedangKlik === milikSaya.id ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} Mulai Layani
                      </button>
                    </div>
                  </>
                )}

                {/* Status DILAYANI: tampilkan tombol Selesai */}
                {milikSaya.status === 'dilayani' && (
                  <>
                    <p className="text-center text-sm text-gray-600 mt-4">
                      Dilayani sejak pukul {formatJam(milikSaya.waktu_mulai_dilayani)}.
                    </p>
                    <button
                      onClick={() => selesai(milikSaya)}
                      disabled={sedangKlik === milikSaya.id}
                      className="w-full mt-4 py-3.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {sedangKlik === milikSaya.id ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />} Selesai
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Megaphone size={48} className="mx-auto text-gray-300" />
                <p className="text-gray-600 mt-3">Anda sedang tidak menangani antrean.</p>
                {daftar.length > 0 ? (
                  <button
                    onClick={() => ambil(daftar[0])}
                    disabled={sedangKlik !== null}
                    className="mt-4 px-5 py-3 rounded-lg bg-[#1976d2] hover:bg-[#1565c0] text-white font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Megaphone size={18} /> Ambil Berikutnya ({daftar[0].nomor_antrean})
                  </button>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">Belum ada antrean terverifikasi.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- KANAN: DAFTAR ANTREAN TERVERIFIKASI --- */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">Antrean Siap Dipanggil ({daftar.length})</h3>
            <p className="text-sm text-gray-500">Urut dari yang paling dulu diverifikasi.</p>
          </div>
          {daftar.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ListOrdered size={44} className="mx-auto mb-2 opacity-30" />
              <p>Belum ada antrean terverifikasi.</p>
              <p className="text-xs text-gray-400 mt-1">Antrean muncul otomatis setelah barcode di-scan petugas pendaftaran.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {/* Satu baris untuk setiap antrean terverifikasi (baris pertama diberi warna) */}
              {daftar.map((a, i) => (
                <li key={a.id} className={`px-5 py-4 flex items-center gap-4 ${i === 0 ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    {/* Format sesuai alur: A001 - Siti Nurhaliza */}
                    <div className="font-semibold text-gray-800 truncate">
                      <span className="text-[#1976d2] font-bold">{a.nomor_antrean}</span> - {a.nama_tampil}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
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
                    className="px-4 py-2 rounded-lg bg-[#1976d2] hover:bg-[#1565c0] text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sedangKlik === a.id ? <Loader2 size={16} className="animate-spin" /> : 'Ambil'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* --- ANTREAN YANG SEDANG DITANGANI PETUGAS LAIN --- */}
      {petugasLain.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3">Sedang Ditangani Petugas Lain</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {petugasLain.map((a) => (
              <div key={a.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-[#1976d2]">{a.nomor_antrean}</span>
                  <BadgeStatus status={a.status} />
                </div>
                <div className="text-sm text-gray-800 truncate">{a.nama_tampil}</div>
                <div className="text-xs text-gray-500">oleh {a.dilayani_oleh?.profile?.nama || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
