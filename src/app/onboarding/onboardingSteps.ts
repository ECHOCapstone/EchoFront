// 온보딩 튜토리얼 스텝 정의의 단일 출처(SSOT).
// 각 스텝은 강조할 화면 요소를 data-tour 속성 선택자로만 가리킨다 — 투어 엔진이 컴포넌트 내부를
// 알 필요 없게 하여(DIP) 화면 코드와 느슨하게 결합한다. 문구를 바꿀 때 이 파일만 고치면 된다.

// 투어 엔진(react-joyride)의 Step 과 구조적으로 호환되는 최소 형태.
export type TourStep = {
  // CSS 선택자. 특정 요소를 가리키거나, 화면 가운데 모달로 띄우려면 'body' 를 쓴다.
  target: string;
  title: string;
  content: string;
  // 미지정 시 엔진 기본값(auto). 'center' 는 요소와 무관한 가운데 모달.
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';
};

// 홈(/main) 진입 시 보여주는 환영 + 주요 입구 안내.
export const HOME_TOUR_STEPS: TourStep[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'ECHO에 오신 걸 환영해요',
    content: '한국인을 위한 영어 발음 코치예요. 어디를 누르면 되는지 1분만 둘러볼게요.',
  },
  {
    target: '[data-tour="tracks"]',
    title: '학습 트랙',
    content: '주제별 트랙을 골라 챕터를 따라가며 차근차근 연습해요.',
  },
  {
    target: '[data-tour="custom"]',
    title: '맞춤 학습',
    content: '원하는 문장을 직접 넣어 연습하고 싶다면 여기로.',
  },
  {
    target: '[data-tour="status"]',
    placement: 'bottom',
    title: '레벨과 출석',
    content: '연습할수록 경험치와 연속 출석이 쌓여 레벨이 올라가요.',
  },
  {
    target: '[data-tour="nav"]',
    placement: 'top',
    title: '메뉴',
    content: '아래에서 오늘의 챌린지, 통계, 프로필로 이동해요. 그럼 시작해 볼까요?',
  },
];

// 첫 발음 연습 화면에서 핵심 루프(녹음 → 채점 → 한국어 피드백)를 안내한다.
// 녹음/피드백 UI 는 진행 단계에 따라 나타났다 사라지므로, 특정 요소 대신 가운데 모달로 설명해
// 어떤 시점에 진입해도 안전하게 노출되도록 한다.
export const PRACTICE_TOUR_STEPS: TourStep[] = [
  {
    target: 'body',
    placement: 'center',
    title: '이렇게 연습해요',
    content: '문장을 듣고 따라 말하면, AI가 발음을 듣고 정답과 비교해 채점해요.',
  },
  {
    target: 'body',
    placement: 'center',
    title: '녹음 버튼',
    content: '마이크 버튼을 누르고 또박또박 따라 말해 보세요. 조용한 곳일수록 좋아요.',
  },
  {
    target: 'body',
    placement: 'center',
    title: '한국어로 알려줘요',
    content: '피드백은 한국어 음소로 알려줘요. 예: rice → 「(으)롸이스」처럼!',
  },
];
