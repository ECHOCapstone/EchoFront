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
  // 종합 피드백 생성은 LLM 호출이 길어 사용자가 도중에 이탈할 수 있다 — signal 로 fetch 를 취소해
  // 호출 측이 컴포넌트 unmount 시 진행 중인 요청을 안전하게 끊는다.
  generate: (input: GenerateFeedbackInput, signal?: AbortSignal) =>
    apiClient.post<Feedback>('/api/feedback/generate', { json: input, signal }),
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
