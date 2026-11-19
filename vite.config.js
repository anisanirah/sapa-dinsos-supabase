// ========================================
// FILE: vite.config.js
// DESKRIPSI: Pengaturan Vite (server pengembangan React).
// ========================================

// defineConfig = pembantu agar pengaturan Vite terbaca dengan rapi
import { defineConfig } from 'vite'
// Plugin React untuk Vite
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Aktifkan dukungan React (JSX, fast refresh)
  plugins: [react()],
  server: {
    // host: true = aplikasi juga bisa dibuka dari HP / komputer lain di jaringan WiFi yang sama
    // (alamatnya muncul di terminal sebagai "Network: http://192.168.x.x:5173")
    host: true,
    // Port tetap 5173 (alamat ini juga didaftarkan di Supabase > Authentication > URL Configuration)
    port: 5173,
  },
  // Siapkan semua library sejak Vite dinyalakan, agar halaman tidak macet/putih
  // saat pertama kali membuka halaman baru (misalnya dashboard setelah login)
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', '@supabase/supabase-js', 'lucide-react', 'qrcode.react', 'html5-qrcode'],
  },
})
