// 모든 학습 흐름이 공유하는 녹음 버튼.
//
// 상태별 라벨 / 스타일을 한 곳에서 관리해 PronunciationPractice / SessionDetail / FeedbackFlow
// 어디서든 동일 동작과 시각 언어를 보장한다.
//   idle                          → idleLabel
//   armed (사용자 클릭 직후)      → 풀스크린 카운트다운 오버레이 (2 → 1) — onStart 호출 전이라 mic 미동작.
//                                   화면 전체가 흐려지며 큰 숫자가 표시되어 "지금부터 발음" 시점이 명확.
//   recording (priming)           → 직후 0.4초 동안 "잠시만요..." (mic stream 워밍업 흡수)
//   recording (primed)            → 빨강 펄스 + recordingLabel — 이때부터 발음
//   busy                          → busyLabel
//
// 카운트다운이 끝나야 onStart() 가 호출되므로 카운트다운 중에는 mic 가 켜지지 않아
// 학습자가 미리 발음해도 캡쳐되지 않는다. 오버레이는 portal 로 body 에 마운트되어
// 부모 컨테이너의 overflow / z-index 와 무관하게 항상 최상위에 표시된다.
//
// variant 는 형태 차이만 통제한다.
//   'block'  : 전체 너비, 큰 버튼 (채팅 step prompt 안에 사용)
//   'inline' : 폭 자동, 작은 버튼 (재연습 단어 박스 등 인라인 액션에 사용)

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Pause } from 'lucide-react';

export type RecordButtonVariant = 'block' | 'inline';

interface RecordButtonProps {
  isRecording: boolean;
  busy?: boolean;
  onStart: () => void;
  onStop: () => void;
  idleLabel?: string;
  recordingLabel?: string;
  busyLabel?: string;
  variant?: RecordButtonVariant;
}

// 카운트다운 시작 값. 1초씩 감소해 0 에 도달하면 실제 onStart 호출. 너무 길면 답답, 너무 짧으면 약하다.
const COUNTDOWN_FROM = 2;
// 실제 녹음 시작 직후 mic stream 안정화 latency 흡수용 짧은 priming. 0.4초면 충분 (이미 카운트다운으로 시점 가이드).
const PRIMING_MS = 400;

const VARIANT_CLASS: Record<RecordButtonVariant, string> = {
  block:
    'w-full flex items-center justify-center gap-2 h-12 bg-white border-2 text-gray-900 font-medium rounded-xl transition-colors disabled:opacity-50',
  inline:
    'flex items-center justify-center gap-1.5 px-3 h-11 bg-white border-2 text-gray-900 text-sm font-medium rounded-xl transition-colors whitespace-nowrap disabled:opacity-50',
};

export default function RecordButton({
  isRecording,
  busy = false,
  onStart,
  onStop,
  idleLabel = '녹음 시작',
  recordingLabel = '녹음 끝내기',
  busyLabel,
  variant = 'block',
}: RecordButtonProps) {
  // 카운트다운 남은 초. null = 카운트다운 비활성, 0 보다 크면 "기다리는" 단계.
  const [countdown, setCountdown] = useState<number | null>(null);
  // 녹음 막 시작된 직후의 priming flag. PRIMING_MS 후 true 가 되어 본 녹음 톤으로 전환된다.
  const [primed, setPrimed] = useState(false);

  // onStart 가 매 렌더 새 함수로 들어와도 effect 가 무한 루프에 빠지지 않도록 최신 참조만 유지한다.
  const onStartRef = useRef(onStart);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  // 카운트다운 진행. 0 도달 시 onStart 호출하고 자기 자신을 비활성화한다.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      onStartRef.current();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // 녹음 시작 / 종료에 따라 priming flag 를 재설정한다.
  useEffect(() => {
    if (!isRecording) {
      setPrimed(false);
      return;
    }
    const t = setTimeout(() => setPrimed(true), PRIMING_MS);
    return () => clearTimeout(t);
  }, [isRecording]);

  const inCountdown = countdown !== null && countdown > 0;
  const handleClick = () => {
    if (isRecording) {
      onStop();
      return;
    }
    if (inCountdown) return; // 카운트다운 중 중복 클릭 무시
    setCountdown(COUNTDOWN_FROM);
  };

  const iconSize = variant === 'block' ? 20 : 18;
  const stateClass = inCountdown
    ? 'border-amber-500 bg-amber-50 animate-pulse'
    : isRecording
      ? primed
        ? 'border-red-500 bg-red-50 animate-pulse'
        : 'border-amber-400 bg-amber-50'
      : 'border-gray-300 hover:border-sky-500 hover:bg-sky-50';

  const label = inCountdown
    ? `${countdown}`
    : isRecording
      ? primed
        ? recordingLabel
        : '잠시만요...'
      : busy && busyLabel
        ? busyLabel
        : idleLabel;

  const Icon = inCountdown ? Pause : Mic;
  const iconClass = inCountdown
    ? 'text-amber-600'
    : isRecording
      ? primed
        ? 'text-red-500 animate-pulse'
        : 'text-amber-500'
      : 'text-gray-600';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={busy || inCountdown}
        className={`${VARIANT_CLASS[variant]} ${stateClass}`}
      >
        <Icon size={iconSize} className={iconClass} />
        <span className={inCountdown ? 'text-base font-semibold text-amber-700 leading-none' : ''}>
          {inCountdown ? '잠시 후 시작합니다' : label}
        </span>
      </button>
      {inCountdown && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/55 backdrop-blur-md"
            role="dialog"
            aria-live="polite"
            aria-label="녹음 준비 카운트다운"
          >
            <p className="mb-4 text-sm text-white/80 font-medium tracking-wide">잠시 후 발음을 시작하세요</p>
            <div className="text-[8rem] font-bold text-amber-300 leading-none drop-shadow-lg tabular-nums">
              {countdown}
            </div>
            <p className="mt-6 text-xs text-white/60">또렷하고 크게 발음해 주세요</p>
          </div>,
          document.body,
        )}
    </>
  );
}
