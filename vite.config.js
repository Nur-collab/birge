import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            registerType: 'autoUpdate',
            injectManifest: {
                // Избегаем кеширования больших ассетов
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
            },
            includeAssets: ['favicon.ico', 'apple-touch-icon.svg', 'mask-icon.svg'],
            manifest: {
                name: 'БИРГЕ — Попутные поездки',
                short_name: 'БИРГЕ',
                description: 'Твой сосед — твой попутчик. Карпулинг в Бишкеке.',
                theme_color: '#10b981',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'pwa-icon.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml'
                    },
                    {
                        src: 'pwa-icon.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml'
                    },
                    {
                        src: 'mask-icon.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ]
})
