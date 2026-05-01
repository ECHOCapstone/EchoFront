// 학습 종료 시점에 노출되는 종합 피드백 + 재연습 단어 흐름.
// 백엔드의 Feedback 객체를 받아 화면을 채우고, 재녹음 시 /api/feedback/{id}/retry-word 로 즉시 평가.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { BotBubble, UserBubble } from './ChatBubble';
import RecordButton from './RecordButton';
import { feedbackApi, type Feedback } from '../api';
import { useAuth } from '../auth/useAuth';
import { useRecorder } from '../hooks/useRecorder';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

interface FeedbackFlowProps {
  feedback: Feedback;
  // 재연습 단어 통과 + EXP 팝업 닫기 직후 호출되는 hook. 미지정 시 기본적으로 랭킹으로 이동한다.
  // 트랙 진행 모드 등에서는 이 곳에 다음 챕터 진입 등 도메인별 후속 동작을 주입한다.
  onComplete?: () => void;
  // EXP 팝업의 1차 액션 라벨. 미지정 시 "확인" 으로 노출된다.
  completeLabel?: string;
}

type Attempt = {
  key: string;
  correct: boolean;
  guidanceKr: string;
};

export default function FeedbackFlow({ feedback, onComplete, completeLabel }: FeedbackFlowProps) {
  const navigate = useNavigate();
  const recorder = useRecorder();
  const { refresh } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showExpPopup, setShowExpPopup] = useState(false);

  const practiceWord = feedback.practiceWord ?? 'rabbit';

  const handleStart = async () => {
    // 정답 판정이 한 번 떨어졌더라도 사용자가 더 또렷하게 다시 발음해 보고 싶어 할 수 있어
    // 녹음 자체는 항상 허용한다. busy 일 때만 가드한다.
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

  // EXP 보상 적용은 반드시 백엔드 단일 진입점(POST /api/feedback/{id}/complete) 을 거친다.
  // 응답에 갱신된 사용자 정보가 들어있고, refresh() 한 번이면 StatusHeader 의 EXP/streak 가 즉시 반영된다.
  const handleCompleteAndGetExp = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await feedbackApi.complete(feedback.id);
      await refresh();
      setShowExpPopup(true);
    } catch (err) {
      notifyApiError(err, '학습 완료 처리에 실패했습니다.');
    } finally {
      setCompleting(false);
    }
  };

  const handleClosePopup = () => {
    setShowExpPopup(false);
    if (onComplete) {
      onComplete();
      return;
    }
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
        <p className="text-gray-800">
          아래 단어를 다시 한 번 연습해 볼까요? 녹음 버튼을 누르고 발음해 보세요.
        </p>
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

      {/* 재연습 단어 박스 + 녹음 버튼은 항상 attempts 의 가장 아래에 둔다.
          첫 시도 화면에선 안내 메시지 바로 다음에, 시도 후엔 마지막 결과 다음에 자연스럽게 노출돼
          "다시 발음하기" 액션이 헷갈리지 않는다. */}
      <BotBubble>
        <div className="flex items-center justify-between gap-3 bg-white rounded-xl p-4 border-2 border-sky-100">
          <p className="text-xl font-bold text-gray-900">{practiceWord}</p>
          <RecordButton
            isRecording={recorder.isRecording}
            busy={busy}
            onStart={handleStart}
            onStop={handleStop}
            idleLabel={attempts.length > 0 ? '다시 발음하기' : '녹음 시작'}
            variant="inline"
          />
        </div>
      </BotBubble>

      {/* 학습 완료 버튼은 종합 피드백 도달 시점부터 항상 노출된다.
          챕터의 모든 step 통과 = 학습 완료로 보고, 재연습 단어 정답 여부와 무관하게 EXP 보상을 허용한다. */}
      <div className="pt-4">
        <Button
          onClick={handleCompleteAndGetExp}
          disabled={completing}
          className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white text-lg font-bold rounded-2xl disabled:opacity-60"
        >
          {completing ? '처리 중...' : '학습 완료하고 경험치 획득'}
        </Button>
      </div>

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
              {completeLabel ?? '확인'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
