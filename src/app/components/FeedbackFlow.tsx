// 학습 종료 시점에 노출되는 종합 피드백 + 추가 학습 항목 흐름.
// 백엔드의 Feedback 을 받아 화면을 채우고, 각 추가 학습 항목은 PracticeItemCard 가 자체적으로 평가한다.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Zap } from 'lucide-react';
import { Button } from './ui/button';
import { BotBubble } from './ChatBubble';
import PracticeItemCard from './learning/PracticeItemCard';
import { feedbackApi, type Feedback, type PracticeItem } from '../api';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';
import { celebrateChapter } from '../lib/reward';
import { accuracyColorClass } from '../lib/score';
import { renderInlineMarkdown } from '../lib/markdownLite';
import booExp from '@/assets/boo-pic/BOO12-2.png';

interface FeedbackFlowProps {
  feedback: Feedback;
  // 추가 학습 + EXP 팝업 닫기 직후 호출되는 hook. 미지정 시 기본적으로 랭킹으로 이동한다.
  // 트랙 진행 모드 등에서는 이 곳에 다음 챕터 진입 등 도메인별 후속 동작을 주입한다.
  onComplete?: () => void;
  // EXP 팝업의 1차 액션 라벨. 미지정 시 "확인" 으로 노출된다.
  completeLabel?: string;
  // false 면 "학습 완료하고 경험치 획득" 버튼을 노출하지 않는다. 이미 완료한 피드백을
  // 다시 열어보는 화면(Feedbacks 목록 진입)에서 EXP 가 중복 가산되지 않도록 차단한다.
  allowCompletion?: boolean;
}

export default function FeedbackFlow({
  feedback,
  onComplete,
  completeLabel,
  allowCompletion = true,
}: FeedbackFlowProps) {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [completing, setCompleting] = useState(false);
  const [showExpPopup, setShowExpPopup] = useState(false);
  // 사용자가 명시적으로 추가 학습을 시작했는지. true 가 되어야만 카드 리스트가 노출된다.
  const [retryStarted, setRetryStarted] = useState(false);
  // complete API 응답으로 갱신된 사용자의 exp 와 호출 직전 exp 의 차이.
  // 백엔드 app.gamification.completion-exp 가 SSOT 이므로 프론트는 이 값을 그대로 노출한다.
  const [expGained, setExpGained] = useState<number | null>(null);

  // nextPracticeItems 가 비어 있으면 백엔드가 추천을 만들지 못한 케이스. 카드 자체를 노출하지 않는다.
  const items: PracticeItem[] = feedback.nextPracticeItems ?? [];
  const hasItems = items.length > 0;
  const weakPhonemeLabel = feedback.weakPhoneme?.toUpperCase();
  // 점수 구간별 강조 색. 낮은 점수에 무조건 sky 색을 주면 "잘했다" 라는 신호로 오해된다.
  const accuracyColor = accuracyColorClass(feedback.accuracy);

  // EXP 보상 적용은 반드시 백엔드 단일 진입점(POST /api/feedback/{id}/complete) 을 거친다.
  // 응답에 갱신된 사용자 정보가 들어있고, 호출 전 exp 와 비교해 실제 가산량을 산출한다.
  const handleCompleteAndGetExp = async () => {
    if (completing) return;
    setCompleting(true);
    const previousExp = user?.exp ?? 0;
    try {
      const updated = await feedbackApi.complete(feedback.id);
      const gained = updated.exp - previousExp;
      // 음수가 나올 일은 없지만 안전망으로 0 으로 끌어올려 둔다.
      setExpGained(gained > 0 ? gained : 0);
      await refresh();
      setShowExpPopup(true);
      // EXP 팝업이 뜨는 순간 보상 confetti.
      celebrateChapter();
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
    navigate(paths.challenge);
  };

  return (
    <>
      <BotBubble>
        <p className="text-gray-800 leading-relaxed mb-3">
          이번 학습 정확도는 <span className={`font-bold ${accuracyColor}`}>{feedback.accuracy.toFixed(1)}점</span>이에요.
        </p>
        {feedback.guidanceKr && (
          <p className="text-gray-700 leading-relaxed">
            {renderInlineMarkdown(feedback.guidanceKr)}
          </p>
        )}
      </BotBubble>

      {(feedback.strengths.length > 0 || feedback.weaknesses.length > 0) && (
        <BotBubble>
          {feedback.strengths.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-bold text-green-700 mb-1">잘한 점</p>
              <ul className="text-sm text-gray-800 list-disc pl-5 space-y-0.5">
                {feedback.strengths.map((s, i) => <li key={`s-${i}`}>{s}</li>)}
              </ul>
            </div>
          )}
          {feedback.weaknesses.length > 0 && (
            <div>
              <p className="text-xs font-bold text-orange-600 mb-1">보완할 점</p>
              <ul className="text-sm text-gray-800 list-disc pl-5 space-y-0.5">
                {feedback.weaknesses.map((w, i) => <li key={`w-${i}`}>{w}</li>)}
              </ul>
            </div>
          )}
        </BotBubble>
      )}

      {hasItems && !retryStarted && (
        <BotBubble>
          <div className="flex items-center justify-between gap-3">
            <p className="text-gray-800">
              {weakPhonemeLabel
                ? <>약점 음소 <span className="font-bold text-brand-600">{weakPhonemeLabel}</span> 를 한 번 더 연습해 볼까요?</>
                : '추천 항목으로 한 번 더 연습해 볼까요?'}
            </p>
            <button
              onClick={() => setRetryStarted(true)}
              className="flex items-center justify-center px-4 h-11 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl whitespace-nowrap"
            >
              한 번 더 연습하기
            </button>
          </div>
        </BotBubble>
      )}

      {hasItems && retryStarted && (
        <BotBubble>
          <p className="text-gray-800">
            아래 단어 · 구 · 문장을 따라 발음해 보세요. 카드마다 녹음하면 즉시 평가가 표시됩니다.
          </p>
        </BotBubble>
      )}

      {hasItems && retryStarted && items.map((item, i) => (
        <PracticeItemCard
          key={`item-${i}-${item.text}`}
          feedbackId={feedback.id}
          item={item}
        />
      ))}

      {/* "학습 완료하고 경험치 획득" 버튼은 진행 중인 학습에서만 노출한다.
          이미 완료한 피드백을 다시 보는 Feedbacks 화면에선 allowCompletion=false 로 숨겨
          같은 피드백으로 EXP 가 중복 가산되는 것을 막는다. */}
      {allowCompletion && (
        <div className="pt-4">
          <Button
            onClick={handleCompleteAndGetExp}
            disabled={completing}
            className="w-full h-14 bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold rounded-2xl disabled:opacity-60"
          >
            {completing ? '처리 중...' : '학습 완료하고 경험치 획득'}
          </Button>
        </div>
      )}

      {showExpPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-full h-56 bg-white rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
              <img src={booExp} alt="EXP 획득" className="h-full object-contain" />
            </div>
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Zap size={40} className="text-yellow-500 fill-yellow-500" />
                <span className="text-4xl font-bold text-gray-900">
                  EXP +{expGained ?? 0}
                </span>
              </div>
              <p className="text-lg text-gray-600">학습을 완료했습니다!</p>
            </div>
            <Button
              onClick={handleClosePopup}
              className="w-full h-14 bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold rounded-2xl"
            >
              {completeLabel ?? '확인'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
