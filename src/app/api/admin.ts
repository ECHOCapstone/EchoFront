import { apiClient } from './client';
import type { LlmConfig, TrackSummary } from './types';

// 트랙 생성/수정 입력. displayOrder 는 목록 정렬 순서.
export type TrackInput = {
  title: string;
  description: string;
  displayOrder: number;
};

// 관리자 전용 API. 백엔드가 /api/admin/** 를 ROLE_ADMIN 으로 보호하므로
// 일반 사용자가 호출하면 403 으로 떨어진다.
export const adminApi = {
  getLlmConfig: () => apiClient.get<LlmConfig>('/api/admin/llm'),
  // model 은 provider 가 gemini 일 때만 의미가 있다. rule-based 면 생략한다.
  updateLlmConfig: (provider: string, model?: string) =>
    apiClient.put<LlmConfig>('/api/admin/llm', { json: { provider, model } }),

  listTracks: () => apiClient.get<TrackSummary[]>('/api/admin/tracks'),
  createTrack: (input: TrackInput) =>
    apiClient.post<TrackSummary>('/api/admin/tracks', { json: input }),
  updateTrack: (id: number, input: TrackInput) =>
    apiClient.put<TrackSummary>(`/api/admin/tracks/${id}`, { json: input }),
  deleteTrack: (id: number) => apiClient.delete<void>(`/api/admin/tracks/${id}`),
};
