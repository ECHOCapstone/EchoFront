import { apiClient } from './client';
import type { Stats } from './types';

export const statsApi = {
  me: () => apiClient.get<Stats>('/api/stats/me'),
};
