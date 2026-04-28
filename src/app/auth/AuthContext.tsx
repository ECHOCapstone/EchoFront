// 로그인 상태 + 사용자 프로필을 전역에서 공유하는 단일 컨텍스트.
// JWT 는 localStorage 에 보관되며, 새로고침 시 /api/members/me 로 재확인한다.

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ApiException,
  authApi,
  getAccessToken,
  setAccessToken,
  type LoginInput,
  type SignupInput,
  type TokenResponse,
  type User,
} from '../api';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User };

export type AuthContextValue = {
  state: AuthState;
  user: User | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  loginWithGoogleMock: () => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    getAccessToken() ? { status: 'loading' } : { status: 'unauthenticated' }
  );

  const applyToken = useCallback((token: TokenResponse) => {
    setAccessToken(token.accessToken);
    setState({ status: 'authenticated', user: token.user });
    return token.user;
  }, []);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      setState({ status: 'unauthenticated' });
      return;
    }
    try {
      const user = await authApi.me();
      setState({ status: 'authenticated', user });
    } catch (e) {
      // 토큰 만료(401/403) 외에 백엔드 재기동으로 사용자 레코드가 사라진 케이스(404 USER_NOT_FOUND)
      // 도 동일하게 로그아웃 처리한다. 그 외 네트워크/서버 오류는 인증 상태를 그대로 둔다.
      if (e instanceof ApiException) {
        const tokenStale =
          e.status === 401 || e.status === 403 || e.status === 404 || e.code === 'USER_NOT_FOUND';
        if (tokenStale) {
          setAccessToken(null);
          setState({ status: 'unauthenticated' });
          return;
        }
      }
      setState({ status: 'unauthenticated' });
    }
  }, []);

  useEffect(() => {
    if (state.status === 'loading') {
      void refresh();
    }
  }, [state.status, refresh]);

  const login = useCallback<AuthContextValue['login']>(
    async (input) => applyToken(await authApi.login(input)),
    [applyToken]
  );

  const signup = useCallback<AuthContextValue['signup']>(
    async (input) => applyToken(await authApi.signup(input)),
    [applyToken]
  );

  const loginWithGoogleMock = useCallback<AuthContextValue['loginWithGoogleMock']>(
    async () => applyToken(await authApi.mockGoogleLogin()),
    [applyToken]
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    setState({ status: 'unauthenticated' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === 'authenticated' ? state.user : null,
      isAuthenticated: state.status === 'authenticated',
      login,
      signup,
      loginWithGoogleMock,
      logout,
      refresh,
    }),
    [state, login, signup, loginWithGoogleMock, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
