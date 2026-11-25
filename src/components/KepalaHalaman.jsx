// ========================================
// FILE: KepalaHalaman.jsx
// DESKRIPSI: Banner judul (kepala halaman) berwarna biru muda dengan hiasan
// gelombang di kanan. Dipakai bersama oleh halaman pengunjung (Dashboard,
// Informasi Pelayanan, Riwayat Antrean, Panduan, Pengaturan Akun) supaya
// semua halaman tampil seragam.
// ========================================

// Props (data yang dikirim dari halaman pemakai):
// - ikon       : komponen ikon lucide-react (boleh kosong = tanpa kotak ikon)
// - judul      : teks judul besar
// - subjudul   : teks di bawah judul (boleh kosong)
// - deskripsi  : kalimat penjelasan singkat (boleh kosong)
// - aksi       : elemen di sisi kanan, misalnya tombol (boleh kosong)
// - judulBiru  : true = judul berwarna biru & subjudul abu-abu (gaya Dashboard)
// - garisBawah : true = tampilkan garis biru pendek di bawah subjudul
export default function KepalaHalaman({
  ikon: Ikon,
  judul,
  subjudul,
  deskripsi,
  aksi,
  judulBiru = false,
  garisBawah = false,
}) {
  return (
    // Kotak luar: gradasi biru muda, sudut membulat, bayangan halus
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-[#eaf3ff] via-[#dcebfd] to-[#c9e0fb] shadow-sm mb-6">
      {/* Hiasan gelombang di sisi kanan (hanya gambar, tidak bisa diklik) */}
      <svg
        className="pointer-events-none absolute right-0 bottom-0 h-full w-2/3 max-w-[640px]"
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Gelombang belakang (lebih tipis) */}
        <path d="M120 200 C 260 150, 330 60, 600 40 L 600 200 Z" fill="#ffffff" opacity="0.35" />
        {/* Gelombang depan (lebih biru) */}
        <path d="M260 200 C 380 170, 450 110, 600 90 L 600 200 Z" fill="#90c2f5" opacity="0.45" />
      </svg>

      {/* Isi banner: ikon, garis tegak, teks, dan tombol aksi */}
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
          {/* Kotak ikon (hanya jika halaman mengirim ikon) */}
          {Ikon && (
            <div className="hidden sm:flex w-16 h-16 lg:w-20 lg:h-20 flex-shrink-0 items-center justify-center rounded-2xl bg-[#dbeafe] border border-white/70 text-[#1565c0]">
              <Ikon size={36} strokeWidth={1.8} />
            </div>
          )}

          {/* Garis biru tegak sebagai aksen di kiri judul */}
          <span className="self-stretch w-1 rounded-full bg-[#1565c0] flex-shrink-0" aria-hidden="true" />

          {/* Teks judul, subjudul, dan deskripsi */}
          <div className="min-w-0">
            <h1 className={`text-2xl sm:text-3xl font-extrabold leading-tight ${judulBiru ? 'text-[#0d47a1]' : 'text-[#0f1e33]'}`}>
              {judul}
            </h1>
            {subjudul && (
              <p className={`mt-1 text-lg sm:text-xl ${judulBiru ? 'text-slate-600 font-medium' : 'text-[#1565c0] font-bold'}`}>
                {subjudul}
              </p>
            )}
            {/* Garis biru pendek di bawah subjudul (gaya Dashboard) */}
            {garisBawah && <span className="block w-14 h-1 rounded-full bg-[#1565c0] mt-3" aria-hidden="true" />}
            {deskripsi && (
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">{deskripsi}</p>
            )}
          </div>
        </div>

        {/* Tombol aksi di kanan (misalnya "Ambil Antrean Baru") */}
        {aksi && <div className="flex-shrink-0">{aksi}</div>}
      </div>
    </div>
  )
}
