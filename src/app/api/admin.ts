import { apiClient } from './client';
import type {
  Difficulty,
  LlmConfig,
  PhonemeAsset,
  Prompt,
  ScriptDetail,
  ScriptSummary,
  Setting,
  TrackSummary,
} from './types';

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

  listPrompts: () => apiClient.get<Prompt[]>('/api/admin/prompts'),
  // 본문 재정의 (override).
  updatePrompt: (key: string, content: string) =>
    apiClient.put<Prompt>(`/api/admin/prompts/${encodeURIComponent(key)}`, { json: { content } }),
  // classpath 기본값으로 초기화. 응답은 복원된 프롬프트.
  resetPrompt: (key: string) =>
    apiClient.delete<Prompt>(`/api/admin/prompts/${encodeURIComponent(key)}`),

  listPhonemeAssets: () => apiClient.get<PhonemeAsset[]>('/api/admin/phonemes'),
  uploadPhonemeImage: (phoneme: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return apiClient.post<PhonemeAsset>(
      `/api/admin/phonemes/${encodeURIComponent(phoneme)}/image`,
      { formData: form }
    );
  },
  deletePhonemeImage: (phoneme: string) =>
    apiClient.delete<void>(`/api/admin/phonemes/${encodeURIComponent(phoneme)}`),

  listSettings: () => apiClient.get<Setting[]>('/api/admin/settings'),
  // 값 재정의 (override).
  updateSetting: (key: string, value: string) =>
    apiClient.put<Setting>(`/api/admin/settings/${encodeURIComponent(key)}`, { json: { value } }),
  // yaml 기본값으로 초기화. 응답은 복원된 설정.
  resetSetting: (key: string) =>
    apiClient.delete<Setting>(`/api/admin/settings/${encodeURIComponent(key)}`),
};
