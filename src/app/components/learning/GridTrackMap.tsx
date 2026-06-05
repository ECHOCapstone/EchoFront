// 격자 테마. 챕터를 2열 격자(챕터 수에 따라 2×3, 2×4 …)로 늘어놓고, 각 칸에 제목에
// 어울리는 아이콘을 둔다(공항→비행기, 병원→청진기, 긴급→느낌표 …).
// 푸른숲 지도와 달리 순차 잠금이 없어 원하는 챕터부터 바로 학습할 수 있다.
// 완료한 챕터에는 체크 표시만 얹는다(잠금 아님).

import { Check, Star } from 'lucide-react';
import type { ChapterSummary } from '../../api/types';
import { completedChapters } from '../../lib/trackProgress';
import { chapterVisual } from '../../lib/chapterIcon';
import { DIFFICULTY_LABEL, DIFFICULTY_DOTS } from '../../lib/difficulty';

type GridTrackMapProps = {
  trackId: number;
  chapters: ChapterSummary[];
  onEnter: (chapterIndex: number) => void;
};


export default function GridTrackMap({ trackId, chapters, onEnter }: GridTrackMapProps) {
  const done = completedChapters(trackId);

  return (
    <div className="grid grid-cols-2 gap-3">
      {chapters.map((chapter, index) => {
        const { Icon, bg, fg } = chapterVisual(chapter.title);
        const isDone = done.has(index);

        return (
          <button
            key={chapter.scriptId}
            type="button"
            onClick={() => onEnter(index)}
            aria-label={`${index + 1}. ${chapter.title}`}
            className="group relative flex flex-col items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white p-4 text-center transition-colors hover:border-brand-400 hover:bg-brand-50 active:bg-brand-100"
          >
            {/* 순서 배지 */}
            <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500">
              {index + 1}
            </span>
            {/* 완료 체크 (잠금 아님 — 표시용) */}
            {isDone && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow">
                <Check size={13} strokeWidth={3} />
              </span>
            )}

            {/* 카테고리 아이콘 */}
            <span className={`mt-1 flex h-16 w-16 items-center justify-center rounded-2xl ${bg}`}>
              <Icon size={34} className={fg} strokeWidth={2} />
            </span>

            <span className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-gray-900">
              {chapter.title}
            </span>

            <span className="flex items-center justify-center gap-0.5">
              {Array.from({ length: 3 }).map((_, dot) => (
                <Star
                  key={dot}
                  size={11}
                  className={dot < DIFFICULTY_DOTS[chapter.difficulty] ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}
                />
              ))}
              <span className="ml-1 text-[11px] text-gray-400">{DIFFICULTY_LABEL[chapter.difficulty]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
