// 통과 시 짧은 효과음. 정적 음원 의존을 없애기 위해 WebAudio 로 합성한다.
// tier 별로 음정·길이를 살짝 다르게 — 청각적으로도 good 과 great 를 구분한다.
//   good  : 단음 (E5) — "딩" 한 번
//   great : C5 → E5 → G5 메이저 트라이어드 빠른 아르페지오 — "딩-동-당"
//   fair / poor : 무음 — 잘못된 발음에 부정적 신호를 주지 않는다.

import type { ScoreTier } from './score';

// 효과음을 재생할 tier 집합. 양수 신호 (통과 이상) 만 포함.
const ENABLED_TIERS: ReadonlySet<ScoreTier> = new Set(['good', 'great']);

// tier 별 정현파 시퀀스 (주파수 Hz). 빈 배열이면 무음.
const TIER_TONES: Record<ScoreTier, ReadonlyArray<number>> = {
  poor: [],
  fair: [],
  good: [659.25],
  great: [523.25, 659.25, 783.99],
};

// 음 사이 간격 (ms). 단음이면 의미 없고, 화음이면 아르페지오 간격이 된다.
const TIER_STEP_MS: Record<ScoreTier, number> = {
  poor: 0,
  fair: 0,
  good: 0,
  great: 90,
};

// 한 음의 길이 (s). attack 짧고 release 자연.
const TONE_DURATION_SEC = 0.35;
// 피크 볼륨. 시연 환경에서 거슬리지 않도록 작게 잡는다.
const PEAK_GAIN = 0.15;

// AudioContext 는 페이지당 단일 인스턴스만 유지한다. 매 호출 시 새로 만들면 모바일에서 자원 누수.
let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  // iOS Safari 등 일부 브라우저는 사용자 제스처 이후에야 resume 가능. 실패해도 조용히 통과.
  if (sharedContext.state === 'suspended') {
    sharedContext.resume().catch(() => {});
  }
  return sharedContext;
}

// 주어진 tier 에 대응하는 효과음을 재생한다. ENABLED_TIERS 가 아니면 no-op.
export function playScoreFanfare(tier: ScoreTier): void {
  if (!ENABLED_TIERS.has(tier)) return;
  const ctx = getContext();
  if (!ctx) return;

  const tones = TIER_TONES[tier];
  const stepMs = TIER_STEP_MS[tier];
  const now = ctx.currentTime;

  tones.forEach((freq, index) => {
    const startAt = now + (index * stepMs) / 1000;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    // attack 약 20ms → 피크 → 자연 감쇠. 0 으로 가는 exponentialRampTo 는 0 을 허용 안 하므로 0.0001 사용.
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + TONE_DURATION_SEC);
    osc.start(startAt);
    osc.stop(startAt + TONE_DURATION_SEC + 0.02);
  });
}
