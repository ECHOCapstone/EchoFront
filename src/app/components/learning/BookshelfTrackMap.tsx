// 책장(도서관) 테마. 모음 구별 트랙용.
// 톤다운한 나무 책장에 흐린 장식 책들을 깔고, 실제 챕터는 메인화면 카드 색(학습트랙/맞춤학습)으로
// 칠한 "강조된 책"으로 꽂는다. 제목은 책등에 새기지 않고, 책 위에 별도 텍스트박스로 띄운다(지도와 동일).
// 순차 잠금 없이 원하는 책(챕터)부터 펼칠 수 있고, 완료한 책엔 책갈피 체크를 단다.

import { Check, Star } from 'lucide-react';
import type { ChapterSummary, Difficulty } from '../../api/types';
import { completedChapters } from '../../lib/trackProgress';

type BookshelfTrackMapProps = {
  trackId: number;
  chapters: ChapterSummary[];
  onEnter: (chapterIndex: number) => void;
};

// 인덱스 기반 결정적 의사난수(0~1). 장식 책 모양이 렌더마다 흔들리지 않게.
function pseudo(i: number, salt: number): number {
  const n = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// 강조 책(챕터) 색 = 메인화면 카드 색. 학습트랙(brand-500) / 맞춤학습(#5BC0EB) 번갈아.
const SPINES = ['#77b5fe', '#5BC0EB'];
// 장식 책 색 — 흐릿한 베이지/그레이.
const DECO = ['#cbb89a', '#b9c2cf', '#c9bcae', '#bcae9c', '#a9b6a0', '#cdbfd0', '#d2c4a6'];

const PER_SHELF = 3; // 한 칸에 꽂는 챕터 수

const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: '쉬움', MEDIUM: '보통', HARD: '어려움' };
const DIFFICULTY_DOTS: Record<Difficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// 장식용 책 한 권.
function DecoBook({ seed }: { seed: number }) {
  const h = 86 + pseudo(seed, 1) * 52; // 86~138
  const w = 13 + pseudo(seed, 2) * 9; // 13~22
  const color = DECO[Math.floor(pseudo(seed, 3) * DECO.length)];
  const lean = pseudo(seed, 4) < 0.18; // 가끔 비스듬히 기댄 책
  return (
    <div
      aria-hidden
      className="shrink-0 rounded-t-[3px] shadow-sm"
      style={{
        height: h,
        width: w,
        background: color,
        opacity: 0.7,
        transform: lean ? 'rotate(-7deg)' : undefined,
        transformOrigin: 'bottom right',
      }}
    />
  );
}

export default function BookshelfTrackMap({ trackId, chapters, onEnter }: BookshelfTrackMapProps) {
  const done = completedChapters(trackId);
  const shelves = chunk(chapters, PER_SHELF);

  return (
    <div className="overflow-hidden rounded-3xl bg-[#e6ddcc] p-3 ring-1 ring-stone-300/70 shadow-inner">
      {shelves.map((row, shelfIdx) => (
        <div key={shelfIdx} className="relative">
          {/* 책 줄: 바닥(책꽂이 판) 기준으로 세움. 제목 박스가 책 위에 떠서 행이 위로 늘어난다. */}
          <div className="flex items-end justify-center gap-1.5 px-2 pt-14">
            {row.map((chapter, j) => {
              const index = shelfIdx * PER_SHELF + j;
              const isDone = done.has(index);
              const spine = SPINES[index % SPINES.length];
              const bookH = 132 + (index % 2 === 0 ? 8 : 0);

              return (
                <div key={chapter.scriptId} className="flex items-end gap-1.5">
                  {/* 챕터 책 앞 장식 책 1~2권 */}
                  <DecoBook seed={index * 7 + 1} />
                  {pseudo(index, 9) < 0.5 && <DecoBook seed={index * 7 + 2} />}

                  {/* 강조된 챕터 책 + 위에 뜬 제목 박스 */}
                  <div className="relative flex shrink-0 flex-col items-center justify-end">
                    {/* 제목 텍스트박스 (책등에 새기지 않고 따로 띄움) */}
                    <span className="absolute bottom-full mb-2 w-max max-w-[6rem] rounded-lg bg-white/95 px-2 py-1 text-center shadow-sm ring-1 ring-black/5">
                      <span className="line-clamp-2 text-[11px] font-bold leading-tight text-gray-900">
                        {chapter.title}
                      </span>
                      <span className="mt-0.5 flex items-center justify-center gap-0.5">
                        {Array.from({ length: 3 }).map((_, dot) => (
                          <Star
                            key={dot}
                            size={9}
                            className={dot < DIFFICULTY_DOTS[chapter.difficulty] ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}
                          />
                        ))}
                        <span className="ml-0.5 text-[9px] text-gray-400">{DIFFICULTY_LABEL[chapter.difficulty]}</span>
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => onEnter(index)}
                      aria-label={`${index + 1}. ${chapter.title}`}
                      className="group relative rounded-t-md shadow-md ring-1 ring-black/15 transition-transform hover:-translate-y-1.5"
                      style={{ height: bookH, width: 42, background: spine }}
                    >
                      {/* 책등 상단 장식 줄 */}
                      <span aria-hidden className="absolute inset-x-1.5 top-2 h-0.5 rounded bg-white/35" />
                      <span aria-hidden className="absolute inset-x-1.5 top-3 h-0.5 rounded bg-white/25" />
                      {/* 순서 */}
                      <span className="absolute left-1/2 top-5 -translate-x-1/2 text-[12px] font-bold text-white">
                        {index + 1}
                      </span>
                      {/* 완료 책갈피 */}
                      {isDone && (
                        <span className="absolute -top-1.5 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow ring-2 ring-[#e6ddcc]">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  </div>

                  {/* 마지막 챕터 뒤 장식 책 */}
                  {j === row.length - 1 && <DecoBook seed={index * 7 + 3} />}
                </div>
              );
            })}
          </div>

          {/* 책꽂이 판(나무, 톤다운) */}
          <div
            aria-hidden
            className="h-3 rounded-sm shadow-md"
            style={{ background: 'linear-gradient(180deg, #8c7458 0%, #6f5a43 100%)' }}
          />
          {shelfIdx < shelves.length - 1 && <div className="h-3" />}
        </div>
      ))}
    </div>
  );
}
