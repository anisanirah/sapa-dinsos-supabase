// ========================================
// FILE: lib/laporanPdf.js
// DESKRIPSI: Membuat file PDF "Rekap Permohonan Layanan" (kertas A4) dari data rekap.
// Isi laporan (tersusun runtut agar enak dibaca saat laporan akhir bulan):
//   Kop surat Dinas Sosial (teks, tanpa logo) -> Judul & periode -> Keterangan laporan
//   A. Ringkasan          -> angka total, selesai, diproses, menunggu, batal, online/langsung
//   B. Rincian per jenis layanan (tabel, diurutkan dari yang terbanyak) + baris jumlah
//   C. Grafik jumlah permohonan per layanan (batang mendatar)
//   D. Catatan            -> penjelasan cara menghitung
//   Kolom tanda tangan (dibuat oleh petugas, mengetahui pimpinan) + nomor halaman
// Memakai pustaka jsPDF + jspdf-autotable, dimuat hanya saat tombol "Unduh PDF" ditekan.
// ========================================

// Warna tema SAPA DINSOS (biru dinsos) dalam format RGB
const BIRU = [25, 118, 210]
const BIRU_MUDA = [227, 242, 253]
const ABU = [100, 116, 139]
const HITAM = [30, 41, 59]

// Ukuran kertas A4 (mm) dan margin kiri/kanan
const LEBAR = 210
const TINGGI = 297
const MARGIN = 20

// Data instansi untuk kop surat
const INSTANSI = {
  pemda: 'PEMERINTAH KABUPATEN MAJALENGKA',
  dinas: 'DINAS SOSIAL',
  alamat: 'Jl. Raya K.H. Abdul Halim No. 498, Tonjong, Kec. Majalengka, Kabupaten Majalengka, Jawa Barat 45411',
  kontak: 'Telepon (0233) 281122  •  Surel: disosmajalengka@gmail.com',
}

// Format angka Indonesia: 1234 -> "1.234"
const angka = (n) => Number(n || 0).toLocaleString('id-ID')
// Persentase dengan 1 angka di belakang koma: "99,2%"
const persen = (bagian, total) => (total ? `${(Math.round((bagian / total) * 1000) / 10).toLocaleString('id-ID')}%` : '0%')

