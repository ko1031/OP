import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/OP/', // リポジトリ名に合わせて設定,
  server: {
    proxy: {
      // カード画像を公式サイトからプロキシ（Refererヘッダーを付与してホットリンク制限を回避）
      '/card-img': {
        target: 'https://www.onepiece-cardgame.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/card-img/, '/images/cardlist/card'),
        headers: {
          referer: 'https://www.onepiece-cardgame.com/cardlist/',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
})
