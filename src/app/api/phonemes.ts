import { apiClient } from './client';
import type { PhonemeArticulation } from './types';

// 음소 조음 안내 공개 조회. 백엔드가 permitAll 로 열어두어 비로그인 화면에서도 쓸 수 있다.
export const phonemesApi = {
  list: () => apiClient.get<PhonemeArticulation[]>('/api/phonemes'),
};
