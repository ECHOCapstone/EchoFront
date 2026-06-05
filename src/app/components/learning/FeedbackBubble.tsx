// 한 번의 녹음에 대한 발음 피드백 말풍선. 헤드라인·점수 게이지·약점·음소 정렬 시각화와
// (활성 상태일 때) 다시/다음 액션 버튼을 렌더한다. 표현 규칙은 feedbackPresentation 이 계산한다.

import { RotateCcw } from 'lucide-react';
import { BotBubble } from '../ChatBubble';
import FeedbackPhonemeSection from '../FeedbackPhonemeSection';
import type { CanonicalWord, PhonemeError, PhonemeTip, SpeechRate, WrongWord } from '../../api';
import { feedbackPresentation, selectWeakPhonemeTips } from './feedbackPresentation';

// 음소 정렬 결과 스냅샷. 피드백 말풍선이 음소 단위 시각화를 그릴 때 쓴다.
export interface AlignmentSnapshot {
  targetText: string | null;
  perceived: string[];
  canonical: string[];
  errors: PhonemeError[];
  wrongWords: WrongWord[];
  // 단어별 canonical 음소. 음소를 단어 경계로 잘라 보여줄 때 사용. 비어 있으면 한 줄 폴백.
  canonicalWords: CanonicalWord[];
}

// 한 번의 시도에 대한 백엔드 피드백 데이터. passed/retryRecommended 는 백엔드가 결정한 SSOT 다.
export interface FeedbackData {
  guidanceKr: string;
  score: number | null;
  passed: boolean;
  retryRecommended: boolean;
  strengths: string[];
  weaknesses: string[];
  phonemeTips: PhonemeTip[];
  // 모델 서버 발화 속도 분류 (FAST / NORMAL / SLOW). FAST 일 때만 안내 배지를 띄운다.
  speechRate: SpeechRate;
  alignment: AlignmentSnapshot;
  // 백엔드가 같이 보낸 합격선 (게임화 설정). 게이지가 이 값으로 합격선 마커를 그린다.
  passThreshold: number | null;
}

interface FeedbackBubbleProps {
  data: FeedbackData;
  // 맵 안에서 자식 요소 key 를 안정적으로 만들기 위한 접두사.
  itemKey: string;
  // 가장 최근 시도일 때만 액션 버튼을 노출/활성화한다.
  isActive: boolean;
  // 마지막 prompt 인지 — 다음 버튼 라벨을 finalAdvanceLabel 로 바꾼다.
  isLast: boolean;
  // 업로드/스텝 처리 중이면 버튼을 잠근다.
  busy: boolean;
  advanceLabel: string;
  finalAdvanceLabel: string;
  onRetry: () => void;
  onAdvance: () => void;
}

