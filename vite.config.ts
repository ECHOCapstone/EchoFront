import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// dev 서버가 /api·/actuator 를 넘겨줄 백엔드 주소. 호스트가 localhost 가 아닌 환경(WSL, 원격 백엔드)을
// 위해 환경변수로 덮어쓸 수 있게 한다. prod 빌드는 이 프록시를 쓰지 않고 VITE_API_BASE_URL 을 쓴다.
const DEV_PROXY_TARGET = process.env.VITE_DEV_PROXY_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Cloudflare Tunnel(*.trycloudflare.com 등) 으로 외부 노출할 때 Vite 가 Host 헤더를 검증해
    // 차단하지 않도록 모든 호스트를 허용한다. 시연/데모용 — 정식 운영에선 도메인을 명시할 것.
    allowedHosts: true,
    // 브라우저(Windows) 와 백엔드(Linux/WSL) 의 호스트가 달라도 같은 origin 으로 호출되도록
    // /api 와 /actuator 를 vite dev 서버가 mock 백엔드로 프록시한다.
    proxy: {
      '/api': {
        target: DEV_PROXY_TARGET,
        changeOrigin: false,
      },
      '/actuator': {
        target: DEV_PROXY_TARGET,
        changeOrigin: false,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
