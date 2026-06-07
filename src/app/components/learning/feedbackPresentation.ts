// 발음 피드백 말풍선의 시각 표현(헤드라인·tier·아이콘) 을 백엔드의 통과 신호·점수로부터 도출하는
// 순수 로직. JSX 와 분리해 두어 표현 규칙을 한곳에서 읽고 테스트할 수 있게 한다.
// 동일 함수가 FeedbackBubble 의 step 피드백과 PracticeItemCard 의 retry-word 결과 양쪽에서 호출된다.

import { CheckCircle2, Info, Sparkles, type LucideIcon } from 'lucide-react';
import type { PhonemeError, PhonemeTip } from '../../api';
import { normalizePhoneme } from '../../lib/articulation';
import {
  PASS_THRESHOLD_FALLBACK,
  scoreTier,
  TIER_TOKENS,
  type ScoreTier,
  type TierTokens,
} from '../../lib/score';

// 피드백 말풍선 / 시도 결과가 입을 시각 속성 묶음.
//   tier            : 4 등급 SSOT — 효과음 분기에도 이 값을 그대로 쓴다.
//   tokens          : tier 별 Tailwind 색 토큰 묶음.
//   icon            : 헤드라인 옆에 둘 상태 아이콘 (없으면 null).
//   headline        : 사용자에게 보여줄 한 줄 메시지.
//   primaryAdvance  : true 면 "다음으로" 를 주 버튼으로 강조 — 통과(passed) 시.
//   passThreshold   : 게이지에 표시할 합격선 (응답 누락 시 폴백 적용).
export interface FeedbackPresentation {
  tier: ScoreTier;
  tokens: TierTokens;
  icon: LucideIcon | null;
  headline: string;
  primaryAdvance: boolean;
  passThreshold: number;
}

// 통과 신호·점수·재시도 권고로부터 시각 표현을 도출한다.
export function feedbackPresentation(input: {
  passed: boolean;
  retryRecommended: boolean;
  score: number | null;
  passThreshold: number | null;
}): FeedbackPresentation {
  const passThreshold = input.passThreshold ?? PASS_THRESHOLD_FALLBACK;
  const tier = scoreTier({
    score: input.score ?? 0,
    passThreshold,
    passed: input.score === null ? undefined : input.passed,
  });
  return {
    tier,
    tokens: TIER_TOKENS[tier],
    icon: iconFor(tier, input.retryRecommended),
    headline: headlineFor(tier, input.retryRecommended),
    // "다음으로" 를 주 버튼으로 강조할지 — tier 가 통과 영역 (good / great) 이면 true.
    // 백엔드 passed 신호 단독을 쓰지 않고 tier 기반으로 결정해 시각 (색·헤드라인) 과 일치시킨다.
    primaryAdvance: tier === 'good' || tier === 'great',
    passThreshold,
  };
}

// LLM 이 고른 phonemeTips 중 실제 alignment 오류(치환/삭제의 canonical 음소)와 일치하는 것만 추린다.
// 음소 보기의 빨강 음소와 칩을 일치시켜, 실제로는 틀리지 않은 음소가 약점으로 표기되는 어긋남을 막는다.
export function selectWeakPhonemeTips(tips: PhonemeTip[], errors: PhonemeError[]): PhonemeTip[] {
  const wrongPhonemes = new Set(
    errors
      .filter((e) => (e.op === 'substitution' || e.op === 'deletion') && e.canonical)
      .map((e) => normalizePhoneme(e.canonical as string)),
  );
  return tips.filter((t) => wrongPhonemes.has(normalizePhoneme(t.phoneme)));
}

// tier 별 헤드라인. great 은 우수 통과, good 은 일반 통과, fair / poor 는 재시도 권유 또는 중립 표기.
function headlineFor(tier: ScoreTier, retryRecommended: boolean): string {
  if (tier === 'great') return '완벽해요!';
  if (tier === 'good') return '통과! 잘하셨어요.';
  if (retryRecommended) return '한 번 더 시도해 볼까요?';
  return '결과를 확인했어요.';
}

// tier 별 아이콘. great 은 강조 아이콘 (Sparkles), good 은 통과 체크, 재시도 권유는 안내, 그 외 없음.
function iconFor(tier: ScoreTier, retryRecommended: boolean): LucideIcon | null {
  if (tier === 'great') return Sparkles;
  if (tier === 'good') return CheckCircle2;
  if (retryRecommended) return Info;
  return null;
}
