// 앱 전역에서 사용되는 라우트 경로의 단일 출처. 컴포넌트는 문자열 리터럴 대신
// 본 객체의 상수만 사용한다. 동적 경로는 함수 형태로 노출한다.
export const paths = {
  login: '/',
  signup: '/signup',
  main: '/main',
  recommendedLearning: '/recommended-learning',
  customLearning: '/custom-learning',
  pronunciationPractice: (scriptId?: number) =>
    scriptId !== undefined ? `/pronunciation-practice?scriptId=${scriptId}` : '/pronunciation-practice',
  sessionDetail: (sessionId: number) => `/session-detail?sessionId=${sessionId}`,
  feedbacks: '/feedbacks',
  stats: '/stats',
  profile: '/profile',
  ranking: '/ranking',
} as const;
