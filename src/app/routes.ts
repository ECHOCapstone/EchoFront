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
import Feedbacks from './components/Feedbacks';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Login,
  },
  {
    path: '/signup',
    Component: SignUp,
  },
  {
    path: '/main',
    Component: Main,
  },
  {
    path: '/custom-learning',
    Component: CustomLearning,
  },
  {
    path: '/session-detail',
    Component: SessionDetail,
  },
  {
    path: '/recommended-learning',
    Component: RecommendedLearning,
  },
  {
    path: '/tongue-twister',
    Component: TongueTwister,
  },
  {
    path: '/pronunciation-practice',
    Component: PronunciationPractice,
  },
  {
    path: '/feedbacks',
    Component: Feedbacks,
  },
  {
    path: '/stats',
    Component: Stats,
  },
  {
    path: '/profile',
    Component: Profile,
  },
]);