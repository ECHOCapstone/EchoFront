// 트랙 챕터를 지도형 경로로 표현하는 컴포넌트 (Duolingo 학습 경로 스타일).
// 챕터를 위에서 아래로 흐르는 지그재그 노드로 배치하고, 각 노드는 세 상태를 가진다.
//   - 완료(completed): 체크, 초록. 복습 위해 다시 진입 가능.
//   - 현재(current):  바로 진입 가능한 다음 챕터. 강조 + 펄스.
//   - 잠금(locked):   직전 챕터 미완료라 비활성.
// 잠금/완료 판정은 trackProgress(localStorage) 에서 읽는다 — 백엔드 변경 없는 실험 구현.

import { Check, Lock, Play, Star } from 'lucide-react';
import type { ChapterSummary, Difficulty } from '../../api/types';
import { completedChapters, isChapterUnlocked } from '../../lib/trackProgress';

type TrackMapProps = {
  trackId: number;
  chapters: ChapterSummary[];
  onEnter: (chapterIndex: number) => void;
};

// 노드를 좌우로 흔들어 길처럼 보이게 하는 가로 오프셋(%). 완만한 S 곡선을 위해 4단계로 순환.
const SWING = [0, 18, 26, 18, 0, -18, -26, -18];

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
};

const DIFFICULTY_DOTS: Record<Difficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

export default function TrackMap({ trackId, chapters, onEnter }: TrackMapProps) {
  const done = completedChapters(trackId);

  return (
    <div className="relative py-4">
      {chapters.map((chapter, index) => {
        const isDone = done.has(index);
        const unlocked = isChapterUnlocked(trackId, index);
        // 현재 노드 = 잠금 해제됐지만 아직 완료 안 한 첫 챕터.
        const isCurrent = unlocked && !isDone;
        const offset = SWING[index % SWING.length];

        return (
          <div key={chapter.scriptId} className="relative">
            {/* 위 노드와 잇는 점선 커넥터 (첫 노드 제외). 완료 구간은 진하게. */}
            {index > 0 && (
              <div
                aria-hidden
                className={`absolute left-1/2 -top-6 h-12 w-1 -translate-x-1/2 rounded-full ${
                  isDone || done.has(index - 1) ? 'bg-brand-300' : 'bg-gray-200'
                }`}
              />
            )}

            <div
              className="flex items-center justify-center py-2"
              style={{ transform: `translateX(${offset}%)` }}
            >
              <button
                type="button"
                onClick={() => unlocked && onEnter(index)}
                disabled={!unlocked}
                aria-label={`${index + 1}. ${chapter.title}${unlocked ? '' : ' (잠김)'}`}
                className={[
                  'group relative flex flex-col items-center gap-2 transition-transform',
                  unlocked ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0' : 'cursor-not-allowed',
                ].join(' ')}
              >
                {/* 노드 원 */}
                <span
                  className={[
                    'relative flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-md transition-colors',
                    isDone
                      ? 'border-green-300 bg-green-500 text-white'
                      : isCurrent
                        ? 'border-brand-200 bg-brand-500 text-white'
                        : 'border-gray-200 bg-gray-100 text-gray-400',
                  ].join(' ')}
                >
                  {/* 현재 노드에 잔잔한 펄스 링 */}
                  {isCurrent && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full border-4 border-brand-400 animate-ping opacity-60"
                    />
                  )}
                  {isDone ? (
                    <Check size={28} strokeWidth={3} />
                  ) : isCurrent ? (
                    <Play size={26} className="fill-white" />
                  ) : (
                    <Lock size={24} />
                  )}

                  {/* 순서 배지 */}
                  <span
                    className={[
                      'absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow',
                      isDone ? 'bg-green-600 text-white' : isCurrent ? 'bg-white text-brand-600' : 'bg-white text-gray-400',
                    ].join(' ')}
                  >
                    {index + 1}
                  </span>
                </span>

                {/* 라벨 카드 */}
                <span
                  className={[
                    'max-w-[12rem] rounded-xl px-3 py-1.5 text-center shadow-sm',
                    isCurrent ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-white',
                  ].join(' ')}
                >
                  <span className={`block text-sm font-bold ${unlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                    {chapter.title}
                  </span>
                  <span className="mt-0.5 flex items-center justify-center gap-1">
                    {Array.from({ length: 3 }).map((_, dot) => (
                      <Star
                        key={dot}
                        size={11}
                        className={
                          dot < DIFFICULTY_DOTS[chapter.difficulty]
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-200 text-gray-200'
                        }
                      />
                    ))}
                    <span className="ml-1 text-[11px] text-gray-400">{DIFFICULTY_LABEL[chapter.difficulty]}</span>
                  </span>
                </span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
