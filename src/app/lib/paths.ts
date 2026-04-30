// 앱 전역에서 사용되는 라우트 경로의 단일 출처. 컴포넌트는 문자열 리터럴 대신
// 본 객체의 상수만 사용한다. 동적 경로는 함수 형태로 노출한다.
//
// pronunciationPractice 는 두 모드를 동시에 지원한다.
//   - 단일 챕터 진입: { scriptId } 만 지정 (트랙 컨텍스트 없이 학습)
//   - 트랙 진행 모드: { scriptId, trackId, chapterIndex } 지정 (한 챕터 종료 시 다음 챕터로 자연스럽게 진행)
type PracticeQuery = {
  scriptId: number;
  trackId?: number;
  chapterIndex?: number;
};

function buildPracticePath({ scriptId, trackId, chapterIndex }: PracticeQuery): string {
  const params = new URLSearchParams();
  params.set('scriptId', String(scriptId));
  if (trackId !== undefined) params.set('trackId', String(trackId));
  if (chapterIndex !== undefined) params.set('chapterIndex', String(chapterIndex));
  return `/pronunciation-practice?${params.toString()}`;
}

export const paths = {
  login: '/',
  signup: '/signup',
  main: '/main',
  tracks: '/tracks',
  trackOverview: (trackId: number) => `/tracks/${trackId}`,
  customLearning: '/custom-learning',
  pronunciationPractice: buildPracticePath,
  sessionDetail: (sessionId: number) => `/session-detail?sessionId=${sessionId}`,
  feedbacks: '/feedbacks',
  stats: '/stats',
  profile: '/profile',
  ranking: '/ranking',
} as const;
