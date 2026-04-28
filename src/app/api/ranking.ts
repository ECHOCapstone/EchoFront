import { apiClient } from './client';
import type { Ranking } from './types';

export const rankingApi = {
  today: () => apiClient.get<Ranking>('/api/ranking/today'),
};
