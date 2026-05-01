import { apiClient } from './client';
import type { Stats } from './types';

export const statsApi = {
  // year/month 미지정 시 백엔드가 오늘이 속한 월의 출석을 반환한다.
  // 명시하면 해당 월의 출석으로 한정해서 캘린더를 그릴 수 있다.
  me: (params?: { year: number; month: number }) =>
    apiClient.get<Stats>('/api/stats/me', {
      query: params ? { year: params.year, month: params.month } : undefined,
    }),
};