// "2026-11-23" -> objek Date (tanpa geser zona waktu)
function keTanggal(iso) {
  const [th, bl, tg] = iso.split('-').map(Number)
  return new Date(th, bl - 1, tg)
}
// "2026-11-23" -> "23 November 2026"
const tglPanjang = (iso) => keTanggal(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

// Teks periode laporan sesuai jenisnya
export function teksPeriode(rekap, jenis) {
  if (jenis === 'hari') return keTanggal(rekap.dari).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (jenis === 'bulan' || jenis === 'pilih-bulan') {
    const namaBulan = keTanggal(rekap.dari).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    return `${namaBulan} (${tglPanjang(rekap.dari)} s.d. ${tglPanjang(rekap.sampai)})`
  }
  return rekap.dari === rekap.sampai ? tglPanjang(rekap.dari) : `${tglPanjang(rekap.dari)} s.d. ${tglPanjang(rekap.sampai)}`
}

// Nama jenis laporan untuk keterangan
const NAMA_JENIS = { hari: 'Harian', bulan: 'Bulanan', 'pilih-bulan': 'Bulanan', rentang: 'Rentang tanggal' }

// Menulis judul bagian (A, B, C, D) dengan garis aksen biru di kiri
function judulBagian(doc, y, teks) {
  doc.setFillColor(...BIRU)
  doc.rect(MARGIN, y - 4, 1.5, 5.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...HITAM)
  doc.text(teks, MARGIN + 4, y)
  return y + 4
}

// Pindah ke halaman baru jika sisa ruang kurang dari "butuh" mm
function pastikanRuang(doc, y, butuh) {
  if (y + butuh > TINGGI - 25) {
    doc.addPage()
    return 25
  }
  return y
}

// Fungsi utama: membuat & mengunduh PDF
// rekap       : hasil fungsi rekap_layanan (dari, sampai, total, layanan[])
// jenisPeriode: 'hari' | 'bulan' | 'pilih-bulan' | 'rentang'
// namaPetugas : nama akun yang mencetak
export async function unduhLaporanPdf(rekap, jenisPeriode, namaPetugas) {
  // Muat pustaka PDF hanya saat dibutuhkan (agar aplikasi tetap ringan)
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const periode = teksPeriode(rekap, jenisPeriode)
  const sekarang = new Date()
  const waktuCetak = `${sekarang.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, pukul ${sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
  const t = rekap.total

  // ===== 1. KOP SURAT (teks saja, tanpa logo; lambang resmi bisa ditambahkan nanti) =====
  doc.setTextColor(...HITAM)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(INSTANSI.pemda, LEBAR / 2, 17, { align: 'center' })
  doc.setFontSize(17)
  doc.text(INSTANSI.dinas, LEBAR / 2, 25, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(INSTANSI.alamat, LEBAR / 2, 30.5, { align: 'center', maxWidth: 170 })
  doc.text(INSTANSI.kontak, LEBAR / 2, 34.5, { align: 'center' })
  // Garis ganda di bawah kop (tebal lalu tipis)
  doc.setDrawColor(...HITAM)
  doc.setLineWidth(0.9)
  doc.line(MARGIN, 38.5, LEBAR - MARGIN, 38.5)
  doc.setLineWidth(0.25)
  doc.line(MARGIN, 39.8, LEBAR - MARGIN, 39.8)

  // ===== 2. JUDUL & PERIODE =====
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('REKAP PERMOHONAN LAYANAN', LEBAR / 2, 49, { align: 'center' })
  const lebarJudul = doc.getTextWidth('REKAP PERMOHONAN LAYANAN')
  doc.setLineWidth(0.4)
  doc.line(LEBAR / 2 - lebarJudul / 2, 50.2, LEBAR / 2 + lebarJudul / 2, 50.2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...ABU)
  doc.text('SAPA DINSOS (Sistem Antrean Pelayanan Dinas Sosial Kabupaten Majalengka)', LEBAR / 2, 55.5, { align: 'center' })

  // Keterangan laporan (jenis, periode, pembuat, waktu cetak)
  autoTable(doc, {
    startY: 60,
    theme: 'plain',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9.5, cellPadding: { top: 0.8, bottom: 0.8, left: 0, right: 2 }, textColor: HITAM },
    columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 4 }, 2: { fontStyle: 'bold' } },
    body: [
      ['Jenis laporan', ':', NAMA_JENIS[jenisPeriode] || 'Rentang tanggal'],
      ['Periode', ':', periode],
      ['Dicetak oleh', ':', namaPetugas || '-'],
      ['Waktu cetak', ':', waktuCetak],
    ],
  })
  let y = doc.lastAutoTable.finalY + 8

  // ===== A. RINGKASAN =====
  y = judulBagian(doc, y, 'A. Ringkasan')
  // Kotak-kotak angka utama berdampingan
  const kotak = [
    ['Total Permohonan', angka(t.total), BIRU],
    ['Selesai', `${angka(t.selesai)}  (${persen(t.selesai, t.total)})`, [5, 150, 105]],
    ['Sedang Diproses', angka(t.diproses), [124, 58, 237]],
    ['Menunggu', angka(t.menunggu), [217, 119, 6]],
    ['Batal / Tidak Hadir', angka(t.dibatalkan), [225, 29, 72]],
  ]
  const lebarKotak = (LEBAR - MARGIN * 2 - 4 * 3) / 5
  kotak.forEach(([label, nilai, warna], i) => {
    const x = MARGIN + i * (lebarKotak + 3)
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, lebarKotak, 19, 2, 2, 'FD')
    doc.setFillColor(...warna)
    doc.rect(x, y + 2, 1.2, 15, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...ABU)
    doc.text(label, x + 4, y + 6.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(i === 1 ? 11 : 14)
    doc.setTextColor(...warna)
    doc.text(nilai, x + 4, y + 14.5)
  })
  y += 24
  // Cara pendaftaran (online vs langsung), dijumlah dari semua layanan
  const online = rekap.layanan.reduce((a, l) => a + (l.online || 0), 0)
  const langsung = rekap.layanan.reduce((a, l) => a + (l.langsung || 0), 0)
  const layananTerbanyak = [...rekap.layanan].sort((a, b) => b.total - a.total)[0]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...HITAM)
  doc.text(`Cara pendaftaran: online ${angka(online)} (${persen(online, t.total)}), langsung di kantor ${angka(langsung)} (${persen(langsung, t.total)}).`, MARGIN, y)
  y += 5
  if (layananTerbanyak && layananTerbanyak.total > 0) {
    doc.text(`Layanan paling banyak diminta: ${layananTerbanyak.nama_layanan} (#${layananTerbanyak.kode}) sebanyak ${angka(layananTerbanyak.total)} permohonan.`, MARGIN, y)
    y += 5
  }
  y += 4

  // ===== B. RINCIAN PER JENIS LAYANAN =====
  y = pastikanRuang(doc, y, 40)
  y = judulBagian(doc, y, 'B. Rincian per Jenis Layanan')
  // Urutkan dari total terbanyak, lalu menurut abjad
  const urut = [...rekap.layanan].sort((a, b) => b.total - a.total || a.nama_layanan.localeCompare(b.nama_layanan))
  autoTable(doc, {
    startY: y + 1,
    margin: { left: MARGIN, right: MARGIN },
    head: [['No', 'Kode', 'Jenis Layanan', 'Total', 'Selesai', 'Diproses', 'Menunggu', 'Batal', '% Selesai']],
    body: urut.map((l, i) => [
      i + 1, `#${l.kode}`, l.nama_layanan, angka(l.total), angka(l.selesai), angka(l.diproses),
      angka(l.menunggu), angka(l.dibatalkan), persen(l.selesai, l.total),
    ]),
    foot: [['', '', 'JUMLAH', angka(t.total), angka(t.selesai), angka(t.diproses), angka(t.menunggu), angka(t.dibatalkan), persen(t.selesai, t.total)]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, lineColor: [203, 213, 225], lineWidth: 0.2, textColor: HITAM, valign: 'middle' },
    headStyles: { fillColor: BIRU, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 0.8, right: 0.8 } },
    footStyles: { fillColor: BIRU_MUDA, textColor: HITAM, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      // Lebar kolom (mm) diatur agar judul kolom & kode tidak terpotong ke baris baru
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 29, textColor: BIRU, fontStyle: 'bold', fontSize: 8 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 13 },
      5: { halign: 'center', cellWidth: 15 },
      6: { halign: 'center', cellWidth: 17 },
      7: { halign: 'center', cellWidth: 11 },
      8: { halign: 'center', cellWidth: 16 },
    },
    // Rata tengah untuk angka di baris jumlah
    didParseCell: (d) => {
      if (d.section === 'foot' && d.column.index >= 3) d.cell.styles.halign = 'center'
      // Baris layanan tanpa permohonan dibuat abu-abu agar yang ada isinya lebih menonjol
      if (d.section === 'body' && urut[d.row.index]?.total === 0 && d.column.index !== 1) d.cell.styles.textColor = [148, 163, 184]
    },
  })
  y = doc.lastAutoTable.finalY + 10

  // ===== C. GRAFIK =====
  const adaIsi = urut.filter((l) => l.total > 0)
  y = pastikanRuang(doc, y, 20 + adaIsi.length * 8)
  y = judulBagian(doc, y, 'C. Grafik Jumlah Permohonan per Layanan')
  y += 3
  if (adaIsi.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9.5)
    doc.setTextColor(...ABU)
    doc.text('Belum ada permohonan pada periode ini.', MARGIN, y + 2)
    y += 10
  } else {
    const maks = Math.max(...adaIsi.map((l) => l.total))
    const lebarLabel = 48
    const lebarBatang = LEBAR - MARGIN * 2 - lebarLabel - 16
    adaIsi.forEach((l) => {
      y = pastikanRuang(doc, y, 9)
      // Nama layanan di kiri
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...HITAM)
      doc.text(doc.splitTextToSize(l.nama_layanan, lebarLabel - 2)[0], MARGIN, y + 3.6)
      // Batang: hijau = selesai, ungu = diproses, oranye = menunggu
      const x0 = MARGIN + lebarLabel
      const skala = lebarBatang / maks
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(x0, y, lebarBatang, 5, 1, 1, 'F')
      let x = x0
      ;[['selesai', [16, 185, 129]], ['diproses', [167, 139, 250]], ['menunggu', [251, 191, 36]]].forEach(([k, warna]) => {
        const w = (l[k] || 0) * skala
        if (w > 0) {
          doc.setFillColor(...warna)
          doc.rect(x, y, w, 5, 'F')
          x += w
        }
      })
      // Angka total di ujung kanan batang
      doc.setFont('helvetica', 'bold')
      doc.text(angka(l.total), x0 + lebarBatang + 3, y + 3.8)
      y += 8
    })
    // Keterangan warna batang
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...ABU)
    let xk = MARGIN + lebarLabel
    ;[['Selesai', [16, 185, 129]], ['Diproses', [167, 139, 250]], ['Menunggu', [251, 191, 36]]].forEach(([label, warna]) => {
      doc.setFillColor(...warna)
      doc.rect(xk, y - 2.5, 3, 3, 'F')
      doc.text(label, xk + 4.5, y)
      xk += 24
    })
    y += 8
  }

  // ===== D. CATATAN =====
  y = pastikanRuang(doc, y, 30)
  y = judulBagian(doc, y, 'D. Catatan')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.8)
  doc.setTextColor(...HITAM)
  const catatan = [
    'Satu permohonan = satu nomor antrean yang terdaftar di SAPA DINSOS (daftar online maupun langsung di kantor).',
    '"Total Permohonan" tidak termasuk antrean yang dibatalkan atau pengunjungnya tidak hadir saat dipanggil.',
    '"Menunggu" = belum dipanggil (termasuk yang sudah diverifikasi), "Diproses" = sedang dipanggil/dilayani petugas.',
    'Jenis layanan dicatat sesuai pilihan saat pendaftaran antrean.',
  ]
  catatan.forEach((c, i) => {
    const baris = doc.splitTextToSize(`${i + 1}.  ${c}`, LEBAR - MARGIN * 2 - 4)
    doc.text(baris, MARGIN + 2, y + 1)
    y += baris.length * 4.4 + 0.8
  })
  y += 6

  // ===== TANDA TANGAN =====
  y = pastikanRuang(doc, y, 45)
  const kiri = MARGIN + 25
  const kanan = LEBAR - MARGIN - 35
  doc.setFontSize(9.5)
  doc.setTextColor(...HITAM)
  doc.text(`Majalengka, ${sekarang.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, kanan, y, { align: 'center' })
  y += 5
  doc.text('Dibuat oleh,', kiri, y, { align: 'center' })
  doc.text('Mengetahui,', kanan, y, { align: 'center' })
  y += 4.5
  doc.text('Petugas', kiri, y, { align: 'center' })
  doc.text('Kepala Dinas Sosial', kanan, y, { align: 'center' })
  y += 24
  doc.setFont('helvetica', 'bold')
  doc.text(namaPetugas || '(..............................)', kiri, y, { align: 'center' })
  doc.text('(..............................................)', kanan, y, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text('NIP. ......................................', kanan, y + 5, { align: 'center' })

  // ===== KAKI HALAMAN (setiap halaman) =====
  const jumlahHalaman = doc.getNumberOfPages()
  for (let i = 1; i <= jumlahHalaman; i++) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, TINGGI - 14, LEBAR - MARGIN, TINGGI - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...ABU)
    doc.text(`SAPA DINSOS  •  Rekap Permohonan Layanan  •  ${periode}`, MARGIN, TINGGI - 9.5, { maxWidth: 140 })
    doc.text(`Halaman ${i} dari ${jumlahHalaman}`, LEBAR - MARGIN, TINGGI - 9.5, { align: 'right' })
  }

  // ===== SIMPAN FILE =====
  // Nama file: Rekap-Layanan_2026-11.pdf (bulanan), _2026-11-23.pdf (harian), atau rentang tanggal
  let akhiran = rekap.dari === rekap.sampai ? rekap.dari : `${rekap.dari}_sd_${rekap.sampai}`
  if (jenisPeriode === 'bulan' || jenisPeriode === 'pilih-bulan') akhiran = rekap.dari.slice(0, 7)
  doc.save(`Rekap-Layanan_${akhiran}.pdf`)
}
