// 관리자(ADMIN)만 접근 가능한 라우트 가드.
// 검증 중에는 빈 화면을, 미인증이면 로그인으로, 인증됐지만 관리자가 아니면 메인으로 돌려보낸다.

import { Navigate, useLocation } from 'react-router';
import { useAuth } from './useAuth';
import { paths } from '../lib/paths';
import type { ReactNode } from 'react';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') {
    return null;
  }
  if (state.status === 'unauthenticated') {
    return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  }
  if (state.user.role !== 'ADMIN') {
    return <Navigate to={paths.main} replace />;
  }
  return <>{children}</>;
}
