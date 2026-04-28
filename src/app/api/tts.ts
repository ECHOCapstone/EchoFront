import { apiClient } from './client';

export const ttsApi = {
  // 응답은 audio/mpeg 바이너리. 호출자는 Blob URL 로 변환해 <audio> 에 연결한다.
  synthesize: (text: string, lang: string = 'en') =>
    apiClient.post<Blob>('/api/tts', { json: { text, lang }, expect: 'blob' }),
};
