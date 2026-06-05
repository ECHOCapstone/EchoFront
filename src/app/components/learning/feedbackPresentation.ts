// 발음 피드백 말풍선의 시각 표현(헤드라인·색상·아이콘·게이지)을 백엔드의 통과 신호로부터 계산하는
// 순수 로직. JSX 와 분리해 두어 표현 규칙을 한곳에서 읽고 테스트할 수 있게 한다.

import { CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import type { PhonemeError, PhonemeTip } from '../../api';
import { normalizePhoneme } from '../../lib/articulation';
import { PASS_THRESHOLD_FALLBACK } from '../../lib/score';

// 피드백 말풍선이 통과/권고 상태에 따라 입을 시각 속성 묶음.
export interface FeedbackPresentation {
  headline: string;          // 헤드라인 문구
  headlineColor: string;     // 헤드라인 텍스트 색 클래스
  icon: LucideIcon | null;   // 헤드라인 옆 상태 아이콘 (없으면 null)
  iconClass: string;         // 아이콘 색 클래스
  scoreColor: string;        // 점수 숫자 색 클래스
  gaugeColor: string;        // 점수 게이지 채움 색 클래스
  primaryAdvance: boolean;   // true 면 "다음으로" 가 주 버튼, false 면 "다시 발음하기" 가 주 버튼
  passThreshold: number;     // 게이지에 표시할 합격선 (응답 누락 시 폴백 적용)
}

// 백엔드가 결정한 passed/retryRecommended(SSOT) 와 점수로부터 말풍선의 시각 속성을 도출한다.
export function feedbackPresentation(input: {
  passed: boolean;
  retryRecommended: boolean;
  score: number | null;
  passThreshold: number | null;
}): FeedbackPresentation {
  const { passed, retryRecommended, score, passThreshold } = input;
  return {
    headline: passed
      ? '통과! 다음으로 넘어가도 좋아요.'
      : retryRecommended
        ? '한 번 더 시도해 볼까요?'
        : '결과를 확인했어요.',
    headlineColor: passed ? 'text-green-600' : retryRecommended ? 'text-orange-500' : 'text-gray-900',
    icon: passed ? CheckCircle2 : retryRecommended ? Info : null,
    iconClass: passed ? 'text-green-500' : 'text-orange-500',
    scoreColor:
      score === null ? 'text-gray-500' : passed ? 'text-green-600' : retryRecommended ? 'text-orange-500' : 'text-gray-900',
    gaugeColor: passed ? 'bg-green-500' : retryRecommended ? 'bg-orange-400' : 'bg-gray-400',
    primaryAdvance: passed,
    passThreshold: passThreshold ?? PASS_THRESHOLD_FALLBACK,
  };
}

// LLM 이 고른 phonemeTips 중 실제 alignment 오류(치환/삭제의 canonical 음소)와 일치하는 것만 추린다.
// 음소 보기의 빨강 음소와 칩을 일치시켜, 실제로는 틀리지 않은 음소가 약점으로 표기되는 어긋남을 막는다.
export function selectWeakPhonemeTips(tips: PhonemeTip[], errors: PhonemeError[]): PhonemeTip[] {
  const wrongPhonemes = new Set(
    errors
      .filter((e) => (e.op === 'substitution' || e.op === 'deletion') && e.canonical)
      .map((e) => normalizePhoneme(e.canonical as string))
  );
  return tips.filter((t) => wrongPhonemes.has(normalizePhoneme(t.phoneme)));
}
