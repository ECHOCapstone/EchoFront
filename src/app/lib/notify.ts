import { ApiException } from '../api';

// 에러 사용자 알림의 단일 진입점. ApiException 이면 백엔드가 내려준 메시지를,
// 그 외에는 fallback 메시지를 사용한다. 추후 toast 라이브러리로 교체할 때
// 이 파일만 수정하면 모든 호출자가 자동 반영된다.
export function notifyApiError(err: unknown, fallback: string): void {
  const message = err instanceof ApiException ? err.message : fallback;
  // eslint-disable-next-line no-alert
  alert(message);
}
