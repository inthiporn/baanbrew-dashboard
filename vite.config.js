import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ใช้ path แบบ relative เพื่อให้เปิดได้ทั้งบนเครื่อง และบน GitHub Pages (/baanbrew-dashboard/)
  base: './',
})
