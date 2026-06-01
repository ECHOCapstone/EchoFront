import { env } from '../lib/env';
import { apiClient } from './client';
import type { TokenResponse, User } from './types';

export type SignupInput = {
  username: string;
  password: string;
  nickname: string;
  email: string;
  agreedTerms: boolean;
};

export type LoginInput = { username: string; password: string };

// OAuth2 신규 사용자가 가입 폼을 완료하며 백엔드로 보내는 입력.
// pendingToken 은 OAuth2 SuccessHandler 가 fragment 로 실어 보낸 5분 만료 JWT — 위변조 방지로 그대로 전달.
export type OAuthSignupCompleteInput = {
  pendingToken: string;
  username: string;
  nickname: string;
  agreedTerms: boolean;
};

// 백엔드의 OAuth2 시작 경로. 브라우저를 이 URL 로 navigate 시키면 백엔드가 Google 동의 화면으로 302 redirect 한다.
//
// dev 환경의 컨테이너는 백엔드 8080 포트를 호스트에 노출하지 못해, 호스트 브라우저는 8080 에 직접 가지 못한다.
// 따라서 OAuth 전 흐름을 5173 origin 으로 통일하고 vite proxy 가 /api/* 를 백엔드로 forward 하게 한다.
// 백엔드 application.yaml 의 redirect-uri 도 같은 5173 origin 으로 명시되어 있어 Spring 이 만드는
// Google authorize 요청의 redirect_uri 가 등록값과 일치한다.
export function getGoogleOAuthStartUrl(): string {
  return `${env.apiBaseUrl}/api/auth/oauth2/google/authorization`;
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
  me: () => apiClient.get<User>('/api/members/me'),
  changeNickname: (nickname: string) =>
    apiClient.patch<User>('/api/members/me/nickname', { json: { nickname } }),
};
