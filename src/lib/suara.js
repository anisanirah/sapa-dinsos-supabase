// ========================================
// FILE: lib/suara.js
// DESKRIPSI: Suara pemanggilan antrean di komputer loket (permintaan Dinas Sosial).
// Memakai fitur bawaan browser (gratis, tanpa file audio):
//   1. Web Audio API  -> bunyi "ding-dong" sebelum pengumuman
//   2. Web Speech API -> membacakan kalimat dalam bahasa Indonesia, misalnya:
//      "Nomor antrean A, nol, nol, satu. Atas nama Siti Nurhaliza. Silakan menuju loket dua."
// Suara hanya keluar di komputer petugas yang menekan tombol (speaker loket tersebut).
// ========================================

// Ejaan angka 0-9 dalam bahasa Indonesia
const ANGKA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']

// Kunci penyimpanan di browser (localStorage) untuk nomor loket komputer ini
const KUNCI_LOKET = 'nomorLoket'

// Mengubah "A001" menjadi "A, nol, nol, satu" agar dibaca per huruf/angka dengan jelas
export function ejaNomor(nomor) {
  return String(nomor || '')
    .split('')
    .map((c) => (/\d/.test(c) ? ANGKA[Number(c)] : c.toUpperCase()))
    .join(', ')
}

// Mengubah angka loket 1-9 menjadi kata ("2" -> "dua"); selain itu dibaca apa adanya
function ejaLoket(loket) {
  const n = String(loket || '').trim()
  return /^\d$/.test(n) ? ANGKA[Number(n)] : n
}

// Nomor loket komputer ini:
//  1. pilihan yang disimpan petugas di browser ini, atau
//  2. angka di akhir nama akun (misal "Petugas Pelayanan 2" -> "2"), atau
//  3. kosong jika tidak diketahui
export function ambilNomorLoket(namaAkun) {
  const tersimpan = localStorage.getItem(KUNCI_LOKET)
  if (tersimpan) return tersimpan
  const cocok = String(namaAkun || '').match(/(\d+)\s*$/)
  return cocok ? cocok[1] : ''
}

// Menyimpan nomor loket pilihan petugas di browser ini
export function simpanNomorLoket(nomor) {
  if (nomor) localStorage.setItem(KUNCI_LOKET, String(nomor))
  else localStorage.removeItem(KUNCI_LOKET)
}

// Menyusun kalimat pengumuman
export function kalimatPanggilan({ nomor, nama, loket }) {
  let teks = `Nomor antrean ${ejaNomor(nomor)}.`
  if (nama) teks += ` Atas nama ${nama}.`
  teks += loket ? ` Silakan menuju loket ${ejaLoket(loket)}.` : ' Silakan menuju loket pelayanan.'
  return teks
}

// Bunyi "ding-dong" dua nada (sekitar 1,3 detik), mengembalikan Promise yang selesai setelah bunyi habis
function bunyiDingDong() {
  return new Promise((selesai) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      const ctx = new Ctx()
      // Dua nada: tinggi (ding) lalu rendah (dong)
      const nada = [
        { frek: 784, mulai: 0 },     // nada G5
        { frek: 523, mulai: 0.55 },  // nada C5
      ]
      nada.forEach(({ frek, mulai }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = frek
        const t = ctx.currentTime + mulai
        // Suara muncul cepat lalu memudar perlahan, mirip bel
        gain.gain.setValueAtTime(0.0001, t)
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.72)
      })
      // Tutup audio & lanjut ke pengumuman setelah bunyi selesai
      setTimeout(() => { ctx.close(); selesai() }, 1300)
    } catch {
      // Browser tidak mendukung Web Audio: langsung lanjut
      selesai()
    }
  })
}

// Daftar suara pembaca di browser kadang baru tersedia setelah beberapa saat
function tungguDaftarSuara() {
  return new Promise((selesai) => {
    const synth = window.speechSynthesis
    const ada = synth.getVoices()
    if (ada.length) return selesai(ada)
    // Tunggu event "voiceschanged", maksimal 1,5 detik
    const batas = setTimeout(() => selesai(synth.getVoices()), 1500)
    synth.onvoiceschanged = () => {
      clearTimeout(batas)
      selesai(synth.getVoices())
    }
  })
}

// Memilih suara berbahasa Indonesia jika tersedia (misal "Google Bahasa Indonesia" / "Microsoft Gadis")
async function pilihSuaraIndonesia() {
  const daftar = await tungguDaftarSuara()
  return daftar.find((v) => /^id(-|_|$)/i.test(v.lang)) || null
}

// Apakah browser ini bisa membacakan teks?
export function suaraDidukung() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Apakah ada suara berbahasa Indonesia di komputer ini? (untuk peringatan di layar)
export async function adaSuaraIndonesia() {
  if (!suaraDidukung()) return false
  return Boolean(await pilihSuaraIndonesia())
}

// Mengumumkan panggilan antrean: ding-dong, lalu kalimat dibacakan
// data = { nomor: 'A001', nama: 'Siti Nurhaliza', loket: '2' }
export async function umumkanPanggilan(data) {
  await bunyiDingDong()
  if (!suaraDidukung()) return
  const synth = window.speechSynthesis
  // Hentikan pengumuman sebelumnya yang belum selesai agar tidak menumpuk
  synth.cancel()
  const ucapan = new SpeechSynthesisUtterance(kalimatPanggilan(data))
  ucapan.lang = 'id-ID'
  ucapan.rate = 0.9   // sedikit lebih lambat agar jelas
  ucapan.pitch = 1
  ucapan.volume = 1
  const suaraId = await pilihSuaraIndonesia()
  if (suaraId) ucapan.voice = suaraId
  synth.speak(ucapan)
}
