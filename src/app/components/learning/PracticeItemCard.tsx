// 종합 피드백 단계에서 노출되는 추가 학습 항목 한 칸.
// 단어 / 구 / 문장 셋 중 하나의 kind 를 가지며, 카드 안에 RecordButton 을 두어
// /api/feedback/{id}/retry-word 호출로 즉시 평가할 수 있다.
//
// 레이아웃 정책:
//   - 헤더는 [배지] [전체 텍스트] 한 줄 — wrap 허용으로 긴 문장도 잘리지 않게 한다.
//   - 부제(reason) 는 그 아래 한두 줄.
//   - 녹음 버튼은 카드 맨 아래에 block 폭으로 둔다 — 헤더와 버튼이 가로로 충돌하지 않아
//     "any...", "pers..." 같은 truncate 가 사라진다.
// 시도 결과의 헤드라인 / 색 / 효과음은 feedbackPresentation (SSOT) 이 결정한다.

import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { BotBubble } from '../ChatBubble';
import RecordButton from '../RecordButton';
import { feedbackApi, type PhonemeTip, type PracticeItem } from '../../api';
import { useRecorder } from '../../hooks/useRecorder';
import { useRecordingLock } from '../../hooks/useRecordingLock';
import { notifyApiError } from '../../lib/notify';
import { playScoreFanfare } from '../../lib/scoreFanfare';
import { renderInlineMarkdown } from '../../lib/markdownLite';
import { feedbackPresentation } from './feedbackPresentation';
import MicPermissionModal from './MicPermissionModal';

interface PracticeItemCardProps {
  feedbackId: number;
  item: PracticeItem;
}

type Attempt = {
  key: string;
  passed: boolean;
  retryRecommended: boolean;
  score: number;
  guidanceKr: string;
  phonemeTips: PhonemeTip[];
};

const KIND_LABEL: Record<PracticeItem['kind'], string> = {
  WORD: '단어',
  PHRASE: '구',
  SENTENCE: '문장',
};

const KIND_BADGE_CLASS: Record<PracticeItem['kind'], string> = {
  WORD: 'bg-brand-100 text-brand-700',
  PHRASE: 'bg-purple-100 text-purple-700',
  SENTENCE: 'bg-emerald-100 text-emerald-700',
};

