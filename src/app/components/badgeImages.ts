// 어드민에서 정의한 배지(id) 별 일러스트 매핑.
// 매핑에 없는 id 는 Stats 화면이 기본 Award 아이콘으로 폴백한다.
// 새 배지를 추가하려면 (1) 어드민에서 배지를 만들고, (2) 여기 매핑에 한 줄 추가.

// FEEDBACK (종합 피드백 완료)
import boo12_1 from '@/assets/boo-pic/BOO12-1.png';   // FIRST_FEEDBACK
import boo15_1 from '@/assets/boo-pic/BOO15-1.png';   // 15_FEEDBACK
import boo11_1 from '@/assets/boo-pic/BOO11-1.png';   // 30_FEEDBACK

// RECORDING (녹음 시도)
import boo2_1 from '@/assets/boo-pic/BOO2-1.png';     // FIRST_RECORDING
import boo10_1 from '@/assets/boo-pic/BOO10-1.png';   // 30_RECORDING
import boo13_1 from '@/assets/boo-pic/BOO13-1.png';   // 80_RECORDING

// TRACK (트랙 완주)
import boo21_1 from '@/assets/boo-pic/BOO21-1.png';   // FIRST_TRACK
import boo19_1 from '@/assets/boo-pic/BOO19-1.png';   // 3_TRACK
import boo7_1 from '@/assets/boo-pic/BOO7-1.png';     // 5_TRACK

// STREAK (연속 학습)
import boo3_1 from '@/assets/boo-pic/BOO3-1.png';     // 3_STREAK
import boo1_1 from '@/assets/boo-pic/BOO1-1.png';     // 7_STREAK
import boo18_1 from '@/assets/boo-pic/BOO18-1.png';   // 30_STREAK

// EXP (누적 EXP)
import boo4_1 from '@/assets/boo-pic/BOO4-1.png';     // 100_EXP
import boo16_1 from '@/assets/boo-pic/BOO16-1.png';   // 200_EXP
import boo14_1 from '@/assets/boo-pic/BOO14-1.png';   // 500_EXP

export const badgeImageMap: Record<string, string> = {
  // FEEDBACK
  FIRST_FEEDBACK: boo12_1,
  '15_FEEDBACK': boo15_1,
  '30_FEEDBACK': boo11_1,
  // RECORDING
  FIRST_RECORDING: boo2_1,
  '30_RECORDING': boo10_1,
  '80_RECORDING': boo13_1,
  // TRACK
  FIRST_TRACK: boo21_1,
  '3_TRACK': boo19_1,
  '5_TRACK': boo7_1,
  // STREAK
  '3_STREAK': boo3_1,
  '7_STREAK': boo1_1,
  '30_STREAK': boo18_1,
  // EXP
  '100_EXP': boo4_1,
  '200_EXP': boo16_1,
  '500_EXP': boo14_1,
};

export function getBadgeImage(badgeId: string): string | undefined {
  return badgeImageMap[badgeId];
}
