// 모든 학습 흐름이 공유하는 녹음 버튼.
//
// 상태별 라벨 / 스타일을 한 곳에서 관리해 PronunciationPractice / SessionDetail / FeedbackFlow
// 어디서든 동일 동작과 시각 언어를 보장한다.
//   idle                          → idleLabel
//   armed (사용자 클릭 직후)      → 풀스크린 카운트다운 오버레이 (2 → 1).
//                                   이때 onStart() 도 이미 호출되어 mic stream 이 워밍업되고 캡쳐 중.
//                                   사용자가 0 을 보고 발음해도 onset 자음이 잘리지 않는다.
//   recording                     → 빨강 펄스 + recordingLabel — 카운트다운 종료 후 본 녹음 라벨로 전환.
//   busy                          → busyLabel
//
// 카운트다운은 "지금부터 본격적으로 발음" 시점을 시각으로 강하게 알려주는 가이드 역할.
// mic stream 은 카운트다운 시작과 함께 켜져 있어 시점 직후 발음에 안정적으로 반응한다.
// 오버레이는 portal 로 body 에 마운트되어 부모 컨테이너의 overflow / z-index 와 무관하게
// 항상 최상위에 표시된다.
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

// 카운트다운 시작 값. 1초씩 감소해 0 에 도달하면 본 녹음 라벨로 전환된다.
// onStart 는 카운트다운 시작 시점에 이미 호출되므로 mic 는 카운트다운 내내 켜져 있다.
const COUNTDOWN_FROM = 2;

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
  // 카운트다운 남은 초. null = 카운트다운 비활성, 0 보다 크면 "발음 준비" 단계 (단 mic 는 이미 켜짐).
  const [countdown, setCountdown] = useState<number | null>(null);

  // onStart 가 매 렌더 새 함수로 들어와도 effect 가 무한 루프에 빠지지 않도록 최신 참조만 유지한다.
  const onStartRef = useRef(onStart);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  // 카운트다운 1초씩 감소. 0 에 도달하면 카운트다운 종료 — onStart 는 이미 시작 시점에 호출됐다.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const inCountdown = countdown !== null && countdown > 0;
  const handleClick = () => {
    if (isRecording) {
      onStop();
      return;
    }
    if (inCountdown) return; // 카운트다운 중 중복 클릭 무시
    // mic stream 워밍업 latency 를 카운트다운 동안 흡수하기 위해 onStart 를 먼저 호출하고
    // 그 다음 시각 카운트다운을 시작한다.
    onStartRef.current();
    setCountdown(COUNTDOWN_FROM);
  };

  const iconSize = variant === 'block' ? 20 : 18;
  // 카운트다운 동안 mic 는 이미 켜져 있지만 사용자에게는 "준비" 상태로 보여야 하므로 sky 톤.
  // 카운트다운이 끝나면 빨강 펄스로 "본 녹음" 을 강조한다.
  const stateClass = inCountdown
    ? 'border-brand-400 bg-brand-50 animate-pulse'
    : isRecording
      ? 'border-red-500 bg-red-50 animate-pulse'
      : 'border-gray-300 hover:border-brand-500 hover:bg-brand-50';

  const label = inCountdown
    ? `${countdown}`
    : isRecording
      ? recordingLabel
      : busy && busyLabel
        ? busyLabel
        : idleLabel;

  const Icon = inCountdown ? Pause : Mic;
  const iconClass = inCountdown
    ? 'text-brand-600'
    : isRecording
      ? 'text-red-500 animate-pulse'
      : 'text-gray-600';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={busy || inCountdown}
        className={`${VARIANT_CLASS[variant]} ${stateClass}`}
      >
        <Icon size={iconSize} className={iconClass} />
        <span className={inCountdown ? 'text-base font-semibold text-brand-700 leading-none' : ''}>
          {inCountdown ? '잠시 후 시작합니다' : label}
        </span>
      </button>
      {inCountdown && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B2E5A]/60 backdrop-blur-md"
            role="dialog"
            aria-live="polite"
            aria-label="녹음 준비 카운트다운"
          >
            <p className="mb-4 text-sm text-brand-100/90 font-medium tracking-wide">잠시 후 발음을 시작하세요</p>
            <div className="text-[8rem] font-bold text-brand-300 leading-none drop-shadow-lg tabular-nums">
              {countdown}
            </div>
            <p className="mt-6 text-xs text-brand-100/70">또렷하고 크게 발음해 주세요</p>
          </div>,
          document.body,
        )}
    </>
  );
}
