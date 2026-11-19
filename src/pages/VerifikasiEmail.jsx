// ========================================
// FILE: VerifikasiEmail.jsx
// DESKRIPSI: Halaman tujuan setelah pengguna mengklik tautan di email verifikasi.
// Versi Supabase: tautan di email berbentuk /verifikasi-email?token_hash=...&type=email
// Halaman ini menukarkan token_hash ke Supabase, lalu menampilkan hasilnya:
// sukses | sudah | gagal | kedaluwarsa (tampilan sama dengan versi Laravel).
// ========================================

// useEffect = jalankan kode saat halaman dibuka; useState = simpan data
import { useEffect, useRef, useState } from 'react'
// useSearchParams = membaca ?token_hash=... dari alamat halaman
import { Link, useSearchParams } from 'react-router-dom'
// Ikon-ikon dari lucide-react
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
// Penerjemah ke Supabase (kirim ulang email)
import api from '../lib/api'
// Klien Supabase (untuk memeriksa token dari email)
import { supabase } from '../lib/supabase'
// Fungsi bantu pesan error
import { pesanError } from '../lib/antrean'
// Data login (untuk tahu apakah pengguna sedang login)
import { useAuth } from '../context/AuthContext'
// Kerangka halaman publik
import KartuPublik, { kelasTombol } from '../components/KartuPublik'

// Isi tampilan untuk setiap status
const ISI = {
  memproses: {
    ikon: <Loader2 className="w-8 h-8 text-[#1976d2] animate-spin" />,
    judul: 'Memverifikasi Email...',
    deskripsi: 'Mohon tunggu sebentar.',
  },
  sukses: {
    ikon: <CheckCircle2 className="w-8 h-8 text-green-600" />,
    judul: 'Email Berhasil Diverifikasi',
    deskripsi: 'Terima kasih. Sekarang Anda sudah bisa mengambil nomor antrean secara online.',
  },
  sudah: {
    ikon: <CheckCircle2 className="w-8 h-8 text-green-600" />,
    judul: 'Email Sudah Terverifikasi',
    deskripsi: 'Email Anda sudah diverifikasi sebelumnya. Anda bisa langsung mengambil antrean.',
  },
  kedaluwarsa: {
    ikon: <Clock className="w-8 h-8 text-amber-600" />,
    judul: 'Tautan Kedaluwarsa',
    deskripsi: 'Tautan verifikasi hanya berlaku 60 menit. Silakan kirim ulang email verifikasi.',
  },
  gagal: {
    ikon: <XCircle className="w-8 h-8 text-red-600" />,
    judul: 'Verifikasi Gagal',
    deskripsi: 'Tautan verifikasi tidak valid atau sudah pernah dipakai. Silakan masuk; jika email belum terverifikasi, kirim ulang dari halaman login.',
  },
}

// Membaca keterangan error dari tautan bawaan Supabase (bagian setelah tanda #)
function errorDariHash() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return hash.get('error_code') || hash.get('error') || ''
}

// Komponen halaman hasil verifikasi email
export default function VerifikasiEmail() {
  // Ambil token_hash / status dari alamat halaman
  const [params] = useSearchParams()
  const tokenHash = params.get('token_hash')
  const jenis = params.get('type') || 'email'
  // Status awal: jika ada token -> sedang memproses
  const [status, setStatus] = useState(() => {
    if (tokenHash) return 'memproses'
    if (ISI[params.get('status')]) return params.get('status')
    const galat = errorDariHash()
    if (galat) return galat.includes('expired') ? 'kedaluwarsa' : 'gagal'
    return 'memproses'
  })
  const isi = ISI[status]
  // Data pengguna login + fungsi memuat ulang datanya
  const { user, refreshUser } = useAuth()
  // Status tombol kirim ulang
  const [mengirim, setMengirim] = useState(false)
  const [pesan, setPesan] = useState('')

  // Penanda agar token hanya ditukarkan SEKALI (token di email hanya berlaku satu kali pakai)
  const sudahDiproses = useRef(false)

  // Saat halaman dibuka: tukarkan token dari email ke Supabase
  useEffect(() => {
    const proses = async () => {
      if (status !== 'memproses' || sudahDiproses.current) return
      sudahDiproses.current = true
      if (tokenHash) {
        // Token hanya bisa dipakai sekali. Berhasil -> email terverifikasi & otomatis masuk.
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: jenis })
        if (!error) {
          setStatus('sukses')
          refreshUser().catch(() => {})
          return
        }
        setStatus(error.code === 'otp_expired' || String(error.message).includes('expired') ? 'kedaluwarsa' : 'gagal')
        return
      }
      // Tanpa token (template email bawaan Supabase): cek sesi yang dibuat dari tautan
      const { data } = await supabase.auth.getSession()
      setStatus(data.session?.user?.email_confirmed_at ? 'sukses' : 'gagal')
    }
    proses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kirim ulang email verifikasi (untuk pengguna yang sedang login)
  const kirimUlang = async () => {
    setMengirim(true)
    setPesan('')
    try {
      const res = await api.post('/email/kirim-ulang')
      setPesan(res.data.message)
    } catch (err) {
      setPesan(pesanError(err, 'Gagal mengirim ulang email.'))
    } finally {
      setMengirim(false)
    }
  }

  // true jika verifikasi sukses / sudah pernah diverifikasi
  const berhasil = status === 'sukses' || status === 'sudah'
  // Masih memproses: tampilkan kartu tanpa tombol
  if (status === 'memproses') {
    return <KartuPublik ikon={isi.ikon} judul={isi.judul} deskripsi={isi.deskripsi} />
  }

  return (
    <KartuPublik ikon={isi.ikon} judul={isi.judul} deskripsi={isi.deskripsi}>
      <div className="space-y-3">
        {pesan && <p className="text-center text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{pesan}</p>}
        {/* Kirim ulang hanya bisa jika sedang login sebagai pengunjung */}
        {!berhasil && user?.profile?.role === 'pengunjung' && (
          <button onClick={kirimUlang} disabled={mengirim} className={kelasTombol}>
            {mengirim ? <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</> : 'Kirim Ulang Email Verifikasi'}
          </button>
        )}
        {user ? (
          <Link to="/" className={berhasil ? kelasTombol : 'block text-center text-[#1976d2] font-semibold py-2'}>
            {berhasil ? 'Ambil Antrean Sekarang' : 'Ke Dashboard'}
          </Link>
        ) : (
          <Link to="/login" className={kelasTombol}>
            Masuk untuk Melanjutkan
          </Link>
        )}
      </div>
    </KartuPublik>
  )
}
