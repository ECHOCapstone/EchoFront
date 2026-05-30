import { apiClient } from './client';
import type { Difficulty, LlmConfig, ScriptDetail, ScriptSummary, TrackSummary } from './types';

// 트랙 생성/수정 입력. displayOrder 는 목록 정렬 순서.
export type TrackInput = {
  title: string;
  description: string;
  displayOrder: number;
};

// 스크립트 한 단계. RECORD 는 targetText 가 필수.
export type AdminStepInput = {
  kind: 'INTRO' | 'RECORD';
  prompt: string;
  targetText?: string;
};

// 스크립트 생성 입력. trackId 의 마지막 챕터 뒤에 추가된다 (chapterOrder 는 백엔드가 자동 부여).
export type ScriptCreateInput = {
  trackId: number;
  title: string;
  content: string;
  difficulty?: Difficulty;
  practiceWord?: string;
  masteryBadgeName?: string;
  steps: AdminStepInput[];
};

// 스크립트 수정 입력 (trackId 제외, 나머지는 생성과 동일).
export type ScriptUpdateInput = Omit<ScriptCreateInput, 'trackId'>;

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

  listScripts: (trackId: number) =>
    apiClient.get<ScriptSummary[]>('/api/admin/scripts', { query: { trackId } }),
  getScript: (id: number) => apiClient.get<ScriptDetail>(`/api/admin/scripts/${id}`),
  createScript: (input: ScriptCreateInput) =>
    apiClient.post<ScriptDetail>('/api/admin/scripts', { json: input }),
  updateScript: (id: number, input: ScriptUpdateInput) =>
    apiClient.put<ScriptDetail>(`/api/admin/scripts/${id}`, { json: input }),
  deleteScript: (id: number) => apiClient.delete<void>(`/api/admin/scripts/${id}`),
};
