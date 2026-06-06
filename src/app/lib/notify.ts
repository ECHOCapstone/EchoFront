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
  PASSWORD_TOO_WEAK: '비밀번호가 정책을 충족하지 않습니다. 정책 안내를 확인해 주세요.',
  TERMS_NOT_AGREED: '이용약관에 동의해 주세요.',
  PRIVACY_NOT_AGREED: '개인정보처리방침에 동의해 주세요.',
  AGE_RESTRICTION_NOT_AGREED: '만 14세 이상 확인이 필요합니다.',
};

// 에러 사용자 알림의 단일 진입점. ApiException 이면:
//   1) 백엔드가 ErrorCode 의 default 가 아닌 구체 message 를 같이 내려줬으면 그쪽을 우선 (디버깅·안내에 가장
//      도움 되는 한 줄). 예: "sessionSentenceId is required", "RECORD 단계는 targetText 가 필요합니다".
//   2) 그게 없으면 한국어 매핑 사전을 사용.
//   3) 사전에도 없으면 백엔드 message (있을 때) → fallback 순.
// 구체 메시지를 우선하는 이유: 매핑을 무조건 앞세우면 백엔드가 보낸 교정 안내가 가려진다.
export function notifyApiError(err: unknown, fallback: string): void {
  if (err instanceof ApiException) {
    const localized = KOREAN_ERROR_MESSAGES[err.code];
    const backendMessage = err.message?.trim();
    // 백엔드가 ErrorCode 의 default 가 아닌 구체 message 를 보냈으면 그쪽이 더 유용하다.
    // ErrorCode default 와 일치하지 않거나, 매핑이 아예 없으면 백엔드 message 를 우선.
    const isGenericDefault =
      backendMessage === '잘못된 요청입니다.' || backendMessage === '입력 값을 확인해 주세요.';
    if (backendMessage && !isGenericDefault) {
      toast.error(backendMessage);
      return;
    }
    toast.error(localized ?? backendMessage ?? fallback);
    return;
  }
  toast.error(fallback);
}

// 단순 정보/안내 토스트. 아직 준비되지 않은 기능 안내 등 비-에러 메시지에 사용한다.
export function notifyInfo(message: string): void {
  toast.info(message);
}

// 성공 토스트. 저장·삭제 등 사용자 행동이 정상 완료됐을 때 사용한다.
export function notifySuccess(message: string): void {
  toast.success(message);
}

// 에러 토스트(ApiException 이 아닌 일반 메시지용). API 에러는 notifyApiError 를 쓴다.
export function notifyError(message: string): void {
  toast.error(message);
}
