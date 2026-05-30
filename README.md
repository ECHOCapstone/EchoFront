# EchoFront

ECHO 발음 학습 앱의 프론트엔드. React 18 + TypeScript + Vite.

## 실행

Node.js 18+ 권장. 백엔드(`ECHO_back`)가 `localhost:8080` 에서 떠 있어야 한다.

```bash
npm install
npm run dev        # Vite 개발 서버 → http://localhost:5173
```

dev 서버는 `/api` 와 `/actuator` 요청을 `vite.config.ts` 의 proxy 로 백엔드(`localhost:8080`)에 전달한다.
브라우저는 같은 origin(5173)으로만 호출하므로 별도 CORS 설정 없이 동작한다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (HMR, 포트 5173 고정) |
| `npm run typecheck` | `tsc --noEmit` 타입 검사 |
| `npm run build` | 타입 검사 + 프로덕션 빌드 (`dist/`) |

## 환경 변수

`.env` 의 `VITE_API_BASE_URL` 로 API 호스트를 지정한다. 비워 두면 same-origin 으로 호출하고,
개발 환경에서는 위 vite proxy 가 백엔드로 전달한다. 운영 빌드에서 다른 호스트를 가리키려면
`.env.production` 등에 절대 URL 을 넣는다.

## 관리자 페이지

`/admin` 은 `ROLE_ADMIN` 계정만 접근할 수 있다. 백엔드 `APP_ADMIN_BOOTSTRAP_USERNAME` 으로
지정한 계정이 부팅 시 관리자로 승격되며, 프로필 화면에 "관리자" 진입 버튼이 나타난다.
콘텐츠(트랙·스크립트·스텝)·LLM 선택·프롬프트·음소 이미지·설정을 탭으로 관리한다.
```
