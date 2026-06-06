// 피드백의 음소 정보를 두 층으로 정리해 보여준다.
//   1) 항상 표시 — 단어 한 줄. 어디가 틀린 단어인지 빨강 + 밑줄로 즉시 인지.
//   2) [음소 보기] 토글 — 단어별 음소 칩 + 내 발음 + 조음 위치 카드. 음소 단위로 깊게 보고 싶을 때만.
// 음소 칩이 한꺼번에 풀려서 정보 과부하라는 피드백을 반영한 구조다.

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

// PC(마우스/트랙패드, pointer: fine)면 true. 음소 표가 가로 스크롤됨을 PC 사용자가
// 인지하도록 이 환경에선 scrollbar-hide 를 떼고 스크롤바를 노출한다. 터치는 그대로 숨김.
function usePointerFine(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(pointer: fine)');
    const onChange = () => setFine(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return fine;
}

interface FeedbackPhonemeSectionProps {
  targetText: string | null;
  canonical: string[];
  perceived: string[];
  errors: PhonemeError[];
  canonicalWords: CanonicalWord[];
}

// 한 음소 칸. 정답(ph) 위에 내 발음을 두 줄로 비교하기 위한 매핑 결과를 같이 들고 있다.
//   match        — perceived === ph, 정답·내 발음 동일
//   substitution — perceived !== ph (둘 다 존재)
//   deletion     — perceived === null (내 발음에서 빠짐)
// insertion 은 canonical 인덱스가 없어 위치를 못 박으므로 이 표에는 포함하지 않는다.
type PhonemeCell = {
  ph: string;
  idx: number;
  perceived: string | null;
  isSubstitution: boolean;
  isDeletion: boolean;
};
type WordGroup = { word: string; phonemes: PhonemeCell[] };

export default function FeedbackPhonemeSection({
  targetText,
  canonical,
  perceived,
  errors,
  canonicalWords,
}: FeedbackPhonemeSectionProps) {
  const [showPhonemes, setShowPhonemes] = useState(false);
  const [selectedPhoneme, setSelectedPhoneme] = useState<string | null>(null);
  const pointerFine = usePointerFine();

  // canonicalIndex → 그 위치의 error (substitution / deletion). 정답 vs 내 발음 비교 표 빌딩의 단일 출처.
  const errorByIdx = useMemo(() => {
    const m = new Map<number, (typeof errors)[number]>();
    for (const e of errors) {
      if (e.canonicalIndex != null) m.set(e.canonicalIndex, e);
    }
    return m;
  }, [errors]);

  // canonicalWords 가 있으면 단어 경계로, 없으면 전체 음소를 한 묶음으로 폴백.
  // 각 음소 칸을 errorByIdx 와 합성해 PhonemeCell 로 정규화한다.
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
      phonemes: cw.phonemes.map((ph) => {
        const idx = cursor++;
        const err = errorByIdx.get(idx);
        const isSubstitution = err?.op === 'substitution';
        const isDeletion = err?.op === 'deletion';
        const perceived = isDeletion ? null : isSubstitution ? err?.perceived ?? ph : ph;
        return { ph, idx, perceived, isSubstitution, isDeletion };
      }),
    }));
  }, [canonicalWords, canonical, targetText, errorByIdx]);

  // 단어 라벨 색 / 헤더 줄 빨강 판정에 쓰는 "이 단어가 오류 음소를 포함하는가" set.
  const wrongIdx = useMemo(() => {
    const s = new Set<number>();
    for (const g of groups) {
      for (const c of g.phonemes) {
        if (c.isSubstitution || c.isDeletion) s.add(c.idx);
      }
    }
    return s;
  }, [groups]);

  if (groups.length === 0 && perceived.length === 0 && (!targetText || !targetText.trim())) {
    return null;
  }

  const togglePhonemes = () => {
    setShowPhonemes((v) => {
      if (v) setSelectedPhoneme(null); // 접으면 조음 카드도 닫는다.
      return !v;
    });
  };

  const hasAnyWord = groups.some((g) => g.word);

  return (
    <div className="space-y-2">
      {/* 항상 표시: 단어 단위 정·오답. 틀린 단어를 빨강 + 밑줄로, 맞은 단어는 회색으로 흐리게.
          내부에 대문자가 2개 이상인 단어 (CamelCase 고유명사 등) 는 G2P 추정 발음일 가능성이
          높아 작은 회색 "추정" 배지를 붙여 학습자가 점수 신뢰를 조정할 수 있게 한다. */}
      {hasAnyWord && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 items-baseline">
          {groups.map((g, gi) => {
            if (!g.word) return null;
            const wordHasError = g.phonemes.some((p) => wrongIdx.has(p.idx));
            const looksLikeProperNoun = /[A-Z].*[A-Z]/.test(g.word);
            return (
              <span key={`word-${gi}-${g.word}`} className="inline-flex items-baseline gap-1">
                <span
                  className={`text-sm font-semibold ${
                    wordHasError
                      ? 'text-red-600 underline decoration-red-400 decoration-2 underline-offset-2'
                      : 'text-gray-400'
                  }`}
                >
                  {g.word}
                </span>
                {looksLikeProperNoun && (
                  <span
                    className="text-[10px] font-medium text-gray-400 border border-gray-300 rounded px-1 leading-none py-0.5"
                    title="고유명사로 보여 발음을 추정했어요. 점수가 실제 발음과 다를 수 있어요."
                  >
                    추정
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      <button
        onClick={togglePhonemes}
        className={`flex items-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border transition-colors ${
          showPhonemes
            ? 'bg-brand-50 border-brand-500 text-brand-700'
            : 'bg-white border-gray-300 text-gray-600 hover:border-brand-500'
        }`}
      >
        <ScanText size={16} />
        <span>{showPhonemes ? '닫기' : '자세히 보기'}</span>
      </button>

      {showPhonemes && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-3">
          {/* 단어 한 개당 한 row 로 분리. 한 단어가 모바일 폭을 넘어도 같은 단어의 두 줄(정답/내 발음)이
              항상 인접해 보여 비교가 직관적이고 단어 경계가 깨지지 않는다. 각 음소 칸은 chip 두 개를
              세로로 쌓은 column 으로 두어 정답과 내 발음 자리가 자동 정렬된다. */}
          <div className="flex flex-col gap-3">
            {groups.map((g, gi) => {
              const wordHasError = g.phonemes.some((p) => wrongIdx.has(p.idx));
              return (
                <div key={`w-${gi}-${g.word}`} className="space-y-1.5">
                  {g.word && (
                    <span
                      className={`block text-sm font-semibold ${
                        wordHasError ? 'text-red-600' : 'text-gray-700'
                      }`}
                    >
                      {g.word}
                    </span>
                  )}
                  {/* 좌측 라벨 "정답 / 내 발음" + 우측 음소 chip 영역.
                      chip 영역은 wrap 하지 않고 가로 스크롤 (overflow-x-auto + flex-nowrap) 로 둔다.
                      한 단어 음소가 모바일 폭을 넘어도 정답/내 발음 두 줄이 항상 같은 가로 위치에 정렬돼
                      비교가 깨지지 않는다. (이전엔 우측 fade mask 를 줬는데 마지막 chip 의 active ring 을
                      잘라 먹어서 제거했다.) */}
                  <div className="flex items-stretch gap-2">
                    <div className="flex flex-col justify-between text-[10px] font-medium text-gray-400 pr-1 flex-shrink-0">
                      <span>정답</span>
                      <span>내 발음</span>
                    </div>
                    <div className={`flex-1 min-w-0 overflow-x-auto ${pointerFine ? '' : 'scrollbar-hide'}`}>
                      <div className="flex flex-nowrap gap-1 pr-2 py-1">
                        {g.phonemes.map((cell) => {
                        const { ph, idx, perceived, isSubstitution, isDeletion } = cell;
                        // ph 가 비어 있으면 빈 chip 박스가 렌더되어 학습자에게 빈 자리처럼 보이므로 안전망으로 건너뛴다.
                        if (!ph || !ph.trim()) return null;
                        const wrong = isSubstitution || isDeletion;
                        const active = selectedPhoneme === normalizePhoneme(ph);
                        // 정답 chip 은 학습 포커스이므로 font-semibold 로 한 단계 진하게 — n, m 같은 단일 글자도
                        // chip 가운데에서 또렷이 보이게 한다. 내 발음은 보조라 그대로 둔다.
                        const canonicalChipClass = wrong
                          ? 'bg-red-100 text-red-600 border-red-300 font-bold'
                          : 'bg-white text-gray-800 border-gray-300 font-semibold hover:border-brand-500';
                        // 내 발음 칸은 색으로 op 를 표현 — match=회색, substitution=주황, deletion=점선 회색.
                        const perceivedChipClass = isDeletion
                          ? 'bg-gray-50 text-gray-300 border-dashed border-gray-300'
                          : isSubstitution
                            ? 'bg-orange-100 text-orange-700 border-orange-300 font-bold'
                            : 'bg-gray-100 text-gray-500 border-gray-200';
                        return (
                          <div
                            key={`cell-${idx}-${ph}`}
                            className="flex flex-col items-stretch gap-0.5 min-w-[2.25rem]"
                          >
                            <button
                              onClick={() => setSelectedPhoneme(normalizePhoneme(ph))}
                              className={`text-sm font-mono px-1.5 py-0.5 rounded border transition-colors text-center ${canonicalChipClass} ${
                                active ? 'ring-2 ring-brand-500' : ''
                              }`}
                            >
                              {ph}
                            </button>
                            <div
                              className={`text-xs font-mono px-1.5 py-0.5 rounded border text-center ${perceivedChipClass}`}
                            >
                              {isDeletion ? '—' : perceived}
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPhoneme ? (
            <ArticulationCard phoneme={selectedPhoneme} onClose={() => setSelectedPhoneme(null)} />
          ) : (
            <p className="text-xs text-gray-400">정답 음소를 누르면 혀 위치를 볼 수 있어요.</p>
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
  // 이미지 안 한국어 캡션이 모바일 카드 크기에선 너무 작아 잘 안 읽혀, 탭 시 풀스크린 모달로 확대한다.
  const [zoomed, setZoomed] = useState(false);

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
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="block w-full max-w-xs mx-auto mb-2 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label={`${phoneme} 조음 위치 크게 보기`}
        >
          <img src={image} alt={`${phoneme} 조음 위치`} className="w-full rounded-lg" />
          <span className="block text-[10px] text-gray-400 mt-1">탭하면 크게 볼 수 있어요</span>
        </button>
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

      {/* 풀스크린 확대 모달 — 배경 또는 X 클릭으로 닫는다. 이미지를 viewport 최대 폭/높이까지 키운다. */}
      {zoomed && image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30"
            aria-label="확대 닫기"
          >
            <X size={24} className="text-white" />
          </button>
          <img
            src={image}
            alt={`${phoneme} 조음 위치 확대`}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
