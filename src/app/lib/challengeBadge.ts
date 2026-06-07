// 챌린지 결과 배지의 시각 메타. 백엔드의 CHALLENGE_GOLD / SILVER / BRONZE 식별자와 1:1 로 매칭된다.
// 지난 챌린지 카드와 등수 미니뷰에서 동일한 색·라벨을 쓰도록 한 곳에서 관리한다.

export interface ChallengeBadgeStyle {
  label: string;
  bg: string;
  text: string;
  iconColor: string;
}

export const BADGE_PRESET: Record<string, ChallengeBadgeStyle> = {
  CHALLENGE_GOLD: { label: '금메달', bg: 'bg-yellow-100', text: 'text-yellow-800', iconColor: 'text-yellow-600' },
  CHALLENGE_SILVER: { label: '은메달', bg: 'bg-gray-100', text: 'text-gray-700', iconColor: 'text-gray-500' },
  CHALLENGE_BRONZE: { label: '동메달', bg: 'bg-orange-100', text: 'text-orange-700', iconColor: 'text-orange-500' },
};
