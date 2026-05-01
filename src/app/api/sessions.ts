import { apiClient } from './client';
import type { Session } from './types';

// PATCH 요청은 부분 갱신이라 모든 필드가 옵셔널이다.
// favorite 는 boolean 으로 명시 전달해 토글 의도를 분명히 한다.
type SessionUpdatePatch = {
  title?: string;
  scriptText?: string;
  favorite?: boolean;
};

export const sessionsApi = {
  list: () => apiClient.get<Session[]>('/api/sessions'),
  create: (title: string) => apiClient.post<Session>('/api/sessions', { json: { title } }),
  get: (id: number) => apiClient.get<Session>(`/api/sessions/${id}`),
  update: (id: number, patch: SessionUpdatePatch) =>
    apiClient.patch<Session>(`/api/sessions/${id}`, { json: patch }),
  delete: (id: number) => apiClient.delete<void>(`/api/sessions/${id}`),
};
