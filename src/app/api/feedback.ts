import { apiClient } from './client';
import type { Feedback, FeedbackSummary, RetryWordResult } from './types';

export type GenerateFeedbackInput = {
  scriptId?: number;
  sessionId?: number;
  recordingIds: number[];
};

export const feedbackApi = {
  generate: (input: GenerateFeedbackInput) =>
    apiClient.post<Feedback>('/api/feedback/generate', { json: input }),
  retryWord: (feedbackId: number, audio: Blob, filename = 'audio.webm') => {
    const form = new FormData();
    form.append('audio', audio, filename);
    return apiClient.post<RetryWordResult>(`/api/feedback/${feedbackId}/retry-word`, { formData: form });
  },
  list: () => apiClient.get<FeedbackSummary[]>('/api/feedbacks'),
  get: (id: number) => apiClient.get<Feedback>(`/api/feedbacks/${id}`),
};
