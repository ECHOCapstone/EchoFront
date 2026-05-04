import { apiClient } from './client';
import type { RecordingResult } from './types';

// 한 번의 녹음 업로드 입력. scriptId / sessionId 중 정확히 하나가 필수다.
//   - 추천 학습: { scriptId, stepId, audio } — stepId 는 LearningStep.id
//   - 맞춤 학습: { sessionId, sessionSentenceId, audio } — 한 문장 단위 학습
// useRecorder 가 항상 16-bit PCM WAV 로 변환해 넘기므로 default 도 audio.wav 로 둔다.
export type RecordingUploadInput = {
  audio: Blob;
  filename?: string;
  scriptId?: number;
  sessionId?: number;
  stepId?: number;
  sessionSentenceId?: number;
};

export const recordingsApi = {
  upload: (input: RecordingUploadInput) => {
    const form = new FormData();
    form.append('audio', input.audio, input.filename ?? 'audio.wav');
    // null 과 undefined 둘 다 차단해 백엔드 @RequestParam Long 변환에서 "null" 문자열 에러를 막는다.
    if (input.scriptId != null) form.append('scriptId', String(input.scriptId));
    if (input.sessionId != null) form.append('sessionId', String(input.sessionId));
    if (input.stepId != null) form.append('stepId', String(input.stepId));
    if (input.sessionSentenceId != null) form.append('sessionSentenceId', String(input.sessionSentenceId));
    return apiClient.post<RecordingResult>('/api/recordings', { formData: form });
  },
};
