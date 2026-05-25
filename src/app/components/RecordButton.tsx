// 모든 학습 흐름이 공유하는 녹음 버튼.
//
// 상태별 라벨 / 스타일을 한 곳에서 관리해 PronunciationPractice / SessionDetail / FeedbackFlow
// 어디서든 동일 동작과 시각 언어를 보장한다.
//   isRecording=false / busy=false → idleLabel  (예: "녹음 시작")
//   isRecording=true / priming     → "잠시만요..." (마이크 stream 준비 latency 흡수, 0.8초)
//   isRecording=true / primed       → recordingLabel + 빨강 펄스 (이때부터 발음)
//   isRecording=false / busy=true   → busyLabel  (예: "업로드 중...")
//
// 마이크 stream 은 사용자가 버튼을 누른 즉시 시작되지만 (getUserMedia / MediaRecorder.start 의 latency 가
// 100~300ms 발생) 학습자는 어느 시점부터 발음해야 할지 모른다. 그래서 isRecording 직후 짧은 priming
// 구간을 두어 시각 / 라벨 변화로 "지금부터 발음" 시점을 명확히 알린다.
//
// variant 는 형태 차이만 통제한다.
//   'block'  : 전체 너비, 큰 버튼 (채팅 step prompt 안에 사용)
//   'inline' : 폭 자동, 작은 버튼 (재연습 단어 박스 등 인라인 액션에 사용)

import { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';

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

// 마이크 stream 안정화 + 사용자가 시작 시점을 시각으로 인지할 수 있게 두는 짧은 priming 시간.
const PRIMING_MS = 800;

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
  // 녹음이 막 시작된 직후 PRIMING_MS 동안만 "잠시만요" 표시. 끝나면 primed=true 가 되어 본 녹음 톤으로 전환된다.
  const [primed, setPrimed] = useState(false);
  useEffect(() => {
    if (!isRecording) {
      setPrimed(false);
      return;
    }
    const timer = setTimeout(() => setPrimed(true), PRIMING_MS);
    return () => clearTimeout(timer);
  }, [isRecording]);

  const iconSize = variant === 'block' ? 20 : 18;
  const stateClass = isRecording
    ? primed
      ? 'border-red-500 bg-red-50 animate-pulse'
      : 'border-amber-400 bg-amber-50'
    : 'border-gray-300 hover:border-sky-500 hover:bg-sky-50';
  const iconClass = isRecording
    ? primed
      ? 'text-red-500 animate-pulse'
      : 'text-amber-500'
    : 'text-gray-600';
  const label = isRecording
    ? primed
      ? recordingLabel
      : '잠시만요...'
    : busy && busyLabel
      ? busyLabel
      : idleLabel;

  return (
    <button
      onClick={isRecording ? onStop : onStart}
      disabled={busy}
      className={`${VARIANT_CLASS[variant]} ${stateClass}`}
    >
      <Mic size={iconSize} className={iconClass} />
      <span>{label}</span>
    </button>
  );
}
