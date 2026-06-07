import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage } from 'node:http'

// dev 서버가 /api·/actuator 를 넘겨줄 백엔드 주소. 호스트가 localhost 가 아닌 환경(WSL, 원격 백엔드)을
// 위해 환경변수로 덮어쓸 수 있게 한다. prod 빌드는 이 프록시를 쓰지 않고 VITE_API_BASE_URL 을 쓴다.
const DEV_PROXY_TARGET = process.env.VITE_DEV_PROXY_TARGET ?? 'http://localhost:8080'

// Vite 의 Host 헤더 검증을 통과시킬 호스트 목록.
//   - VITE_DEV_ALLOWED_HOSTS = "*"            → 전체 허용 (운영 노출 시 사용 금지)
//   - VITE_DEV_ALLOWED_HOSTS = "a.dev,b.dev"  → 콤마로 끊어 명시 (선두 점 = 서브도메인 와일드카드)
//   - 미설정                                  → localhost + Cloudflare Tunnel 시연 도메인까지 통과
// 선두 점(.trycloudflare.com) 은 Vite 의 서브도메인 와일드카드 문법이라 매 세션마다 바뀌는
// 트라이클라우드플레어 호스트네임을 별도 설정 없이 받아 준다.
function resolveAllowedHosts(): true | string[] {
  const defaults = ['localhost', '127.0.0.1', '.trycloudflare.com']
  const raw = process.env.VITE_DEV_ALLOWED_HOSTS
  if (!raw || raw.trim() === '') return defaults
  if (raw.trim() === '*') return true
  return raw
    .split(',')
    .map((host) => host.trim())
    .filter((host) => host.length > 0)
}

// X-Forwarded-* 헤더는 콤마로 구분된 multi-value 를 가질 수 있다 (proxy 가 여러 단 거치며 누적).
// Spring 의 ForwardedHeaderFilter 는 첫 토큰만 사용하므로 그 첫 토큰을 추출해 정리한다.
function firstToken(value: string | string[] | undefined): string | null {
  if (!value) return null
  const raw = Array.isArray(value) ? value[0] : value
  const first = raw.split(',')[0]?.trim()
  return first ? first : null
}

// Cloudflare Tunnel → vite → backend 단계에서 외부 도메인/프로토콜이 정확히 전달되도록 X-Forwarded-*
// 를 직접 설정한다. http-proxy 의 xfwd 자동 추가는 vite 의 incoming connection 정보를 따르기 때문에
// Cloudflare 가 보낸 https/443 대신 http/5173 또는 80 같은 잘못된 값을 박을 수 있다 — 그 결과 OAuth
// {baseUrl} 치환이 redirect_uri 에 ":80" 을 붙여 Google 의 redirect_uri_mismatch 를 유발한다.
function applyForwardedHeaders(proxy: { on: (event: string, listener: (...args: unknown[]) => void) => void }) {
  proxy.on('proxyReq', (...args: unknown[]) => {
    const proxyReq = args[0] as { setHeader: (k: string, v: string) => void }
    const req = args[1] as IncomingMessage
    const proto = firstToken(req.headers['x-forwarded-proto']) ?? 'http'
    const host = firstToken(req.headers['x-forwarded-host']) ?? req.headers.host ?? ''
    // 표준 포트 (https=443, http=80) 는 명시하지 않는 게 표준이며, Spring 도 그쪽이 안전하다.
    // X-Forwarded-Port 를 아예 제거해 ForwardedHeaderFilter 가 proto 의 default port 로 합성하게 한다.
    proxyReq.setHeader('X-Forwarded-Proto', proto)
    if (host) proxyReq.setHeader('X-Forwarded-Host', String(host))
    proxyReq.setHeader('X-Forwarded-Port', proto === 'https' ? '443' : '80')
  })
}

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
    // 외부 노출 (Cloudflare Tunnel 등) 시 Vite 가 Host 헤더를 차단하지 않도록 허용 목록을 환경변수로 받는다.
    // 미설정 기본값은 localhost / 127.0.0.1 만 통과 — 운영 안전성을 위해 와일드카드 허용은 명시적으로 켜야 한다.
    allowedHosts: resolveAllowedHosts(),
    // - changeOrigin: 백엔드가 Host 헤더 검증을 통과하도록 target host (localhost:8080) 로 치환.
    // - configure: X-Forwarded-* 를 incoming 헤더 기준으로 직접 정리. xfwd 자동 추가는 잘못된 포트를
    //   박을 수 있어 사용하지 않는다.
    proxy: {
      '/api': {
        target: DEV_PROXY_TARGET,
        changeOrigin: true,
        configure: applyForwardedHeaders,
      },
      '/actuator': {
        target: DEV_PROXY_TARGET,
        changeOrigin: true,
        configure: applyForwardedHeaders,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
