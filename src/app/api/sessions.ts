import { apiClient } from './client';
import type { Session } from './types';

export const sessionsApi = {
  list: () => apiClient.get<Session[]>('/api/sessions'),
  create: (title: string) => apiClient.post<Session>('/api/sessions', { json: { title } }),
  get: (id: number) => apiClient.get<Session>(`/api/sessions/${id}`),
  update: (id: number, patch: { title?: string; scriptText?: string }) =>
    apiClient.patch<Session>(`/api/sessions/${id}`, { json: patch }),
};
