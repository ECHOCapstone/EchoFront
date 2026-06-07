// 백엔드 OAuth2 실패 핸들러가 ?oauthError=<code> 로 붙이는 식별자를 사용자 친화 한국어로 매핑한다.
// 백엔드와 코드 식별자만 공유하고 메시지는 프론트 SSOT 로 둔다.

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_token: '소셜 로그인 응답에서 토큰을 찾지 못했습니다. 다시 시도해 주세요.',
  session_failed: '소셜 로그인 후 사용자 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
  invalid_user_info: '소셜 계정 정보가 올바르지 않습니다.',
  invalid_email: '소셜 계정 이메일을 확인할 수 없습니다.',
  access_denied: '소셜 로그인 동의가 취소되었습니다.',
};

const OAUTH_FALLBACK_MESSAGE = '소셜 로그인에 실패했습니다.';

export function oauthErrorMessage(code: string | null | undefined): string {
  if (!code) return OAUTH_FALLBACK_MESSAGE;
  return OAUTH_ERROR_MESSAGES[code] ?? OAUTH_FALLBACK_MESSAGE;
}
