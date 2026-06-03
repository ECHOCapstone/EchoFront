import { toast } from 'sonner';
import { ApiException } from '../api';

// 백엔드 에러 코드를 사용자 친화 한국어로 변환하는 사전.
// ErrorCode.name 과 동일한 키를 쓰며, 누락된 코드는 백엔드 메시지(또는 fallback)가 그대로 표시된다.
const KOREAN_ERROR_MESSAGES: Record<string, string> = {
  TRACK_HAS_SCRIPTS: '이 트랙에는 스크립트가 있어 삭제할 수 없습니다. 스크립트를 먼저 정리해 주세요.',
  USERNAME_DUPLICATED: '이미 사용 중인 아이디입니다.',
  EMAIL_DUPLICATED: '이미 사용 중인 이메일입니다.',
  INVALID_REQUEST: '요청이 올바르지 않습니다. 입력 값을 확인해 주세요.',
  INVALID_TOKEN: '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.',
  VALIDATION_FAILED: '입력 값을 확인해 주세요.',
  PROMPT_NOT_FOUND: '존재하지 않는 프롬프트입니다.',
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  LOGIN_FAILED: '아이디 또는 비밀번호가 일치하지 않습니다.',
};

// 에러 사용자 알림의 단일 진입점. ApiException 이면 코드에 따른 한국어 매핑을 우선 사용하고,
// 매핑이 없으면 백엔드가 내려준 메시지를, 그 외에는 fallback 메시지를 토스트로 노출한다.
export function notifyApiError(err: unknown, fallback: string): void {
  if (err instanceof ApiException) {
    const localized = KOREAN_ERROR_MESSAGES[err.code];
    toast.error(localized ?? err.message);
    return;
  }
  toast.error(fallback);
}
