// 피드백의 음소 정보를 "기본 접힘 + 음소 보기 토글" 로 정리해 보여준다.
//
// 음소들이 한 줄로 쭉 떠서 혼란스럽다는 피드백을 반영해, 평소엔 버튼만 노출한다.
//   [음소 보기] → canonical 음소를 단어 경계로 잘라 카드로 표시 (틀린 음소·단어 빨강).
//                 각 음소 칩을 누르면 바로 아래에 그 음소의 조음 위치(혀 위치 사진 + 발음 단서)가 펼쳐진다.
// 조음 위치는 음소 칩 클릭으로 자연스럽게 열리므로 별도 버튼을 두지 않는다.

import { useEffect, useMemo, useState } from 'react';
import { ScanText, X } from 'lucide-react';
import type { CanonicalWord, PhonemeError } from '../api';
import { getArticulationGuide, getArticulationImage, normalizePhoneme } from '../lib/articulation';
import { loadPhonemeImages } from '../lib/phonemeImages';

// 관리자가 업로드한 백엔드 음소 이미지 URL. 없으면 null (정적 에셋으로 폴백).
function usePhonemeImageUrl(phoneme: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    loadPhonemeImages().then((map) => {
      if (active) setUrl(map.get(phoneme) ?? null);
    });
    return () => {
      active = false;
    };
  }, [phoneme]);
  return url;
}

interface FeedbackPhonemeSectionProps {
  targetText: string | null;
  canonical: string[];
  perceived: string[];
  errors: PhonemeError[];
  canonicalWords: CanonicalWord[];
}

type IndexedPhoneme = { ph: string; idx: number };
type WordGroup = { word: string; phonemes: IndexedPhoneme[] };

export default function FeedbackPhonemeSection({
  targetText,
  canonical,
  perceived,
  errors,
  canonicalWords,
}: FeedbackPhonemeSectionProps) {
  const [showPhonemes, setShowPhonemes] = useState(false);
  const [selectedPhoneme, setSelectedPhoneme] = useState<string | null>(null);

  // substitution / deletion 으로 틀린 canonical 음소의 전역 인덱스.
  const wrongIdx = useMemo(() => {
    const s = new Set<number>();
    for (const e of errors) {
      if ((e.op === 'substitution' || e.op === 'deletion') && e.canonicalIndex != null) {
        s.add(e.canonicalIndex);
      }
    }
    return s;
  }, [errors]);

  // canonicalWords 가 있으면 단어 경계로, 없으면 전체 음소를 한 묶음으로 폴백.
  // 각 음소에 전역 인덱스를 부여해 wrongIdx 와 매칭한다.
  const groups = useMemo<WordGroup[]>(() => {
    let cursor = 0;
    const source: CanonicalWord[] =
      canonicalWords.length > 0
        ? canonicalWords
        : canonical.length > 0
          ? [{ word: targetText ?? '', phonemes: canonical }]
          : [];
    return source.map((cw) => ({
      word: cw.word,
      phonemes: cw.phonemes.map((ph) => ({ ph, idx: cursor++ })),
    }));
  }, [canonicalWords, canonical, targetText]);

  if (groups.length === 0 && perceived.length === 0 && (!targetText || !targetText.trim())) {
    return null;
  }

  const togglePhonemes = () => {
    setShowPhonemes((v) => {
      if (v) setSelectedPhoneme(null); // 접으면 조음 카드도 닫는다.
      return !v;
    });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={togglePhonemes}
        className={`flex items-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border transition-colors ${
          showPhonemes
            ? 'bg-brand-50 border-brand-500 text-brand-700'
            : 'bg-white border-gray-300 text-gray-600 hover:border-brand-500'
        }`}
      >
        <ScanText size={16} />
        <span>음소 보기</span>
      </button>

      {showPhonemes && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-3">
          <div className="flex flex-wrap gap-3">
            {groups.map((g, gi) => {
              const wordHasError = g.phonemes.some((p) => wrongIdx.has(p.idx));
              return (
                <div key={`w-${gi}-${g.word}`} className="flex flex-col gap-1.5">
                  {g.word && (
                    <span
                      className={`text-sm font-bold ${
                        wordHasError
                          ? 'text-red-600 underline decoration-red-400 decoration-2 underline-offset-2'
                          : 'text-gray-900'
                      }`}
                    >
                      {g.word}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {g.phonemes.map(({ ph, idx }) => {
                      const wrong = wrongIdx.has(idx);
                      const active = selectedPhoneme === normalizePhoneme(ph);
                      return (
                        <button
                          key={`ph-${idx}-${ph}`}
                          onClick={() => setSelectedPhoneme(normalizePhoneme(ph))}
                          className={`text-sm font-mono px-1.5 py-0.5 rounded border transition-colors ${
                            wrong
                              ? 'bg-red-100 text-red-600 border-red-300 font-bold'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-brand-500'
                          } ${active ? 'ring-2 ring-brand-500' : ''}`}
                        >
                          {ph}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 내 발음(perceived) 은 단어 경계가 없어 참고용 한 줄로만 노출 */}
          {perceived.length > 0 && (
            <div className="flex items-baseline gap-2 pt-1 border-t border-gray-200">
              <span className="text-xs text-gray-500 flex-shrink-0">내 발음</span>
              <span className="text-xs font-mono text-gray-500 break-all">{perceived.join(' ')}</span>
            </div>
          )}

          {selectedPhoneme ? (
            <ArticulationCard phoneme={selectedPhoneme} onClose={() => setSelectedPhoneme(null)} />
          ) : (
            <p className="text-xs text-gray-400">음소를 누르면 혀 위치를 볼 수 있어요.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ArticulationCard({ phoneme, onClose }: { phoneme: string; onClose: () => void }) {
  // 관리자가 올린 백엔드 이미지를 우선 쓰고, 없으면 번들된 정적 에셋으로 폴백한다.
  const image = usePhonemeImageUrl(phoneme) ?? getArticulationImage(phoneme);
  const guide = getArticulationGuide(phoneme);

  return (
    <div className="rounded-lg bg-brand-50 border border-brand-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold font-mono text-brand-700">{phoneme}</span>
        <button onClick={onClose} className="p-1 hover:bg-white rounded-full" aria-label="닫기">
          <X size={16} className="text-gray-500" />
        </button>
      </div>
      {/* 사진은 있으면 보여주고, 없으면 큰 placeholder 대신 설명만 깔끔하게 노출한다. */}
      {image && (
        <img
          src={image}
          alt={`${phoneme} 조음 위치`}
          className="w-full max-w-xs mx-auto rounded-lg mb-2"
        />
      )}
      {guide ? (
        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-semibold text-gray-900">한글 음차 </span>
            <span className="text-brand-700 font-medium">{guide.koreanCue}</span>
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">{guide.tip}</p>
        </div>
      ) : (
        <p className="text-xs text-gray-400">이 음소의 발음 안내는 준비 중이에요.</p>
      )}
    </div>
  );
}
