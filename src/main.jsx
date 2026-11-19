// Mengimpor React
import React from 'react'
// Mengimpor ReactDOM untuk menampilkan aplikasi ke halaman
import ReactDOM from 'react-dom/client'
// Komponen utama aplikasi
import App from './App.jsx'
// Penyedia notifikasi (toast) untuk seluruh aplikasi
import { ToastProvider } from './components/ToastProvider'
// Penyedia jendela konfirmasi (pengganti confirm() & prompt() bawaan browser)
import { DialogProvider } from './components/DialogProvider'
// Penangkap error: mencegah layar putih jika ada bagian tampilan yang error
import PenangkapError from './components/PenangkapError'
// Layar pembuka "SAPA DINSOS" yang tampil sebentar saat aplikasi dibuka
import LayarPembuka from './components/LayarPembuka'
// CSS global (Tailwind)
import './index.css'

// Menampilkan aplikasi pada elemen dengan id "root".
// ToastProvider & DialogProvider dipasang di luar App agar notifikasi tetap tampil saat berpindah halaman.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PenangkapError>
      <ToastProvider>
        <DialogProvider>
          <App />
          {/* Layar pembuka tampil di atas aplikasi, lalu menghilang sendiri */}
          <LayarPembuka />
        </DialogProvider>
      </ToastProvider>
    </PenangkapError>
  </React.StrictMode>
)
