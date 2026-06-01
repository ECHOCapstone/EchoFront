// 푸른숲 지도 테마. 챕터를 숲길 위의 디딤돌(노드)로 배치하고, 굽이치는 길을 따라
// 위에서 아래로 "걸어 내려가는" 느낌을 준다. boo 캐릭터가 현재 챕터 돌 위에 서 있고,
// 이미 지나온 길은 진하게, 앞으로 갈 길은 옅게 칠해 진척을 보여준다.
//
// 좌표계: 길/풍경은 viewBox(가로 100 단위 × 세로 chapters*V) 의 SVG 로 그리고,
// 클릭 가능한 노드/라벨은 같은 좌표(x=%, y=px) 로 절대배치한 DOM 으로 겹친다.
// preserveAspectRatio="none" 로 늘리되 V 를 가로 스케일과 맞춰 왜곡을 최소화한다.

import { Check, Flag, Lock, Play, Star } from 'lucide-react';
import type { ChapterSummary, Difficulty } from '../../api/types';
import { completedChapters, isChapterUnlocked } from '../../lib/trackProgress';
import booWalker from '@/assets/boo-pic/BOO17-1.png';

type ForestTrackMapProps = {
  trackId: number;
  chapters: ChapterSummary[];
  onEnter: (chapterIndex: number) => void;
};

const V = 23; // 챕터 한 칸의 세로 viewBox 단위
const STEP_PX = 92; // 챕터 한 칸의 실제 픽셀 높이 (STEP_PX / V = 4 → 가로 스케일과 맞춰 왜곡 최소화)
// 위(boo)·아래(라벨) 여백. SVG 와 DOM 매핑을 정확히 맞추려면 두 좌표계에 같은 비율로 줘야 한다.
const PAD_V = 8;
const PAD_PX = PAD_V * (STEP_PX / V); // = 32

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
};
const DIFFICULTY_DOTS: Record<Difficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

type Point = { x: number; y: number };

// 인덱스 기반 결정적 의사난수(0~1). 렌더마다 같은 값이라 장식 위치가 흔들리지 않는다.
function pseudo(i: number, salt: number): number {
  const n = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// 노드 중심 좌표. x 는 sine 으로 좌우로 굽이치게(20~80%), y 는 칸마다 균등 배치.
function nodePoints(count: number): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    x: 50 + Math.sin(i * 0.9 + 0.6) * 36,
    y: PAD_V + i * V + V * 0.5,
  }));
}

