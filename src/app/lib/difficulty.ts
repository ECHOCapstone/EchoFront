// 챕터 난이도(Difficulty)의 표시용 메타데이터. 각 트랙 맵 테마(숲/격자/책장)가
// 동일한 한글 라벨과 난이도 점(dot) 개수를 공유하도록 단일 출처로 모은다.
import type { Difficulty } from '../api/types';

// 난이도별 한글 라벨
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
};

// 난이도별 채워지는 별/점 개수 (최대 3개)
export const DIFFICULTY_DOTS: Record<Difficulty, number> = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
};
