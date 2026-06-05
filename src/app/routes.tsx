import type { ComponentType } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import Login from './components/Login';
import SignUp from './components/SignUp';
import OAuthCallback from './components/OAuthCallback';
import Main from './components/Main';
import Stats from './components/Stats';
import Profile from './components/Profile';
import TrackList from './components/TrackList';
import TrackOverview from './components/TrackOverview';
import CustomLearning from './components/CustomLearning';
import SessionDetail from './components/SessionDetail';
import PronunciationPractice from './components/PronunciationPractice';
import Feedbacks from './components/Feedbacks';
import Ranking from './components/Ranking';
import AdminPage from './components/admin/AdminPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminRoute } from './auth/AdminRoute';

// 인증이 필요한 라우트는 Component 자체를 ProtectedRoute 로 감싸 한 곳에서 일괄 처리한다.
const guard = (Component: ComponentType) => () => (
  <ProtectedRoute>
    <Component />
  </ProtectedRoute>
);

// 관리자 전용 라우트는 AdminRoute 로 감싼다.
const adminGuard = (Component: ComponentType) => () => (
  <AdminRoute>
    <Component />
  </AdminRoute>
);

// 모든 라우트를 하나의 부모 라우트 아래에 묶어 errorElement 를 공유한다.
// 라우트 컴포넌트에서 던져진 렌더 예외는 이 RouteErrorBoundary 로 모인다.
export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', Component: Login },
      { path: '/signup', Component: SignUp },
      { path: '/oauth/callback', Component: OAuthCallback },
      { path: '/main', Component: guard(Main) },
      { path: '/tracks', Component: guard(TrackList) },
      { path: '/tracks/:trackId', Component: guard(TrackOverview) },
      { path: '/custom-learning', Component: guard(CustomLearning) },
      { path: '/session-detail', Component: guard(SessionDetail) },
      { path: '/pronunciation-practice', Component: guard(PronunciationPractice) },
      { path: '/feedbacks', Component: guard(Feedbacks) },
      { path: '/stats', Component: guard(Stats) },
      { path: '/profile', Component: guard(Profile) },
      { path: '/ranking', Component: guard(Ranking) },
      { path: '/admin', Component: adminGuard(AdminPage) },
    ],
  },
]);