// Catmull-Rom → 베지어 변환으로 점들을 부드러운 곡선 path 로 잇는다.
function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x} ${pts[0].y}` : '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// 한 그루 침엽수(3단 삼각형 + 줄기). 배경 장식용.
function PineTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = scale;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.9}>
      <rect x={-1} y={6} width={2} height={4} rx={0.6} fill="#7e8a96" />
      <polygon points="0,-10 6,0 -6,0" fill="#2f8f93" />
      <polygon points="0,-6 5.2,3 -5.2,3" fill="#3aa6a8" />
      <polygon points="0,-2 4.4,7 -4.4,7" fill="#52c2bd" />
    </g>
  );
}

// 동그란 활엽수/덤불.
function Bush({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={0.85}>
      <circle cx={-3} cy={1} r={3.4} fill="#5fc6c0" />
      <circle cx={3} cy={1} r={3.4} fill="#52c2bd" />
      <circle cx={0} cy={-2} r={4} fill="#6fd2cc" />
    </g>
  );
}

export default function ForestTrackMap({ trackId, chapters, onEnter }: ForestTrackMapProps) {
  const done = completedChapters(trackId);
  const points = nodePoints(chapters.length);
  const totalY = chapters.length * V + PAD_V * 2;

  // 현재 위치 = 아직 완료 안 한 첫 챕터(없으면 마지막). 여기까지가 "지나온 길".
  const firstIncomplete = chapters.findIndex((_, i) => !done.has(i));
  const currentIndex = firstIncomplete === -1 ? chapters.length - 1 : firstIncomplete;
  const travelled = points.slice(0, currentIndex + 1);

  const containerHeight = chapters.length * STEP_PX + PAD_PX * 2;

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl ring-1 ring-green-200/70 shadow-inner"
      style={{ height: containerHeight }}
    >
      {/* 배경: 하늘(푸른) → 풀밭(초록) 그라데이션 + 구름·언덕·나무 장식 */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #c4e2ff 0%, #cfe8f4 45%, #cfeaea 100%)' }}
      />
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${totalY}`}
        preserveAspectRatio="none"
      >
        {/* 부드러운 언덕 띠 */}
        {points.map((p, i) =>
          i % 2 === 0 ? (
            <ellipse key={`hill-${i}`} cx={p.x > 50 ? 12 : 88} cy={p.y} rx={34} ry={12} fill="#bfe0e6" opacity={0.55} />
          ) : null
        )}
        {/* 구름 (맨 위) */}
        <g fill="#ffffff" opacity={0.85}>
          <ellipse cx={22} cy={V * 0.3} rx={9} ry={3.2} />
          <ellipse cx={28} cy={V * 0.25} rx={6} ry={2.6} />
          <ellipse cx={78} cy={V * 0.55} rx={8} ry={3} />
        </g>
        {/* 나무·덤불: 라벨이 뻗는 쪽(중앙 방향)의 바깥 영역 안에서 위치·높이·크기를 조금씩
            흩뿌려 자연스럽게 둔다. 라벨보다 바깥이라 가리지 않으면서, 끝에만 줄 세우지 않는다. */}
        {points.map((p, i) => {
          // 라벨 방향: 왼쪽 노드 → 오른쪽(74~90), 오른쪽 노드 → 왼쪽(10~26)
          const x = p.x < 50 ? 74 + pseudo(i, 1) * 16 : 10 + pseudo(i, 1) * 16;
          const y = p.y + (pseudo(i, 2) - 0.5) * 11; // 행에서 위아래로 흔들기
          const scale = 0.85 + pseudo(i, 3) * 0.55; // 크기 다양화
          return pseudo(i, 4) < 0.5 ? (
            <PineTree key={`tree-${i}`} x={x} y={y} scale={scale} />
          ) : (
            <Bush key={`bush-${i}`} x={x} y={y + 3} scale={scale} />
          );
        })}
      </svg>

      {/* 길: 전체(옅은 흙길) 위에 지나온 구간(진한 길) 을 덧그린다 */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${totalY}`}
        preserveAspectRatio="none"
      >
        {/* 흙길 테두리 + 본체 */}
        <path d={smoothPath(points)} fill="none" stroke="#c9a86a" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.45} />
        <path d={smoothPath(points)} fill="none" stroke="#e7d3a6" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.7} />
        {/* 지나온 길: 브랜드색으로 강조 + 점선 발자국 */}
        {travelled.length >= 2 && (
          <>
            <path d={smoothPath(travelled)} fill="none" stroke="#77b5fe" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={smoothPath(travelled)} fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="1 7" vectorEffect="non-scaling-stroke" opacity={0.9} />
          </>
        )}
      </svg>

      {/* 노드 + 라벨 (클릭 가능한 DOM 오버레이) */}
      {chapters.map((chapter, index) => {
        const p = points[index];
        const isDone = done.has(index);
        const unlocked = isChapterUnlocked(trackId, index);
        const isCurrent = unlocked && !isDone;
        const isGoal = index === chapters.length - 1;

        return (
          <div
            key={chapter.scriptId}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: PAD_PX + index * STEP_PX + STEP_PX / 2 }}
          >
            {/* 현재 챕터 돌 위에 서 있는 boo (디딤돌 위쪽에 absolute 로 띄움) */}
            {isCurrent && (
              <img
                src={booWalker}
                alt=""
                aria-hidden
                className="pointer-events-none absolute bottom-full left-1/2 mb-0.5 h-12 w-12 -translate-x-1/2 object-contain drop-shadow-md"
              />
            )}

            <button
              type="button"
              onClick={() => unlocked && onEnter(index)}
              disabled={!unlocked}
              aria-label={`${index + 1}. ${chapter.title}${unlocked ? '' : ' (잠김)'}`}
              className={[
                'group relative transition-transform',
                unlocked ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0' : 'cursor-not-allowed',
              ].join(' ')}
            >
              {/* 디딤돌 */}
              <span
                className={[
                  'relative flex h-[58px] w-[58px] items-center justify-center rounded-full border-4 shadow-lg transition-colors',
                  isDone
                    ? 'border-green-200 bg-green-500 text-white'
                    : isCurrent
                      ? 'border-white bg-brand-500 text-white'
                      : 'border-stone-200 bg-stone-300 text-stone-500',
                ].join(' ')}
              >
                {isCurrent && (
                  <span aria-hidden className="absolute inset-0 rounded-full border-4 border-brand-300 animate-ping opacity-60" />
                )}
                {isGoal && isDone ? (
                  <Flag size={26} className="fill-white" />
                ) : isDone ? (
                  <Check size={26} strokeWidth={3} />
                ) : isCurrent ? (
                  <Play size={24} className="fill-white" />
                ) : (
                  <Lock size={22} />
                )}

                <span
                  className={[
                    'absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold shadow',
                    isDone ? 'bg-green-600 text-white' : isCurrent ? 'bg-white text-brand-600' : 'bg-white text-stone-400',
                  ].join(' ')}
                >
                  {isGoal ? <Flag size={11} /> : index + 1}
                </span>
              </span>
            </button>

            {/* 라벨 카드 — 노드가 굽은 바깥쪽(빈 공간)으로 띄운다. 세로 공간을 차지하지 않아
                행 간격을 좁혀도 위/아래 챕터와 겹치지 않는다. */}
            <span
              className={[
                'pointer-events-none absolute top-1/2 w-max max-w-[8.5rem] -translate-y-1/2 rounded-xl px-2.5 py-1 shadow-sm backdrop-blur-sm',
                p.x < 50 ? 'left-full ml-2 text-left' : 'right-full mr-2 text-right',
                isCurrent ? 'bg-white/95 ring-1 ring-brand-200' : 'bg-white/80',
              ].join(' ')}
            >
              <span className={`block text-[13px] font-bold leading-tight ${unlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                {chapter.title}
              </span>
              <span className="mt-0.5 flex items-center justify-center gap-0.5">
                {Array.from({ length: 3 }).map((_, dot) => (
                  <Star
                    key={dot}
                    size={10}
                    className={dot < DIFFICULTY_DOTS[chapter.difficulty] ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}
                  />
                ))}
                <span className="ml-0.5 text-[10px] text-gray-400">{DIFFICULTY_LABEL[chapter.difficulty]}</span>
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
