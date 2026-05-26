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

// 백엔드의 OAuth2 시작 경로. 브라우저를 이 URL 로 navigate 시키면 백엔드가 Google 동의 화면으로 302 redirect 한다.
// env.apiBaseUrl 이 비어있으면 same-origin → vite proxy 가 /api 를 백엔드(8080)로 전달한다.
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
  me: () => apiClient.get<User>('/api/members/me'),
  changeNickname: (nickname: string) =>
    apiClient.patch<User>('/api/members/me/nickname', { json: { nickname } }),
};
