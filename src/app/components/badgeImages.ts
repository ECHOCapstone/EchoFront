// 어드민에서 정의한 배지(id) 별 일러스트 매핑.
// 매핑에 없는 id 는 Stats 화면이 기본 Award 아이콘으로 폴백한다.
// 새 배지를 추가하려면 (1) 어드민에서 배지를 만들고, (2) 여기 매핑에 한 줄 추가.

import boo12_1 from '@/assets/boo-pic/BOO12-1.png';
import boo15_1 from '@/assets/boo-pic/BOO15-1.png';

export const badgeImageMap: Record<string, string> = {
  FIRST_FEEDBACK: boo12_1,
  STREAK_7: boo15_1,
};

export function getBadgeImage(badgeId: string): string | undefined {
  return badgeImageMap[badgeId];
}
