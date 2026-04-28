import { apiClient } from './client';
import type { ScriptDetail, ScriptSummary } from './types';

export const scriptsApi = {
  recommendedToday: () => apiClient.get<ScriptSummary[]>('/api/scripts/recommended/today'),
  detail: (scriptId: number) => apiClient.get<ScriptDetail>(`/api/scripts/${scriptId}`),
};
