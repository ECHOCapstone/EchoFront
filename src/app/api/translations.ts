import { apiClient } from './client';
import type { TranslationBatchResponse } from './types';

// 영어 원문 묶음을 받아 한 번에 한국어 번역을 받아 온다. 응답 items 는 입력 순서를 유지한다.
// provider 가 noop 으로 떨어졌거나 외부 호출이 실패한 항목은 target 이 빈 문자열로 내려 온다 — FE 는 빈 번역을 그리지 않는다.
export const translationsApi = {
  batch: (texts: string[]) =>
    apiClient.post<TranslationBatchResponse>('/api/translations/batch', { json: { texts } }),
};
