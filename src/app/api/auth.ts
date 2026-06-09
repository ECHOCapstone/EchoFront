import { env } from '../lib/env';
import { apiClient } from './client';
import type { TokenResponse, User } from './types';

// 표준 회원가입 입력. 백엔드 SignupRequest 와 1:1 로 일치한다.
//   agreed*       — 4종 동의 (이용약관 / 개인정보 / 14세 필수, 마케팅 선택).
export type SignupInput = {
  username: string;
  password: string;
  nickname: string;
  email: string;
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  agreedAgeOver14: boolean;
  agreedMarketing: boolean;
};

export type LoginInput = { username: string; password: string };

// OAuth2 신규 사용자가 가입 폼을 완료하며 백엔드로 보내는 입력.
// pendingToken 은 OAuth2 SuccessHandler 가 fragment 로 실어 보낸 5분 만료 JWT — 위변조 방지로 그대로 전달.
// 표준 소셜 온보딩 방식대로 닉네임만 받는다 — 내부 식별용 username 은 백엔드가 (provider, providerUid) 로 자동 생성한다.
export type OAuthSignupCompleteInput = {
  pendingToken: string;
  nickname: string;
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  agreedAgeOver14: boolean;
  agreedMarketing: boolean;
};

// 회원가입 폼이 안내에 쓰는 비밀번호 정책. 백엔드 응답 그대로.
export type PasswordPolicy = {
  minLength: number;
  maxLength: number;
  requireCategories: number;
};

// OAuth 가능 provider 목록. application.yaml 에 client-id 가 채워진 항목만 available=true 로 내려온다.
export type OAuth2ProviderInfo = { id: string; label: string; available: boolean };

// 약관 본문 응답 — bodies 의 키는 'service' / 'privacy' (TermsKind 의 lowercase 이름).
export type TermsResponse = { version: string; bodies: Record<string, string> };

// 백엔드의 OAuth2 시작 경로. 브라우저를 이 URL 로 navigate 시키면 백엔드가 동의 화면으로 302 redirect 한다.
//
// dev 환경의 컨테이너는 백엔드 8080 포트를 호스트에 노출하지 못해, 호스트 브라우저는 8080 에 직접 가지 못한다.
// 따라서 OAuth 전 흐름을 5173 origin 으로 통일하고 vite proxy 가 /api/* 를 백엔드로 forward 하게 한다.
// 백엔드 application.yaml 의 redirect-uri 가 {baseUrl} 패턴을 사용해 incoming request 도메인을 따라가므로
// Cloudflare Tunnel 같은 외부 도메인 뒤에서도 동일하게 동작한다.
export function getOAuth2StartUrl(providerId: string): string {
  return `${env.apiBaseUrl}/api/auth/oauth2/${providerId}/authorization`;
}

// 표준화 이전 호환을 위해 남겨 둔다 — 신규 코드는 getOAuth2StartUrl('google') 사용을 권장.
export function getGoogleOAuthStartUrl(): string {
  return getOAuth2StartUrl('google');
}

export const authApi = {
  signup: (input: SignupInput) =>
    apiClient.post<TokenResponse>('/api/auth/signup', { json: input }),
  login: (input: LoginInput) =>
    apiClient.post<TokenResponse>('/api/auth/login', { json: input }),
  checkUsername: (value: string) =>
    apiClient.post<{ available: boolean }>('/api/auth/check-username', { json: { value } }),
  checkEmail: (value: string) =>
    apiClient.post<{ available: boolean }>('/api/auth/check-email', { json: { value } }),
  completeOAuthSignup: (input: OAuthSignupCompleteInput) =>
    apiClient.post<TokenResponse>('/api/auth/oauth2/signup-complete', { json: input }),
  passwordPolicy: () => apiClient.get<PasswordPolicy>('/api/auth/password-policy'),
  oauthProviders: () =>
    apiClient.get<{ providers: OAuth2ProviderInfo[] }>('/api/auth/oauth2/providers'),
  logout: () => apiClient.post<void>('/api/auth/logout', {}),
  me: () => apiClient.get<User>('/api/members/me'),
  changeNickname: (nickname: string) =>
    apiClient.patch<User>('/api/members/me/nickname', { json: { nickname } }),
  // 온보딩 튜토리얼 완료를 영속한다. 본문은 없으며, 멱등이라 재호출해도 안전하다. 갱신된 사용자를 반환한다.
  completeOnboarding: () => apiClient.patch<User>('/api/members/me/onboarding-completed'),
  // 로그인된 사용자가 자신의 비밀번호를 교체한다 — 현재 비밀번호 확인 + 정책 검증 필요.
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch<void>('/api/members/me/password', {
      json: { currentPassword, newPassword },
    }),
  // 회원 탈퇴. 비밀번호 기반 계정은 currentPassword 를 함께 보낸다 (OAuth 전용은 생략 가능).
  withdraw: (currentPassword?: string) =>
    apiClient.delete<void>('/api/members/me', {
      json: { currentPassword: currentPassword ?? '' },
    }),
};

// 약관 본문 + 버전. 회원가입 화면이 모달을 채울 때 호출한다.
export const legalApi = {
  terms: () => apiClient.get<TermsResponse>('/api/legal/terms'),
};
