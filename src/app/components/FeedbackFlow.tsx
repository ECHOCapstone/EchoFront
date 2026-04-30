// 학습 종료 시점에 노출되는 종합 피드백 + 재연습 단어 흐름.
// 백엔드의 Feedback 객체를 받아 화면을 채우고, 재녹음 시 /api/feedback/{id}/retry-word 로 즉시 평가.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Mic, Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { BotBubble, UserBubble } from './ChatBubble';
import { feedbackApi, type Feedback } from '../api';
import { useRecorder } from '../hooks/useRecorder';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

interface FeedbackFlowProps {
  feedback: Feedback;
}

type Attempt = {
  key: string;
  correct: boolean;
  guidanceKr: string;
};

export default function FeedbackFlow({ feedback }: FeedbackFlowProps) {
  const navigate = useNavigate();
  const recorder = useRecorder();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [busy, setBusy] = useState(false);
  const [showExpPopup, setShowExpPopup] = useState(false);

  const practiceWord = feedback.practiceWord ?? 'rabbit';
  const isCorrect = attempts.some((a) => a.correct);

  const handleStart = async () => {
    if (busy || isCorrect) return;
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
      const evaluation = await feedbackApi.retryWord(feedback.id, result.blob, 'retry.wav');
      setAttempts((prev) => [
        ...prev,
        {
          key: `attempt-${prev.length}`,
          correct: evaluation.correct,
          guidanceKr: evaluation.guidanceKr,
        },
      ]);
    } catch (err) {
      notifyApiError(err, '재연습 평가에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteAndGetExp = () => setShowExpPopup(true);

  const handleClosePopup = () => {
    setShowExpPopup(false);
    navigate(paths.ranking);
  };

  return (
    <>
      <BotBubble>
        <p className="text-gray-800 leading-relaxed mb-3">
          이번 학습 정확도는 <span className="font-bold text-sky-600">{feedback.accuracy.toFixed(1)}점</span>이에요.
        </p>
        {feedback.guidanceKr && (
          <p className="text-gray-700 leading-relaxed">{feedback.guidanceKr}</p>
        )}
      </BotBubble>

      <BotBubble>
        <p className="text-gray-800 mb-4">
          아래 단어를 다시 한 번 연습해 볼까요? 녹음 버튼을 누르고 발음해 보세요.
        </p>
        <div className="flex items-center justify-between gap-3 bg-white rounded-xl p-4 border-2 border-sky-100">
          <p className="text-xl font-bold text-gray-900">{practiceWord}</p>
          {!isCorrect && (
            <button
              onClick={recorder.isRecording ? handleStop : handleStart}
              disabled={busy}
              className={`flex items-center justify-center gap-1.5 px-3 h-11 bg-white border-2 ${
                recorder.isRecording
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-sky-500 hover:bg-sky-50'
              } text-gray-900 text-sm font-medium rounded-xl transition-colors whitespace-nowrap disabled:opacity-50`}
            >
              <Mic
                size={18}
                className={recorder.isRecording ? 'text-red-500 animate-pulse' : 'text-gray-600'}
              />
              <span>{recorder.isRecording ? '녹음 끝내기' : '녹음 시작'}</span>
            </button>
          )}
        </div>
      </BotBubble>

      {attempts.map((attempt) => (
        <div key={attempt.key} className="space-y-4">
          <UserBubble>녹음 완료!</UserBubble>
          <BotBubble>
            {attempt.correct ? (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={22} className="text-green-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 mb-1">정답입니다!</p>
                  <p className="text-sm text-gray-600">{attempt.guidanceKr}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles size={22} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 mb-1">다시 한 번 시도해 보세요.</p>
                  <p className="text-sm text-gray-600">{attempt.guidanceKr}</p>
                </div>
              </div>
            )}
          </BotBubble>
        </div>
      ))}

      {isCorrect && (
        <div className="pt-4">
          <Button
            onClick={handleCompleteAndGetExp}
            className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white text-lg font-bold rounded-2xl"
          >
            학습 완료하고 경험치 획득
          </Button>
        </div>
      )}

      {showExpPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-full h-48 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl flex items-center justify-center mb-6">
              <div className="w-32 h-32 bg-white rounded-full"></div>
            </div>
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Zap size={40} className="text-yellow-500 fill-yellow-500" />
                <span className="text-4xl font-bold text-gray-900">EXP +1000</span>
              </div>
              <p className="text-lg text-gray-600">학습을 완료했습니다!</p>
            </div>
            <Button
              onClick={handleClosePopup}
              className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white text-lg font-bold rounded-2xl"
            >
              확인
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
