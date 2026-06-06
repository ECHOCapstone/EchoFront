import { apiClient } from './client';
import type { Ranking } from './types';

// 주간 발음 정확도 랭킹 단일 진입점. 윈도 일수 / Top N / 임계 등 정책은 백엔드 RuntimeSettings 가 결정한다.
export const rankingApi = {
  weekly: () => apiClient.get<Ranking>('/api/ranking/weekly'),
};
