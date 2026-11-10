import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.BASE_PATH ?? '/hm-compcard/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,wasm,task,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'HM 컴카드 메이커 · HONEY MEDIA',
        short_name: 'HM 컴카드',
        description: '허니미디어 모델 컴카드 자동 제작 프로그램 (오프라인 사용 가능)',
        lang: 'ko',
        start_url: base,
        scope: base,
        id: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#0e0e0e',
        theme_color: '#0e0e0e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: { target: 'es2020', chunkSizeWarningLimit: 2000 },
})
