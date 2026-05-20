// 종합 피드백 단계에서 노출되는 추가 학습 항목 한 칸.
// 단어 / 구 / 문장 셋 중 하나의 kind 를 가지며, 카드 안에 직접 RecordButton 을 둬서
// /api/feedback/{id}/retry-word 호출로 즉시 평가할 수 있다.

import { useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { BotBubble } from '../ChatBubble';
import RecordButton from '../RecordButton';
import { feedbackApi, type PhonemeTip, type PracticeItem } from '../../api';
import { useRecorder } from '../../hooks/useRecorder';
import { notifyApiError } from '../../lib/notify';

interface PracticeItemCardProps {
  feedbackId: number;
  item: PracticeItem;
}

type Attempt = {
  key: string;
  correct: boolean;
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
  WORD: 'bg-sky-100 text-sky-700',
  PHRASE: 'bg-purple-100 text-purple-700',
  SENTENCE: 'bg-emerald-100 text-emerald-700',
};

export default function PracticeItemCard({ feedbackId, item }: PracticeItemCardProps) {
  const recorder = useRecorder();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    if (busy) return;
    await recorder.start();
  };

  const handleStop = async () => {
    if (busy) return;
    setBusy(true);
    const result = await recorder.stop();
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
          correct: evaluation.correct,
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
    <BotBubble>
      <div className="bg-white rounded-xl p-4 border-2 border-sky-100 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${KIND_BADGE_CLASS[item.kind]}`}>
              {KIND_LABEL[item.kind]}
            </span>
            <p className="text-lg font-bold text-gray-900 truncate">{item.text}</p>
          </div>
          <RecordButton
            isRecording={recorder.isRecording}
            busy={busy}
            onStart={handleStart}
            onStop={handleStop}
            idleLabel={attempts.length > 0 ? '다시 발음하기' : '녹음 시작'}
            variant="inline"
          />
        </div>
        {item.reason && <p className="text-xs text-gray-500 leading-snug">{item.reason}</p>}
      </div>

      {attempts.map((attempt) => {
        const passed = attempt.passed;
        const retry = attempt.retryRecommended;
        const headerColor = passed ? 'text-green-600' : retry ? 'text-orange-500' : 'text-gray-900';
        const headline = passed ? '통과!' : retry ? '한 번 더 시도해 보세요.' : '결과를 확인했어요.';
        const iconBg = passed ? 'bg-green-100' : retry ? 'bg-orange-100' : 'bg-gray-100';
        const Icon = passed ? CheckCircle2 : Info;
        const iconColor = passed ? 'text-green-500' : retry ? 'text-orange-500' : 'text-gray-500';
        const scoreColor = passed ? 'text-green-600' : retry ? 'text-orange-500' : 'text-gray-900';
        return (
          <div key={attempt.key} className="mt-3 flex items-start gap-3">
            <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
              <Icon size={22} className={iconColor} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-base font-bold ${headerColor}`}>{headline}</p>
              <p className={`text-2xl font-bold leading-tight mb-1 ${scoreColor}`}>
                {attempt.score.toFixed(1)}<span className="text-sm font-medium text-gray-500 ml-1">점</span>
              </p>
              {attempt.guidanceKr && (
                <p className="text-sm text-gray-700 leading-relaxed">{attempt.guidanceKr}</p>
              )}
              {attempt.phonemeTips.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attempt.phonemeTips.map((tip, i) => (
                    <li key={`tip-${attempt.key}-${i}`} className="text-xs text-sky-900 leading-snug">
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
      })}
    </BotBubble>
  );
}
