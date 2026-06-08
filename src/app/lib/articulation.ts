// 음소별 조음 안내(혀 / 입 모양)의 프론트 접근점.
// 음차·설명·이미지는 모두 백엔드 인벤토리(SSOT)에서 받아온다 — GET /api/phonemes.
// 따라서 프론트엔 음소별 하드코딩이 없고, 새 음소나 안내 수정은 백엔드 인벤토리만 고치면 된다.

import { useEffect, useState } from 'react';
import { phonemesApi } from '../api';
import { env } from './env';

// 한 음소의 조음 안내. koreanCue 는 짧은 한글 음차, tip 은 혀·입 모양 설명, imageUrl 은 절대화된 이미지 경로.
export type ArticulationEntry = { koreanCue: string; tip: string; imageUrl: string };

// ARPAbet 음소에서 stress 숫자(0/1/2)를 떼고 대문자로 정규화한다. (AY1 → AY)
export function normalizePhoneme(phoneme: string): string {
  return phoneme.replace(/[0-9]/g, '').trim().toUpperCase();
}

// 백엔드가 주는 상대 imageUrl(/api/phonemes/{p}/image)을 API base 기준으로 절대화한다.
// base 가 비어 있으면(same-origin) 그대로 두고, 절대 URL 이면 손대지 않는다.
function resolveImageUrl(imageUrl: string): string {
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  const base = env.apiBaseUrl.replace(/\/$/, '');
  return `${base}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

// 음소 → 조음 안내 맵을 앱 세션 동안 한 번만 로드해 캐시한다.
// 실패는 캐시하지 않아(아래 catch 에서 cache 를 비움) 다음 진입에서 다시 시도한다.
let cache: Promise<Map<string, ArticulationEntry>> | null = null;
function loadArticulation(): Promise<Map<string, ArticulationEntry>> {
  if (!cache) {
    cache = phonemesApi
      .list()
      .then(
        (list) =>
          new Map(
            list.map((a) => [
              normalizePhoneme(a.phoneme),
              { koreanCue: a.koreanCue, tip: a.tip, imageUrl: resolveImageUrl(a.imageUrl) },
            ])
          )
      )
      .catch((err) => {
        cache = null;
        throw err;
      });
  }
  return cache;
}

// 해당 음소의 조음 안내와 로딩 상태. loading 동안엔 entry 가 null 이며, 로드 후 없으면 계속 null.
export function useArticulation(phoneme: string): { entry: ArticulationEntry | null; loading: boolean } {
  const [entry, setEntry] = useState<ArticulationEntry | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadArticulation()
      .then((map) => {
        if (!active) return;
        setEntry(map.get(normalizePhoneme(phoneme)) ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setEntry(null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [phoneme]);
  return { entry, loading };
}
