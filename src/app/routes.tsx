import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Main from './components/Main';
import Stats from './components/Stats';
import Profile from './components/Profile';
import CustomLearning from './components/CustomLearning';
import SessionDetail from './components/SessionDetail';
import RecommendedLearning from './components/RecommendedLearning';
import TongueTwister from './components/TongueTwister';
import PronunciationPractice from './components/PronunciationPractice';
import PronunciationPracticeVB from './components/PronunciationPracticeVB';
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
  { path: '/custom-learning', Component: guard(CustomLearning) },
  { path: '/session-detail', Component: guard(SessionDetail) },
  { path: '/recommended-learning', Component: guard(RecommendedLearning) },
  { path: '/tongue-twister', Component: guard(TongueTwister) },
  { path: '/pronunciation-practice', Component: guard(PronunciationPractice) },
  { path: '/pronunciation-practice-vb', Component: guard(PronunciationPracticeVB) },
  { path: '/feedbacks', Component: guard(Feedbacks) },
  { path: '/stats', Component: guard(Stats) },
  { path: '/profile', Component: guard(Profile) },
  { path: '/ranking', Component: guard(Ranking) },
]);
