import { apiClient } from './client';

// 챕터 / 세션 학습 진행 상태 응답. exists=false 이면 처음 진입한 단위, lastCompletedIndex 는 -1.
// exists=true 이면 lastCompletedIndex + 1 부터 학습을 재개할 수 있다.
export type Progress = {
  exists: boolean;
  lastCompletedIndex: number;
};

// 챕터 / 세션 진행 상태 단일 진입점. 두 도메인 모두 같은 패턴이라 함수만 분리한다.
export const progressApi = {
  chapter: {
    get: (scriptId: number) =>
      apiClient.get<Progress>(`/api/scripts/${scriptId}/progress`),
    advance: (scriptId: number, index: number) =>
      apiClient.post<Progress>(`/api/scripts/${scriptId}/progress/advance`, { json: { index } }),
    reset: (scriptId: number) =>
      apiClient.delete<void>(`/api/scripts/${scriptId}/progress`),
  },
  session: {
    get: (sessionId: number) =>
      apiClient.get<Progress>(`/api/sessions/${sessionId}/progress`),
    advance: (sessionId: number, index: number) =>
      apiClient.post<Progress>(`/api/sessions/${sessionId}/progress/advance`, { json: { index } }),
    reset: (sessionId: number) =>
      apiClient.delete<void>(`/api/sessions/${sessionId}/progress`),
  },
};
