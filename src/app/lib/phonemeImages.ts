// 음소 → 조음 이미지 URL 맵을 앱 세션 동안 한 번만 로드해 캐시한다.
// 실패 시 빈 맵으로 폴백한다 — 정적 에셋이나 텍스트 가이드로 자연스럽게 떨어진다.

import { phonemesApi } from '../api';

let cache: Promise<Map<string, string>> | null = null;

export function loadPhonemeImages(): Promise<Map<string, string>> {
  if (!cache) {
    cache = phonemesApi
      .list()
      .then((list) => new Map(list.map((asset) => [asset.phoneme, asset.imageUrl])))
      .catch(() => new Map<string, string>());
  }
  return cache;
}
