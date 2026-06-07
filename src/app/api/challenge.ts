import { apiClient } from './client';
import type {
  AdminChallengeListItem,
  ChallengeAttempt,
  ChallengeCurrent,
  ChallengeHistoryItem,
  ChallengeRanking,
} from './types';

// "오늘의 챌린지" 도메인의 사용자 진입점. 활성 챌린지가 없으면 current 는 null 을 돌려준다.
export const challengeApi = {
  current: () => apiClient.get<ChallengeCurrent | null>('/api/challenges/current'),

  attempt: (audio: Blob, filename = 'attempt.wav') => {
    const form = new FormData();
    form.append('audio', audio, filename);
    return apiClient.post<ChallengeAttempt>('/api/challenges/current/attempts', { formData: form });
  },

  currentRanking: () =>
    apiClient.get<ChallengeRanking>('/api/challenges/current/ranking'),

  rankingForChallenge: (challengeId: number) =>
    apiClient.get<ChallengeRanking>(`/api/challenges/${challengeId}/ranking`),

  history: (limit = 20) =>
    apiClient.get<ChallengeHistoryItem[]>(`/api/challenges/history`, { query: { limit } }),
};

// 어드민 챌린지 관리 진입점. SecurityConfig 가 ROLE_ADMIN 만 통과시킨다.
export const adminChallengeApi = {
  list: (limit = 50) =>
    apiClient.get<AdminChallengeListItem[]>('/api/admin/challenges', { query: { limit } }),

  create: (input: { targetText: string; koreanTranslation?: string; activate: boolean }) =>
    apiClient.post<AdminChallengeListItem>('/api/admin/challenges', { json: input }),

  activate: (challengeId: number) =>
    apiClient.post<AdminChallengeListItem>(`/api/admin/challenges/${challengeId}/activate`),

  deactivate: (challengeId: number) =>
    apiClient.delete<AdminChallengeListItem>(`/api/admin/challenges/${challengeId}/activation`),
};
