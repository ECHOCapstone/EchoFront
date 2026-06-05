// 발음 점수(0~100)의 표시 기준값과 색상 매핑을 한곳에 모은다.
// 합격선의 SSOT 는 백엔드(app.gamification.pass-threshold)이며, 프론트는 백엔드가
// 점수와 함께 내려준 passThreshold 를 그대로 쓴다. 아래 상수들은 그 값이 누락됐을 때의
// 폴백과, 순수 표시용(색상) 구간 기준일 뿐이다.

// 백엔드가 합격선을 내려주지 못한 경우의 폴백 합격선.
export const PASS_THRESHOLD_FALLBACK = 80;

// 정확도 색상 구간 경계. GOOD 이상은 합격(브랜드색), FAIR 이상은 주의(주황), 그 미만은 경고(빨강).
const ACCURACY_GOOD = 80;
const ACCURACY_FAIR = 60;

// 정확도 점수에 대응하는 Tailwind 텍스트 색 클래스. 낮은 점수에 합격색을 주지 않도록 구간을 나눈다.
export function accuracyColorClass(accuracy: number): string {
  if (accuracy >= ACCURACY_GOOD) return 'text-brand-600';
  if (accuracy >= ACCURACY_FAIR) return 'text-amber-500';
  return 'text-red-500';
}
