// 로그인 상태 + 사용자 프로필을 전역에서 공유하는 단일 컨텍스트.
// JWT 는 메모리 캐시(SSOT) + sessionStorage 백업 조합으로 보관되며 (client.ts 참조),
// 새로고침 시 sessionStorage 에서 복원한 토큰으로 /api/members/me 를 호출해 사용자 정보를 재확인한다.

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
  // OAuth2 콜백 핸들러가 부르는 진입점. 토큰만 받아 me() 로 사용자 정보를 마저 채운다.
  acceptOAuthToken: (accessToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  // 서버가 갱신해 돌려준 사용자로 전역 상태를 교체한다. 인증 상태일 때만 적용된다 (백엔드가 SSOT).
  setUser: (user: User) => void;
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
      // 토큰 만료 (401 / 403) 와 백엔드가 사용자 레코드를 잃은 경우 (USER_NOT_FOUND) 만 토큰을 폐기한다.
      // 일반 404 (예: 게이트웨이 오류 응답) 는 토큰 폐기 사유가 아니다 — 잘못 강제 로그아웃되는 회귀를 막는다.
      // 그 외 네트워크/서버 오류는 토큰을 남겨 두어 재시도 시 복구 가능하게 한다.
      if (e instanceof ApiException) {
        const tokenStale =
          e.status === 401 || e.status === 403 || e.code === 'USER_NOT_FOUND';
        if (tokenStale) {
          setAccessToken(null);
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

  // OAuth2 콜백은 access token 만 fragment 로 받으므로 me() 로 사용자 정보를 별도 조회한다.
  // 토큰을 먼저 저장해야 me() 가 Authorization 헤더를 채울 수 있다.
  const acceptOAuthToken = useCallback<AuthContextValue['acceptOAuthToken']>(
    async (accessToken) => {
      setAccessToken(accessToken);
      const user = await authApi.me();
      setState({ status: 'authenticated', user });
      return user;
    },
    []
  );

  // 백엔드의 표준 로그아웃 엔드포인트를 한 번 부른 뒤 로컬 토큰을 폐기한다.
  // stateless JWT 라 서버 응답이 실패하더라도 로컬 상태는 그대로 비워야 사용자가 로그아웃된 것으로 보인다.
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // 네트워크/서버 오류는 무시 — 로그아웃은 사용자 경험상 항상 성공이어야 한다.
    }
    setAccessToken(null);
    setState({ status: 'unauthenticated' });
  }, []);

  const setUser = useCallback<AuthContextValue['setUser']>((user) => {
    setState((prev) =>
      prev.status === 'authenticated' ? { status: 'authenticated', user } : prev
    );
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === 'authenticated' ? state.user : null,
      isAuthenticated: state.status === 'authenticated',
      login,
      signup,
      acceptOAuthToken,
      logout,
      refresh,
      setUser,
    }),
    [state, login, signup, acceptOAuthToken, logout, refresh, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
