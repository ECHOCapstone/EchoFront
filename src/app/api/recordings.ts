import { apiClient } from './client';
import type { RecordingResult } from './types';

export type RecordingUploadInput = {
  audio: Blob;
  filename?: string;
  scriptId?: number;
  sessionId?: number;
  stepId?: number;
};

export const recordingsApi = {
  upload: (input: RecordingUploadInput) => {
    const form = new FormData();
    form.append('audio', input.audio, input.filename ?? 'audio.webm');
    if (input.scriptId !== undefined) form.append('scriptId', String(input.scriptId));
    if (input.sessionId !== undefined) form.append('sessionId', String(input.sessionId));
    if (input.stepId !== undefined) form.append('stepId', String(input.stepId));
    return apiClient.post<RecordingResult>('/api/recordings', { formData: form });
  },
};
