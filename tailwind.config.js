// FILE: tailwind.config.js
// DESKRIPSI: Pengaturan Tailwind CSS (kelas gaya siap pakai), termasuk file yang dipindai.
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dinsos: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',  // Warna utama DINSOS
          800: '#1565c0',
          900: '#0d47a1',
        },
      },
    },
  },
  plugins: [],
}