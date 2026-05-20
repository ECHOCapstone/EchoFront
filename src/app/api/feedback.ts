import { apiClient } from './client';
import type { Feedback, FeedbackSummary, RetryWordResult, User } from './types';

export type GenerateFeedbackInput = {
  scriptId?: number;
  sessionId?: number;
  recordingIds: number[];
};

// retry-word 호출 옵션. word 가 들어가면 종합 피드백 nextPracticeItems 중 그 항목으로 평가하고,
// 비어 있으면 백엔드가 feedback.practiceWord (또는 폴백 단어) 를 사용한다.
export type RetryWordOptions = {
  filename?: string;
  word?: string;
};

export const feedbackApi = {
  generate: (input: GenerateFeedbackInput) =>
    apiClient.post<Feedback>('/api/feedback/generate', { json: input }),
  retryWord: (feedbackId: number, audio: Blob, options: RetryWordOptions = {}) => {
    const form = new FormData();
    form.append('audio', audio, options.filename ?? 'audio.wav');
    if (options.word != null && options.word !== '') {
      form.append('word', options.word);
    }
    return apiClient.post<RetryWordResult>(`/api/feedback/${feedbackId}/retry-word`, { formData: form });
  },
  // 챕터 학습 완료 + EXP/streak 보상 적용. 응답으로 갱신된 사용자 정보를 받는다.
  complete: (feedbackId: number) =>
    apiClient.post<User>(`/api/feedback/${feedbackId}/complete`),
  list: () => apiClient.get<FeedbackSummary[]>('/api/feedbacks'),
  get: (id: number) => apiClient.get<Feedback>(`/api/feedbacks/${id}`),
};
