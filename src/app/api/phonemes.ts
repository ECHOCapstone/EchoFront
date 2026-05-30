import { apiClient } from './client';
import type { PhonemeAsset } from './types';

// 음소 조음 이미지 공개 조회. 백엔드가 permitAll 로 열어두어 비로그인 화면에서도 쓸 수 있다.
export const phonemesApi = {
  list: () => apiClient.get<PhonemeAsset[]>('/api/phonemes'),
};
