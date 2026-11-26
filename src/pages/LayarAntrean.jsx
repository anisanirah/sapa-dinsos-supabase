// ========================================
// FILE: LayarAntrean.jsx
// DESKRIPSI: Halaman LAYAR ANTREAN untuk TV di ruang tunggu (alamat: /layar).
// - Bisa dibuka TANPA LOGIN (cukup ketik alamatnya di browser TV/komputer)
// - Menampilkan nomor yang sedang dipanggil + loket tujuan (huruf sangat besar)
// - Menampilkan isi 4 loket, panggilan sebelumnya, dan jumlah antrean menunggu
// - Mengumumkan panggilan lewat speaker TV (ding-dong + suara)
// - Data diperbarui otomatis setiap 3 detik dari fungsi layar_antrean()
// Demi privasi, nama pengunjung TIDAK ditampilkan, hanya nomor & loket.
// ========================================

// Hook React
import { useCallback, useEffect, useRef, useState } from 'react'
// Ikon
import { Volume2, VolumeX, Maximize, Minimize, Users, CheckCircle2, WifiOff, MonitorPlay, Info } from 'lucide-react'
// Penghubung ke Supabase
import api from '../lib/api'
// Suara panggilan (ding-dong + kalimat bahasa Indonesia)
import { umumkanPanggilan } from '../lib/suara'
// Nama aplikasi, instansi, hari & jam pelayanan
import { NAMA_APLIKASI, INSTANSI, HARI_LAYANAN, JAM_LAYANAN } from '../lib/merek'

// Data diperbarui setiap 3 detik
const JEDA_MUAT = 3000
// Lama nomor baru disorot (berkedip) di layar
const LAMA_SOROT = 8000

// Teks berjalan di bagian bawah layar
const TEKS_BERJALAN = [
  `Selamat datang di ${INSTANSI}`,
  `Jam pelayanan: ${HARI_LAYANAN}, pukul ${JAM_LAYANAN}`,
  'Siapkan dokumen persyaratan sebelum nomor Anda dipanggil',
  'Mohon menunggu dengan tertib, nomor Anda akan dipanggil melalui layar ini',
  'Ambil antrean online di sapa-dinsos.vercel.app',
]

// Label status loket
const LABEL_STATUS = {
  dipanggil: 'Memanggil',
  dilayani: 'Sedang Melayani',
}

// Ubah jam & tanggal sekarang menjadi teks bahasa Indonesia
const formatJam = (d) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const formatTanggal = (d) =>
  d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// Kunci unik satu pengumuman (id antrean + waktu umumkan).
// "Panggil Ulang" mengubah waktu -> dianggap pengumuman baru.
const kunciPanggilan = (p) => `${p.id}|${p.waktu}`

