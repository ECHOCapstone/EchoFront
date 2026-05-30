import { toast } from 'sonner';
import { ApiException } from '../api';

// 에러 사용자 알림의 단일 진입점. ApiException 이면 백엔드가 내려준 메시지를,
// 그 외에는 fallback 메시지를 토스트로 노출한다. 토스트 표면은 App 의 <Toaster> 가 담당한다.
export function notifyApiError(err: unknown, fallback: string): void {
  const message = err instanceof ApiException ? err.message : fallback;
  toast.error(message);
}
