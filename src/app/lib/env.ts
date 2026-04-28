// import.meta.env 접근 단일 진입점. 다른 모듈에서 직접 import.meta.env 를 읽지 않는다.
//
// 기본값을 비워 두면 fetch 가 same-origin 으로 호출하고, 개발 환경에서는
// vite proxy 가 /api 를 백엔드(8080) 로 전달한다. 운영 환경에서 다른 호스트를
// 가리키려면 빌드 시 VITE_API_BASE_URL 에 절대 URL 을 지정한다.
const DEFAULT_API_BASE = '';

export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE,
};