export default function LayarAntrean() {
  // Data dari database
  const [data, setData] = useState(null)
  // true = gagal terhubung (data terakhir tetap ditampilkan)
  const [putus, setPutus] = useState(false)
  // Jam yang berjalan
  const [sekarang, setSekarang] = useState(new Date())
  // Suara aktif? (browser mewajibkan satu kali klik sebelum boleh bersuara)
  const [suaraAktif, setSuaraAktif] = useState(false)
  // Layar pembuka "Klik untuk memulai" masih tampil?
  const [perluKlik, setPerluKlik] = useState(true)
  // Sedang mode layar penuh?
  const [layarPenuh, setLayarPenuh] = useState(false)
  // Kunci panggilan yang sedang disorot (berkedip)
  const [sorot, setSorot] = useState(null)

  // Catatan panggilan yang sudah pernah dilihat (agar tidak diumumkan dua kali)
  const sudahDilihat = useRef(null)
  // Antrean pengumuman yang menunggu giliran dibacakan
  const antreSuara = useRef([])
  const sedangBicara = useRef(false)
  // Nilai suaraAktif terbaru (dibaca di dalam fungsi muat)
  const suaraRef = useRef(false)
  suaraRef.current = suaraAktif

  // Bacakan pengumuman satu per satu sampai antrean kosong
  const putarAntreSuara = useCallback(async () => {
    if (sedangBicara.current) return
    sedangBicara.current = true
    while (antreSuara.current.length > 0) {
      const p = antreSuara.current.shift()
      setSorot(kunciPanggilan(p))
      if (suaraRef.current) {
        try {
          await umumkanPanggilan({ nomor: p.nomor, loket: p.loket })
        } catch {
          // Suara gagal: abaikan, tampilan tetap jalan
        }
      }
      // Beri jeda sebentar antar pengumuman
      await new Promise((r) => setTimeout(r, 800))
    }
    sedangBicara.current = false
  }, [])

  // Ambil data layar dari database
  const muat = useCallback(async () => {
    try {
      const res = await api.get('/layar')
      const baru = res.data
      setData(baru)
      setPutus(false)

      // Cari panggilan yang belum pernah dilihat
      const daftar = baru?.panggilan || []
      if (sudahDilihat.current === null) {
        // Pemuatan pertama: catat saja, jangan umumkan panggilan lama
        sudahDilihat.current = new Set(daftar.map(kunciPanggilan))
        return
      }
      // Urutkan dari yang paling lama agar diumumkan sesuai urutan panggilan
      const belum = daftar.filter((p) => !sudahDilihat.current.has(kunciPanggilan(p))).reverse()
      if (belum.length > 0) {
        belum.forEach((p) => sudahDilihat.current.add(kunciPanggilan(p)))
        antreSuara.current.push(...belum)
        putarAntreSuara()
      }
    } catch {
      setPutus(true)
    }
  }, [putarAntreSuara])

  // Muat data sekarang & setiap 3 detik
  useEffect(() => {
    muat()
    const t = setInterval(muat, JEDA_MUAT)
    return () => clearInterval(t)
  }, [muat])

  // Jam berjalan setiap detik
  useEffect(() => {
    const t = setInterval(() => setSekarang(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Sorotan berhenti berkedip setelah beberapa detik
  useEffect(() => {
    if (!sorot) return
    const t = setTimeout(() => setSorot(null), LAMA_SOROT)
    return () => clearTimeout(t)
  }, [sorot])

  // Pantau perubahan mode layar penuh (misal ditutup dengan tombol Esc)
  useEffect(() => {
    const ubah = () => setLayarPenuh(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', ubah)
    return () => document.removeEventListener('fullscreenchange', ubah)
  }, [])

  // Masuk / keluar layar penuh
  const aturLayarPenuh = async (masuk) => {
    try {
      if (masuk && !document.fullscreenElement) await document.documentElement.requestFullscreen()
      if (!masuk && document.fullscreenElement) await document.exitFullscreen()
    } catch {
      // Sebagian browser TV tidak mendukung layar penuh: abaikan
    }
  }

  // Cegah layar TV mati/redup sendiri (jika browser mendukung)
  const jagaLayarMenyala = async () => {
    try {
      await navigator.wakeLock?.request('screen')
    } catch {
      // Tidak didukung: abaikan
    }
  }

  // Klik pertama: aktifkan suara + layar penuh (aturan browser)
  const mulai = (denganSuara) => {
    setPerluKlik(false)
    setSuaraAktif(denganSuara)
    if (denganSuara && window.speechSynthesis) {
      // Ucapan kosong untuk "membuka kunci" suara di browser
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
    }
    aturLayarPenuh(true)
    jagaLayarMenyala()
  }

  // Panggilan paling baru (ditampilkan besar)
  const utama = data?.panggilan?.[0] || null
  // 3 panggilan sebelumnya (muat di layar TV tanpa terpotong)
  const sebelumnya = (data?.panggilan || []).slice(1, 4)
  const sedangSorot = utama && sorot === kunciPanggilan(utama)

  return (
    <div className="layar-antrean min-h-screen lg:h-screen w-full flex flex-col bg-[#eef4fc] text-[#0f1e33] overflow-hidden select-none">
      {/* Animasi kedip & teks berjalan (khusus halaman ini) */}
      <style>{`
        @keyframes layarKedip { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes layarCahaya { 0%,100% { box-shadow: 0 0 0 0 rgba(255,193,7,.0); } 50% { box-shadow: 0 0 0 14px rgba(255,193,7,.45); } }
        @keyframes layarJalan { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .layar-kedip { animation: layarKedip 1s ease-in-out infinite, layarCahaya 1s ease-in-out infinite; }
        .layar-jalan { animation: layarJalan 45s linear infinite; }
      `}</style>

      {/* ===== BAGIAN ATAS: logo, nama instansi, jam ===== */}
      <header className="flex items-center gap-4 px-[3vw] py-[1.6vh] bg-gradient-to-r from-[#0b55b8] to-[#1976d2] text-white shadow-lg">
        <img src="/images/logo-dinsos.png" alt="Logo Dinas Sosial" className="h-[7vh] min-h-[40px] w-auto" />
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold leading-tight text-[clamp(18px,2.6vw,44px)]">{NAMA_APLIKASI}</h1>
          <p className="opacity-90 text-[clamp(11px,1.2vw,22px)] uppercase tracking-wide truncate">{INSTANSI}</p>
        </div>
        {/* Tombol kecil: suara & layar penuh (samar, jelas saat disentuh) */}
        <div className="flex gap-2 opacity-40 hover:opacity-100 transition">
          <button
            onClick={() => setSuaraAktif((v) => !v)}
            title={suaraAktif ? 'Matikan suara' : 'Nyalakan suara'}
            className="rounded-full bg-white/20 hover:bg-white/30 p-2"
          >
            {suaraAktif ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            onClick={() => aturLayarPenuh(!layarPenuh)}
            title={layarPenuh ? 'Keluar layar penuh' : 'Layar penuh'}
            className="hidden sm:block rounded-full bg-white/20 hover:bg-white/30 p-2"
          >
            {layarPenuh ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
        <div className="text-right">
          <p className="font-extrabold tabular-nums leading-none text-[clamp(22px,3.2vw,56px)]">{formatJam(sekarang)}</p>
          <p className="opacity-90 text-[clamp(11px,1.1vw,20px)]">{formatTanggal(sekarang)}</p>
        </div>
      </header>

      {/* ===== BAGIAN TENGAH ===== */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-[1.5vw] px-[2vw] py-[1.5vw] min-h-0">
        {/* --- Kartu besar: nomor yang sedang dipanggil --- */}
        <section
          className={`relative rounded-[2vw] bg-gradient-to-br from-[#0d5bc4] to-[#2f86e6] text-white flex flex-col items-center justify-center text-center p-[3vw] shadow-xl overflow-hidden ${sedangSorot ? 'layar-kedip' : ''}`}
        >
          {/* Hiasan lingkaran samar */}
          <span className="absolute -right-[8vw] -bottom-[10vw] w-[30vw] h-[30vw] rounded-full bg-white/10" aria-hidden="true" />
          <span className="absolute -left-[6vw] -top-[8vw] w-[20vw] h-[20vw] rounded-full bg-white/10" aria-hidden="true" />

          <p className="relative font-bold tracking-[0.2em] text-[clamp(14px,min(1.8vw,3vh),34px)] opacity-90">NOMOR ANTREAN</p>
          {utama ? (
            <>
              <p className="relative font-black leading-none my-[1vh] text-[clamp(64px,min(13vw,21vh),260px)] tabular-nums">{utama.nomor}</p>
              <p className="relative text-[clamp(14px,min(1.8vw,3vh),34px)] font-semibold opacity-90">SILAKAN MENUJU</p>
              <p className="relative mt-[1vh] rounded-full bg-white text-[#0d5bc4] font-black px-[3vw] py-[0.6vh] text-[clamp(26px,min(4.5vw,7.5vh),84px)]">
                LOKET {utama.loket ?? '-'}
              </p>
              <p className="relative mt-[1.5vh] text-[clamp(14px,min(1.6vw,2.8vh),30px)] opacity-90">{utama.layanan}</p>
            </>
          ) : (
            <>
              <p className="relative font-black leading-none my-[2vh] text-[clamp(64px,11vw,220px)] opacity-60">- - -</p>
              <p className="relative text-[clamp(14px,1.8vw,32px)] opacity-90">Belum ada panggilan hari ini</p>
            </>
          )}
        </section>

        {/* --- Kolom kanan: panggilan sebelumnya + ringkasan --- */}
        <section className="flex flex-col gap-[1.5vw] min-h-0">
          <div className="flex-1 rounded-[1.5vw] bg-white shadow-md p-[1.5vw] flex flex-col min-h-0 overflow-hidden">
            <h2 className="font-extrabold text-[clamp(14px,1.6vw,30px)] text-[#0d5bc4] mb-[1vh]">Panggilan Sebelumnya</h2>
            {sebelumnya.length === 0 ? (
              <p className="text-slate-500 text-[clamp(12px,1.2vw,22px)]">Belum ada.</p>
            ) : (
              <ul className="flex-1 flex flex-col justify-start gap-[0.8vh] min-h-0 overflow-hidden">
                {sebelumnya.map((p) => (
                  <li key={kunciPanggilan(p)} className="flex items-center justify-between rounded-[1vw] bg-[#eef4fc] px-[1.2vw] py-[0.5vh]">
                    <span className="font-black tabular-nums text-[clamp(18px,min(2.4vw,4.2vh),46px)]">{p.nomor}</span>
                    <span className="font-bold text-[#0d5bc4] text-[clamp(14px,min(1.6vw,2.8vh),30px)]">Loket {p.loket ?? '-'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ringkasan jumlah antrean */}
          <div className="grid grid-cols-2 gap-[1vw]">
            <div className="rounded-[1.5vw] bg-amber-50 border-2 border-amber-200 p-[1vh] text-center">
              <Users className="mx-auto text-amber-600 w-[2.4vw] h-[2.4vw] min-w-[20px] min-h-[20px]" />
              <p className="font-black text-amber-700 text-[clamp(24px,min(3.4vw,5.5vh),64px)] leading-none">{data?.menunggu ?? 0}</p>
              <p className="font-semibold text-amber-800 text-[clamp(11px,1.1vw,20px)]">Menunggu</p>
            </div>
            <div className="rounded-[1.5vw] bg-emerald-50 border-2 border-emerald-200 p-[1vh] text-center">
              <CheckCircle2 className="mx-auto text-emerald-600 w-[2.4vw] h-[2.4vw] min-w-[20px] min-h-[20px]" />
              <p className="font-black text-emerald-700 text-[clamp(24px,min(3.4vw,5.5vh),64px)] leading-none">{data?.selesai ?? 0}</p>
              <p className="font-semibold text-emerald-800 text-[clamp(11px,1.1vw,20px)]">Selesai Hari Ini</p>
            </div>
          </div>
        </section>
      </main>

      {/* ===== DERETAN 4 LOKET ===== */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-[1.5vw] px-[2vw] pb-[1.5vw]">
        {(data?.loket || [1, 2, 3, 4].map((n) => ({ loket: n }))).map((l) => {
          const aktif = Boolean(l.nomor)
          return (
            <div
              key={l.loket}
              className={`rounded-[1.5vw] px-[1vw] py-[1vh] text-center shadow-md border-2 ${aktif ? 'bg-white border-[#90c2f5]' : 'bg-white/60 border-transparent'}`}
            >
              <p className="font-extrabold text-[#0d5bc4] text-[clamp(14px,min(1.7vw,3vh),32px)]">LOKET {l.loket}</p>
              <p className={`font-black tabular-nums leading-tight text-[clamp(28px,min(4vw,6.5vh),76px)] ${aktif ? 'text-[#0f1e33]' : 'text-slate-300'}`}>
                {l.nomor || '—'}
              </p>
              <p className={`font-semibold text-[clamp(11px,1.1vw,20px)] ${aktif ? 'text-emerald-600' : 'text-slate-400'}`}>
                {aktif ? LABEL_STATUS[l.status] || '' : 'Tersedia'}
              </p>
            </div>
          )
        })}
      </section>

      {/* ===== TEKS BERJALAN ===== */}
      <footer className="bg-[#0b55b8] text-white py-[1.2vh] overflow-hidden whitespace-nowrap">
        {/* Teks ditulis dua kali agar perputarannya tidak terputus */}
        <div className="layar-jalan inline-block text-[clamp(13px,1.4vw,26px)] font-medium">
          {[0, 1].map((ulang) => (
            <span key={ulang}>
              {TEKS_BERJALAN.map((t) => (
                <span key={t} className="mx-[3vw]">• {t}</span>
              ))}
            </span>
          ))}
        </div>
      </footer>

      {/* Peringatan koneksi terputus (data terakhir tetap tampil) */}
      {putus && (
        <div className="fixed bottom-[8vh] left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-red-600 text-white px-5 py-2 shadow-lg">
          <WifiOff size={18} />
          Koneksi internet terputus, mencoba lagi...
        </div>
      )}

      {/* ===== LAYAR PEMBUKA: wajib satu klik agar suara boleh berbunyi ===== */}
      {perluKlik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2f66]/90 backdrop-blur-sm p-6">
          <div className="relative max-w-lg w-full overflow-hidden rounded-[2rem] bg-white px-8 pt-8 pb-12 text-center shadow-2xl">
            {/* Hiasan gelombang biru muda di bagian bawah kotak */}
            <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 40 C 150 10, 300 55, 450 25 C 520 12, 570 18, 600 10 L 600 60 L 0 60 Z" fill="#dbeafe" />
              <path d="M0 50 C 200 30, 350 60, 600 35 L 600 60 L 0 60 Z" fill="#bfdbfe" opacity="0.6" />
            </svg>

            {/* Kotak ikon layar */}
            <div className="mx-auto flex w-20 h-20 items-center justify-center rounded-2xl bg-blue-100 text-[#0d5bc4]">
              <MonitorPlay size={44} strokeWidth={1.8} />
            </div>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight text-[#0f1e33]">
              Layar Antrean<br />{NAMA_APLIKASI}
            </h2>
            {/* Garis hiasan: tipis abu-abu dengan bagian tengah biru */}
            <div className="mx-auto mt-4 flex w-40 items-center" aria-hidden="true">
              <span className="h-1 flex-1 rounded-l-full bg-slate-200" />
              <span className="h-1 w-12 rounded-full bg-[#0d5bc4]" />
              <span className="h-1 flex-1 rounded-r-full bg-slate-200" />
            </div>
            <p className="mt-4 text-slate-600">
              Pilih salah satu mode untuk memulai penayangan antrean di layar layanan.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => mulai(true)}
                autoFocus
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#0d5bc4] hover:bg-[#0b4fa9] px-6 py-4 text-lg font-bold text-white shadow-md shadow-blue-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
              >
                <Volume2 size={24} />
                Mulai dengan Suara
              </button>
              <button
                onClick={() => mulai(false)}
                className="inline-flex items-center justify-center gap-3 rounded-xl border-2 border-[#1976d2] bg-white px-6 py-3.5 text-lg font-semibold text-slate-700 hover:bg-blue-50"
              >
                <VolumeX size={22} />
                Mulai tanpa Suara
              </button>
            </div>

            {/* Kotak info alasan harus klik dulu */}
            <div className="relative mt-5 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-left text-sm text-slate-600">
              <Info size={22} className="flex-shrink-0 text-[#0d5bc4]" />
              <span className="w-px self-stretch bg-[#0d5bc4]/40" aria-hidden="true" />
              <span>Browser memerlukan satu kali klik sebelum suara dapat diputar.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