export default function FeedbackBubble({
  data,
  itemKey,
  isActive,
  isLast,
  busy,
  advanceLabel,
  finalAdvanceLabel,
  onRetry,
  onAdvance,
}: FeedbackBubbleProps) {
  const view = feedbackPresentation({
    passed: data.passed,
    retryRecommended: data.retryRecommended,
    score: data.score,
    passThreshold: data.passThreshold,
  });
  const Icon = view.icon;
  const validTips = selectWeakPhonemeTips(data.phonemeTips, data.alignment.errors);

  return (
    <BotBubble>
      {/* 헤드라인 + 점수 + 게이지를 한 묶음으로 잡아 시각 위계의 정점에 둔다.
          - 헤드라인: 가장 큰 굵은 텍스트
          - 점수: 그보다 약간 작지만 컬러 강조
          - 게이지: 합격선을 점선으로 표시해 "얼마나 더" 가 직관됨 */}
      <div className="flex items-start gap-2 mb-2">
        {Icon && <Icon size={22} className={`${view.iconClass} flex-shrink-0 mt-0.5`} />}
        <div className="flex-1 min-w-0">
          <p className={`text-lg font-bold leading-tight ${view.headlineColor}`}>{view.headline}</p>
          {data.score !== null && (
            <>
              <p className={`text-3xl font-extrabold leading-tight mt-1 ${view.scoreColor}`}>
                {data.score.toFixed(1)}<span className="text-sm font-medium text-gray-500 ml-1">점</span>
              </p>
              <div className="relative mt-1.5 h-1.5 w-full max-w-[180px] rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${view.gaugeColor} transition-all`}
                  style={{ width: `${Math.max(0, Math.min(100, data.score))}%` }}
                />
                <div
                  className="absolute inset-y-0 w-px bg-gray-400"
                  style={{ left: `${view.passThreshold}%` }}
                  aria-label={`합격선 ${view.passThreshold}점`}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5 max-w-[180px]">
                합격선 {view.passThreshold}점
              </p>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-3">{data.guidanceKr || ' '}</p>
      {data.speechRate === 'FAST' && (
        <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-200 px-2.5 py-1 text-xs font-medium text-yellow-800">
          <span>⏱</span>
          <span>조금 천천히 발음해 보세요</span>
        </div>
      )}
      {data.weaknesses.length > 0 && (
        <ul className="mb-3 text-xs text-gray-600 list-disc pl-5 space-y-0.5">
          {data.weaknesses.map((w, i) => (
            <li key={`weak-${itemKey}-${i}`}>{w}</li>
          ))}
        </ul>
      )}
      {/* 약점 음소를 한국식 음차 chip 으로만 인라인 노출. 박스를 두면 음소 보기 안의 칩과 정보가
          중복되고 시각 부담이 커지므로, 여기는 "어떤 음소가 약점인지" 알림 역할만 한다.
          자세한 발음 설명은 음소 보기 → 음소 칩 클릭 → 조음 카드에서 본다. */}
      {validTips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          <span>약점 음소</span>
          {validTips.map((tip, i) => (
            <span
              key={`tip-${itemKey}-${i}`}
              className="inline-flex items-baseline gap-0.5 rounded-md bg-red-50 border border-red-200 px-1.5 py-0.5 font-mono text-red-700"
            >
              <span className="font-bold">{tip.phoneme}</span>
              {tip.koreanCue && <span className="text-[10px] text-red-500">({tip.koreanCue})</span>}
            </span>
          ))}
        </div>
      )}
      <div className="mb-3">
        <FeedbackPhonemeSection
          targetText={data.alignment.targetText}
          canonical={data.alignment.canonical}
          perceived={data.alignment.perceived}
          errors={data.alignment.errors}
          canonicalWords={data.alignment.canonicalWords}
        />
      </div>
      {isActive && (
        // primary 가 2/3 폭, secondary 가 1/3 폭. secondary 는 텍스트만으로 처리해
        // 학습자가 시스템 권유 (다시 / 다음) 를 한눈에 알아채게 한다.
        <div className="flex gap-2 items-stretch">
          <button
            onClick={onRetry}
            disabled={busy}
            className={`flex items-center justify-center gap-1.5 h-11 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
              view.primaryAdvance
                ? 'flex-[1] bg-transparent text-gray-500 hover:text-orange-500 hover:bg-orange-50'
                : 'flex-[2] bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-500 shadow-sm'
            }`}
          >
            <RotateCcw size={16} className={view.primaryAdvance ? 'text-gray-400' : 'text-white'} />
            <span>다시 발음하기</span>
          </button>
          <button
            onClick={onAdvance}
            disabled={busy}
            className={`h-11 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
              view.primaryAdvance
                ? 'flex-[2] bg-brand-500 hover:bg-brand-600 text-white shadow-sm'
                : 'flex-[1] bg-transparent text-gray-500 hover:text-brand-500 hover:bg-brand-50'
            }`}
          >
            {isLast ? finalAdvanceLabel : advanceLabel}
          </button>
        </div>
      )}
    </BotBubble>
  );
}
