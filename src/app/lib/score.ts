// 발음 점수(0~100)의 시각 표현 정책을 한곳에 모은다.
// 합격선의 SSOT 는 백엔드(app.gamification.pass-threshold) 이며, 프론트는 백엔드가
// 점수와 함께 내려준 passThreshold 를 그대로 쓴다. 아래 상수들은 그 값이 누락됐을 때의
// 폴백과, 시각화 정책 (4 tier 색·헤드라인) 의 임계값일 뿐이다.

// 백엔드가 합격선을 내려주지 못한 경우의 폴백 합격선. 백엔드 SSOT 와 같은 값으로 맞춰 두어
// 응답 누락 시에도 시각이 어긋나지 않게 한다 (app.gamification.pass-threshold = 75).
export const PASS_THRESHOLD_FALLBACK = 75;

// 합격선을 통과한 점수 중 "우수" 로 강조할 임계. great tier 의 입구.
// 백엔드 정책이 아닌 시각화 임계라 FE 에 둔다. 합격선과 같은 값으로 두면 통과 = 우수 = 초록 + 효과음이 되어,
// 학습자가 통과 시 즉시 확실한 보상 신호를 받는다.
export const EXCELLENCE_THRESHOLD = 75;

// 합격선 미만에서 "보통(주황)" 과 "낮음(빨강)" 을 가르는 비율 — passThreshold × 이 비율 미만이면 poor.
// 합격선 80 기준 50 점 근처가 경계가 된다.
export const POOR_RATIO = 0.625;

// 점수의 시각 등급. 색 토큰·헤드라인·효과음 분기의 단일 키.
export type ScoreTier = 'poor' | 'fair' | 'good' | 'great';

// 점수와 합격선·통과 신호로부터 tier 를 도출한다.
//   점수 임계 통과 (score >= passThreshold) 가 SSOT — passed 신호와 무관하게 항상 통과 tier 로 끌어올린다.
//   합격선 미만이면 백엔드 passed 신호 또는 점수 단독으로 fair / poor 를 가른다.
// 백엔드가 점수와 다른 정성 판정으로 passed=false 를 보내도 점수가 충분하면 학습자에게는 통과로 보인다.
export function scoreTier(input: {
  score: number;
  passThreshold: number;
  passed?: boolean;
}): ScoreTier {
  const { score, passThreshold, passed } = input;
  if (score >= passThreshold) {
    return score >= EXCELLENCE_THRESHOLD ? 'great' : 'good';
  }
  // 점수 미달 — 정성 판정으로 통과를 받은 케이스 (점수는 낮은데 LLM 이 통과로 본 경우) 는 good 으로 처리한다.
  if (passed === true) {
    return 'good';
  }
  if (score >= passThreshold * POOR_RATIO) return 'fair';
  return 'poor';
}

// tier 에 대응하는 Tailwind 색 토큰. 점수가 노출되는 모든 화면이 같은 팔레트를 쓰도록 묶어 둔다.
//   text       : 헤드라인 텍스트
//   textStrong : 점수 숫자 등 가장 큰 강조
//   bar        : 점수 게이지 채움
//   bg         : 카드/박스 약한 배경 강조
//   iconBg     : 아이콘 원형 배경
//   iconFg     : 아이콘 자체 색
export interface TierTokens {
  text: string;
  textStrong: string;
  bar: string;
  bg: string;
  iconBg: string;
  iconFg: string;
}

export const TIER_TOKENS: Record<ScoreTier, TierTokens> = {
  poor: {
    text: 'text-red-600',
    textStrong: 'text-red-600',
    bar: 'bg-red-500',
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconFg: 'text-red-500',
  },
  fair: {
    text: 'text-orange-600',
    textStrong: 'text-orange-600',
    bar: 'bg-orange-400',
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    iconFg: 'text-orange-500',
  },
  good: {
    text: 'text-brand-700',
    textStrong: 'text-brand-600',
    bar: 'bg-brand-500',
    bg: 'bg-brand-50',
    iconBg: 'bg-brand-100',
    iconFg: 'text-brand-600',
  },
  great: {
    text: 'text-green-700',
    textStrong: 'text-green-600',
    bar: 'bg-green-500',
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconFg: 'text-green-600',
  },
};

// 정확도 점수에 대응하는 단일 Tailwind 텍스트 색 클래스. 통과 신호가 없는 화면 (종합 피드백 첫 줄 등) 용.
// 새 코드는 scoreTier + TIER_TOKENS 직접 호출을 권장한다.
export function accuracyColorClass(accuracy: number): string {
  return TIER_TOKENS[scoreTier({ score: accuracy, passThreshold: PASS_THRESHOLD_FALLBACK })].textStrong;
}
