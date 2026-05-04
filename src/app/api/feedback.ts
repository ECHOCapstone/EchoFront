import { apiClient } from './client';
import type { Feedback, FeedbackSummary, RetryWordResult, User } from './types';

export type GenerateFeedbackInput = {
  scriptId?: number;
  sessionId?: number;
  recordingIds: number[];
};

export const feedbackApi = {
  generate: (input: GenerateFeedbackInput) =>
    apiClient.post<Feedback>('/api/feedback/generate', { json: input }),
  retryWord: (feedbackId: number, audio: Blob, filename = 'audio.wav') => {
    const form = new FormData();
    form.append('audio', audio, filename);
    return apiClient.post<RetryWordResult>(`/api/feedback/${feedbackId}/retry-word`, { formData: form });
  },
  // 챕터 학습 완료 + EXP/streak 보상 적용. 응답으로 갱신된 사용자 정보를 받는다.
  complete: (feedbackId: number) =>
    apiClient.post<User>(`/api/feedback/${feedbackId}/complete`),
  list: () => apiClient.get<FeedbackSummary[]>('/api/feedbacks'),
  get: (id: number) => apiClient.get<Feedback>(`/api/feedbacks/${id}`),
};
