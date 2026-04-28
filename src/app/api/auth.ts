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

export const authApi = {
  signup: (input: SignupInput) =>
    apiClient.post<TokenResponse>('/api/auth/signup', { json: input }),
  login: (input: LoginInput) =>
    apiClient.post<TokenResponse>('/api/auth/login', { json: input }),
  checkUsername: (value: string) =>
    apiClient.post<{ available: boolean }>('/api/auth/check-username', { json: { value } }),
  checkEmail: (value: string) =>
    apiClient.post<{ available: boolean }>('/api/auth/check-email', { json: { value } }),
  mockGoogleLogin: () => apiClient.get<TokenResponse>('/api/auth/oauth2/google/mock'),
  me: () => apiClient.get<User>('/api/members/me'),
};