export default function PracticeItemCard({ feedbackId, item }: PracticeItemCardProps) {
  const recorder = useRecorder();
  // 카드별 고유 잠금 키. 같은 카드의 start / stop 만 lock 을 잡고 푼다.
  const lockKey = useId();
  const lock = useRecordingLock();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [busy, setBusy] = useState(false);
  // 학습 도중 권한 모달을 닫으면 다음 권한 상태 변화 (정상 / recording) 가 올 때까지 다시 안 띄운다.
  const [micModalDismissed, setMicModalDismissed] = useState(false);

  useEffect(() => {
    if (recorder.status === 'idle' || recorder.status === 'recording') {
      setMicModalDismissed(false);
    }
  }, [recorder.status]);

  // 카드 unmount 시 자신이 보유한 lock 을 자동 해제 — 다른 카드 / 다음 학습이 막히지 않게 한다.
  useEffect(() => () => lock.release(lockKey), [lock, lockKey]);

  const showMicModal =
    !micModalDismissed &&
    (recorder.status === 'denied' || recorder.status === 'unsupported');

  const handleStart = async (): Promise<boolean> => {
    if (busy) return false;
    // 다른 카드가 이미 녹음 중이면 즉시 차단 — 동시 getUserMedia 호출 충돌 / 마이크 경쟁 방지.
    if (!lock.acquire(lockKey)) {
      toast.info('다른 카드가 녹음 중이에요. 끝나면 다시 시도해 주세요.');
      return false;
    }
    // start 가 false 를 돌려준 경우 (권한 거부 / 미지원 / 더블 클릭) lock 이 그대로 남으면 다른 카드가
    // 영영 막힌다. 결과를 직접 보고 즉시 푼다 — closure 의 status 는 stale 이라 신뢰할 수 없다.
    const started = await recorder.start();
    if (!started) {
      lock.release(lockKey);
    }
    return started;
  };

  const handleStop = async () => {
    if (busy) return;
    setBusy(true);
    const result = await recorder.stop();
    lock.release(lockKey);
    if (!result) {
      setBusy(false);
      return;
    }
    try {
      const evaluation = await feedbackApi.retryWord(feedbackId, result.blob, {
        filename: 'retry.wav',
        word: item.text,
      });
      setAttempts((prev) => [
        ...prev,
        {
          key: `attempt-${prev.length}`,
          passed: evaluation.passed,
          retryRecommended: evaluation.retryRecommended,
          score: evaluation.score,
          guidanceKr: evaluation.guidanceKr,
          phonemeTips: evaluation.phonemeTips ?? [],
        },
      ]);
    } catch (err) {
      notifyApiError(err, '재연습 평가에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {showMicModal && (
        <MicPermissionModal
          reason={recorder.status === 'unsupported' ? 'unsupported' : 'denied'}
          errorMessage={recorder.errorMessage}
          onRetry={() => {
            setMicModalDismissed(false);
            void recorder.start();
          }}
          onDismiss={() => setMicModalDismissed(true)}
        />
      )}
      <BotBubble>
        <div className="bg-white rounded-xl p-4 border-2 border-brand-100 space-y-3">
          {/* 헤더 — [kind 배지] [전체 텍스트 wrap]. truncate 를 쓰지 않아 긴 문장도 그대로 보인다. */}
          <div className="flex items-start gap-2">
            <span
              className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${KIND_BADGE_CLASS[item.kind]}`}
            >
              {KIND_LABEL[item.kind]}
            </span>
            <p className="text-base font-bold text-gray-900 leading-snug break-words flex-1 min-w-0">
              {item.text}
            </p>
          </div>
          {item.reason && (
            <p className="text-xs text-gray-500 leading-snug">{item.reason}</p>
          )}
          {/* 녹음 버튼 — 카드 하단 전체 폭. 헤더 텍스트와 가로 공간을 다투지 않는다. */}
          <RecordButton
            isRecording={recorder.isRecording}
            busy={busy}
            onStart={handleStart}
            onStop={handleStop}
            idleLabel={attempts.length > 0 ? '다시 발음하기' : '녹음 시작'}
            variant="block"
          />
        </div>

        {attempts.map((attempt, index) => (
          <AttemptResult
            key={attempt.key}
            attempt={attempt}
            // 새로 추가된 시도일 때만 효과음을 울리도록 마지막 인덱스를 표식으로 넘긴다.
            isLatest={index === attempts.length - 1}
          />
        ))}
      </BotBubble>
    </>
  );
}

// 한 번의 재시도 평가 결과. 헤드라인·색·효과음 모두 feedbackPresentation 한 곳에서 결정한다.
function AttemptResult({ attempt, isLatest }: { attempt: Attempt; isLatest: boolean }) {
  const view = feedbackPresentation({
    passed: attempt.passed,
    retryRecommended: attempt.retryRecommended,
    score: attempt.score,
    // 재시도 응답은 별도 합격선 필드를 내려주지 않으므로 score.ts 의 폴백을 쓴다.
    passThreshold: null,
  });
  const Icon = view.icon;
  const tokens = view.tokens;

  // 최신 시도가 화면에 막 들어왔을 때 한 번만 효과음. 이전 시도들이 같이 다시 렌더돼도 울리지 않는다.
  useEffect(() => {
    if (!isLatest) return;
    playScoreFanfare(view.tier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.key]);

  return (
    <div className="mt-3 flex items-start gap-3">
      <div
        className={`w-10 h-10 ${tokens.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}
      >
        {Icon && <Icon size={22} className={tokens.iconFg} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-base font-bold ${tokens.text}`}>{view.headline}</p>
        <p className={`text-2xl font-bold leading-tight mb-1 ${tokens.textStrong}`}>
          {attempt.score.toFixed(1)}
          <span className="text-sm font-medium text-gray-500 ml-1">점</span>
        </p>
        {attempt.guidanceKr && (
          <p className="text-sm text-gray-700 leading-relaxed">
            {renderInlineMarkdown(attempt.guidanceKr)}
          </p>
        )}
        {attempt.phonemeTips.length > 0 && (
          <ul className="mt-2 space-y-1">
            {attempt.phonemeTips.map((tip, i) => (
              <li
                key={`tip-${attempt.key}-${i}`}
                className="text-xs text-brand-900 leading-snug"
              >
                <span className="font-bold mr-1">{tip.phoneme}</span>
                {tip.koreanCue && <span className="mr-1">({tip.koreanCue})</span>}
                <span>{tip.tip}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
