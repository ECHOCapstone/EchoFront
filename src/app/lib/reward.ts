// 보상 연출 헬퍼. 챕터 통과·트랙 완주 같은 성취 순간에 호출해 시각적 보상을 준다.
// canvas-confetti 를 얇게 감싸, 호출부는 의미 단위(celebrate*)로만 쓰게 한다.

import confetti from 'canvas-confetti';

const BRAND_COLORS = ['#5BC0EB', '#9BC53D', '#FDE74C', '#FA7921', '#E55934'];

// 접근성: 사용자가 "동작 줄이기" 를 켰으면 연출을 생략한다.
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// 챕터 한 개 통과 — 화면 하단 양옆에서 가볍게 터지는 confetti.
export function celebrateChapter(): void {
  if (prefersReducedMotion()) return;
  const base = { spread: 60, startVelocity: 45, colors: BRAND_COLORS, zIndex: 9999 };
  confetti({ ...base, particleCount: 80, angle: 60, origin: { x: 0, y: 0.7 } });
  confetti({ ...base, particleCount: 80, angle: 120, origin: { x: 1, y: 0.7 } });
}

// 트랙 완주 — 더 크고 긴, 중앙에서 퍼지는 축포.
export function celebrateTrack(): void {
  if (prefersReducedMotion()) {
    return;
  }
  const fire = (particleRatio: number, opts: Record<string, number>) =>
    confetti({
      origin: { y: 0.6 },
      colors: BRAND_COLORS,
      zIndex: 9999,
      particleCount: Math.floor(220 * particleRatio),
      ...opts,
    });

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}
