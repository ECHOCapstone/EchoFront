// 통계 화면 출석 캘린더의 연속 출석 단계별 색상 토큰.
// 인덱스 = 연속 출석 일수 (0 = 미출석, 7 이상은 전부 마지막 단계로 묶임).
// 칸의 진하기로 streak 강도를 시각화한다.

export const ATTENDANCE_COLORS = [
  'bg-gray-100',
  'bg-brand-100',
  'bg-brand-200',
  'bg-brand-300',
  'bg-brand-400',
  'bg-brand-500',
  'bg-brand-600',
  'bg-brand-700',
] as const;

// streak 일수에 대응하는 단일 Tailwind 배경 클래스. 음수 / 한도 초과는 안전한 양 끝으로 묶는다.
export function getAttendanceColor(streakDays: number): string {
  return ATTENDANCE_COLORS[Math.min(Math.max(streakDays, 0), ATTENDANCE_COLORS.length - 1)];
}
