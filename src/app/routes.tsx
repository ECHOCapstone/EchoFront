import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';
import Login from './components/Login';
import SignUp from './components/SignUp';
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
import { ProtectedRoute } from './auth/ProtectedRoute';

// 인증이 필요한 라우트는 Component 자체를 ProtectedRoute 로 감싸 한 곳에서 일괄 처리한다.
const guard = (Component: ComponentType) => () => (
  <ProtectedRoute>
    <Component />
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  { path: '/', Component: Login },
  { path: '/signup', Component: SignUp },
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
]);
