// 책장(도서관) 테마. 모음 구별 트랙용.
// 나무 책장에 흐린 장식용 책들을 깔고, 실제 챕터는 색이 있는 "강조된 책"으로 꽂는다.
// 챕터가 2권이면 강조 책도 2권 — 책장에서 그 책들이 곧 트랙(챕터) 진입점이다.
// 순차 잠금 없이 원하는 책(챕터)부터 바로 펼칠 수 있고, 완료한 책엔 책갈피 체크를 단다.

import { Check } from 'lucide-react';
import type { ChapterSummary } from '../../api/types';
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

// 강조 책(챕터) 책등 색 팔레트 — 도서관 느낌의 차분한 톤.
const SPINES = ['#8d3b3b', '#2f4b7c', '#3f6b4f', '#a9762a', '#5d4a7a', '#2f7c7c'];
// 장식 책 색 — 흐릿한 베이지/그레이.
const DECO = ['#cbb89a', '#b9c2cf', '#c9bcae', '#bcae9c', '#a9b6a0', '#cdbfd0', '#d2c4a6'];

const SHELF_HEIGHT = 156; // 한 칸 높이(px)
const PER_SHELF = 3; // 한 칸에 꽂는 챕터 수

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
        opacity: 0.75,
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
    <div className="overflow-hidden rounded-3xl bg-[#f3e9d6] p-3 ring-1 ring-amber-200/80 shadow-inner">
      {shelves.map((row, shelfIdx) => (
        <div key={shelfIdx} className="relative">
          {/* 책 줄: 바닥(책꽂이 판) 기준으로 세움 */}
          <div className="flex items-end justify-center gap-1.5 px-2" style={{ minHeight: SHELF_HEIGHT }}>
            {row.map((chapter, j) => {
              const index = shelfIdx * PER_SHELF + j;
              const isDone = done.has(index);
              const spine = SPINES[index % SPINES.length];
              const bookH = 132 + (index % 2 === 0 ? 8 : 0); // 강조 책은 크고 균일하게

              return (
                <div key={chapter.scriptId} className="flex items-end gap-1.5">
                  {/* 챕터 책 앞에 장식 책 1~2권 */}
                  <DecoBook seed={index * 7 + 1} />
                  {pseudo(index, 9) < 0.5 && <DecoBook seed={index * 7 + 2} />}

                  {/* 강조된 챕터 책 */}
                  <button
                    type="button"
                    onClick={() => onEnter(index)}
                    aria-label={`${index + 1}. ${chapter.title}`}
                    className="group relative shrink-0 rounded-t-md shadow-md ring-1 ring-black/15 transition-transform hover:-translate-y-1.5"
                    style={{ height: bookH, width: 42, background: spine }}
                  >
                    {/* 책등 상단 금박 줄 */}
                    <span aria-hidden className="absolute inset-x-1.5 top-2 h-0.5 rounded bg-white/35" />
                    <span aria-hidden className="absolute inset-x-1.5 top-3 h-0.5 rounded bg-white/25" />

                    {/* 순서 */}
                    <span className="absolute left-1/2 top-5 -translate-x-1/2 text-[11px] font-bold text-white/90">
                      {index + 1}
                    </span>

                    {/* 세로 제목 (책등) */}
                    <span
                      className="absolute inset-x-0 bottom-3 top-9 mx-auto flex items-start justify-center px-1 text-[12px] font-bold leading-tight text-white [writing-mode:vertical-rl]"
                      style={{ letterSpacing: '0.02em' }}
                    >
                      <span className="line-clamp-1 max-h-full">{chapter.title}</span>
                    </span>

                    {/* 완료 책갈피 */}
                    {isDone && (
                      <span className="absolute -top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow ring-2 ring-[#f3e9d6]">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>

                  {/* 마지막 챕터 뒤 장식 책 */}
                  {j === row.length - 1 && <DecoBook seed={index * 7 + 3} />}
                </div>
              );
            })}
          </div>

          {/* 책꽂이 판(나무) */}
          <div
            aria-hidden
            className="h-3 rounded-sm shadow-md"
            style={{ background: 'linear-gradient(180deg, #a9763f 0%, #8a5e30 100%)' }}
          />
          {shelfIdx < shelves.length - 1 && <div className="h-3" />}
        </div>
      ))}
    </div>
  );
}
