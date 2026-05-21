// 추천 학습(챕터 step) 과 맞춤 학습(세션 문장) 의 채팅 흐름을 통합한 단일 컴포넌트.
//
// 두 화면이 공유하는 흐름:
//   bot-prompt(안내·녹음 권유) → 녹음 → user-record + bot-feedback(가이드 + 정렬 시각화) →
//   "다시" 또는 "다음으로" 선택. 마지막 record 가 끝나면 onUnitComplete(recordingIds) 콜백.
//
// 차이점은 prompt 의 모양뿐이라 LearningPrompt 라는 일반 형태로 추상화한다.
//   - canRecord=false 인 INTRO 안내 단계는 사이에 끼울 수 있고 (챕터 흐름),
//   - 매 prompt 가 RECORD 인 단순 흐름도 그대로 표현된다 (세션 흐름).
//
// 부모는 prompts 가 바뀌면 key 로 컴포넌트를 다시 마운트해 채팅을 초기 상태로 리셋한다.

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, RotateCcw, Volume2 } from 'lucide-react';
import { BotBubble, UserBubble } from '../ChatBubble';
import PhonemeAlignment from '../PhonemeAlignment';
import RecordButton from '../RecordButton';
import { useRecorder } from '../../hooks/useRecorder';
import { useTtsPlayer } from '../../hooks/useTtsPlayer';
import type { PhonemeError, PhonemeTip, RecordingResult, WrongWord } from '../../api';
import { notifyApiError } from '../../lib/notify';
import MicPermissionModal from './MicPermissionModal';

// 채팅 흐름에 노출되는 한 단계. id 는 부모 도메인 (LearningStep / SessionSentence) 의 식별자를 그대로 쓴다.
export interface LearningPrompt {
  id: number;
  instruction: string;     // 봇 말풍선 본문 (한국어 안내)
  target: string | null;   // 발음할 영문 단어/문장. 없으면 굵게 노출되지 않는다.
  canRecord: boolean;      // false 면 안내만 표시하고 녹음 버튼 자체를 띄우지 않는다.
  ttsText: string | null;  // 우측 스피커 버튼으로 들려줄 텍스트. 없으면 버튼 자체가 사라진다.
}

interface LearningChatFlowProps {
  prompts: LearningPrompt[];
  upload: (audio: Blob, prompt: LearningPrompt) => Promise<RecordingResult>;
  // 마지막 RECORD 까지 끝났을 때 한 번 호출된다. recordingIds 는 prompt 별 가장 마지막 시도의 id 만 모은 것.
  onUnitComplete: (recordingIds: number[]) => void;
  // 부모가 종합 피드백 생성 등 후속 흐름에 들어가 있을 때 액션 버튼을 잠근다.
  disabled?: boolean;
  // "다음으로" 버튼 라벨. 챕터/세션 화면이 다른 명사를 쓰므로 외부 주입.
  advanceLabel?: string;
  // 마지막 prompt 일 때의 라벨.
  finalAdvanceLabel?: string;
}

type AlignmentSnapshot = {
  targetText: string | null;
  perceived: string[];
  canonical: string[];
  errors: PhonemeError[];
  wrongWords: WrongWord[];
};

type ChatItem =
  | { kind: 'bot-prompt'; key: string; prompt: LearningPrompt }
  | { kind: 'user-record'; key: string; promptId: number; score: number | null }
  | {
      kind: 'bot-feedback';
      key: string;
      promptId: number;
      guidanceKr: string;
      score: number | null;
      // 백엔드가 결정한 통과 여부 + 재학습 권고 — 프론트는 그대로 따른다 (SSOT).
      passed: boolean;
      retryRecommended: boolean;
      strengths: string[];
      weaknesses: string[];
      phonemeTips: PhonemeTip[];
      alignment: AlignmentSnapshot;
    };

export default function LearningChatFlow({
  prompts,
  upload,
  onUnitComplete,
  disabled = false,
  advanceLabel = '다음으로',
  finalAdvanceLabel = '학습 마무리',
}: LearningChatFlowProps) {
  const recorder = useRecorder();
  const tts = useTtsPlayer();

  // prompts 가 바뀌면 부모가 key 로 리마운트한다는 가정 아래, 초기값은 한 번만 계산한다.
  const initial = useMemo(() => buildInitial(prompts), [prompts]);
  const [chat, setChat] = useState<ChatItem[]>(initial.items);
  const [promptIndex, setPromptIndex] = useState(initial.cursor);
  const [latestRecordingByPromptId, setLatestRecordingByPromptId] = useState<Record<number, number>>({});
  const [busyStep, setBusyStep] = useState(false);
  const [doneSignaled, setDoneSignaled] = useState(false);
  // 사용자가 권한 모달을 "나중에" 로 닫았는지. status 가 다시 denied 로 떨어져도 같은 세션 동안은 안 띄운다.
  const [micModalDismissed, setMicModalDismissed] = useState(false);

  // 권한 상태가 변하면 dismiss 플래그를 초기화해서 사용자가 권한을 허용한 뒤 다시 막혔을 때 다시 안내가 뜨도록 한다.
  useEffect(() => {
    if (recorder.status === 'idle' || recorder.status === 'recording') {
      setMicModalDismissed(false);
    }
  }, [recorder.status]);
  const showMicModal =
    !micModalDismissed &&
    (recorder.status === 'denied' || recorder.status === 'unsupported');

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.length]);

  const currentPrompt: LearningPrompt | null =
    promptIndex < prompts.length ? prompts[promptIndex] : null;

  // 가장 최근 bot-feedback 만 액션 가능. 그 이전 시도의 버튼들은 자동으로 비활성화된다.
  const latestFeedbackKey = useMemo(() => {
    for (let i = chat.length - 1; i >= 0; i -= 1) {
      const item = chat[i];
      if (item.kind === 'bot-feedback') return item.key;
    }
    return null;
  }, [chat]);

  // 마지막 채팅이 현재 prompt 이고 RECORD 일 때만 녹음 버튼을 활성화한다.
  const lastItem = chat[chat.length - 1];
  const showRecordButton =
    !disabled &&
    !doneSignaled &&
    currentPrompt !== null &&
    currentPrompt.canRecord &&
    lastItem !== undefined &&
    lastItem.kind === 'bot-prompt' &&
    lastItem.prompt.id === currentPrompt.id;

  const handleStartRecording = async () => {
    if (busyStep) return;
    await recorder.start();
  };

  const handleStopRecording = async () => {
    if (!currentPrompt || !currentPrompt.canRecord || busyStep) return;
    setBusyStep(true);
    const result = await recorder.stop();
    if (!result) {
      setBusyStep(false);
      return;
    }
    try {
      const uploaded = await upload(result.blob, currentPrompt);
      setLatestRecordingByPromptId((prev) => ({ ...prev, [currentPrompt.id]: uploaded.id }));
      setChat((prev) => [
        ...prev,
        {
          kind: 'user-record',
          key: `u-${uploaded.id}`,
          promptId: currentPrompt.id,
          score: uploaded.stepScore ?? null,
        },
        {
          kind: 'bot-feedback',
          key: `f-${uploaded.id}`,
          promptId: currentPrompt.id,
          guidanceKr: uploaded.guidanceKr ?? '',
          score: uploaded.stepScore ?? null,
          passed: uploaded.passed,
          retryRecommended: uploaded.retryRecommended,
          strengths: uploaded.strengths ?? [],
          weaknesses: uploaded.weaknesses ?? [],
          phonemeTips: uploaded.phonemeTips ?? [],
          alignment: {
            targetText: currentPrompt.target,
            perceived: uploaded.perceived,
            canonical: uploaded.canonical,
            errors: uploaded.errors,
            wrongWords: uploaded.wrongWords,
          },
        },
      ]);
    } catch (err) {
      notifyApiError(err, '녹음 업로드에 실패했습니다.');
    } finally {
      setBusyStep(false);
    }
  };

  const handleRetry = () => {
    if (!currentPrompt) return;
    setChat((prev) => [
      ...prev,
      { kind: 'bot-prompt', key: `p-${currentPrompt.id}-retry-${prev.length}`, prompt: currentPrompt },
    ]);
  };

  const handleAdvance = () => {
    if (doneSignaled) return;
    let cursor = promptIndex + 1;
    const next: ChatItem[] = [];
    let foundRecord = false;
    while (cursor < prompts.length) {
      const p = prompts[cursor];
      next.push({ kind: 'bot-prompt', key: `p-${p.id}-${cursor}`, prompt: p });
      if (p.canRecord) {
        foundRecord = true;
        break;
      }
      cursor += 1;
    }
    if (next.length > 0) setChat((prev) => [...prev, ...next]);
    setPromptIndex(cursor);
    if (!foundRecord) {
      setDoneSignaled(true);
      onUnitComplete(Object.values(latestRecordingByPromptId));
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
      {chat.map((item, idx) => {
        if (item.kind === 'user-record') {
          const scoreLabel = item.score !== null ? ` · ${item.score.toFixed(1)}점` : '';
          return <UserBubble key={item.key}>녹음 완료!{scoreLabel}</UserBubble>;
        }

        if (item.kind === 'bot-feedback') {
          const isActive =
            !disabled &&
            !doneSignaled &&
            item.key === latestFeedbackKey &&
            currentPrompt !== null &&
            item.promptId === currentPrompt.id;
          const isLast = promptIndex >= prompts.length - 1;
          // 점수 임계와 LLM 판단을 합친 백엔드의 통과 신호 (passed) 와 재학습 권고 (retryRecommended) 를
          // 그대로 따라 액션 강조와 헤더 메시지를 결정한다.
          const passed = item.passed;
          const retryRecommended = item.retryRecommended;
          const headline = passed
            ? '통과! 다음으로 넘어가도 좋아요.'
            : retryRecommended
              ? '한 번 더 시도해 볼까요?'
              : '결과를 확인했어요.';
          const headlineColor = passed ? 'text-green-600' : retryRecommended ? 'text-orange-500' : 'text-gray-900';
          // 통과 / 재학습 권고 상태를 헤드라인 옆 아이콘으로 단번에 인식하게 한다.
          const HeadlineIcon = passed ? CheckCircle2 : retryRecommended ? Info : null;
          const headlineIconClass = passed ? 'text-green-500' : 'text-orange-500';
          // 점수 색은 통과 / 권고 신호와 일치시켜 시각적 redundancy 를 준다.
          const scoreColor =
            item.score === null
              ? 'text-gray-500'
              : passed
                ? 'text-green-600'
                : retryRecommended
                  ? 'text-orange-500'
                  : 'text-gray-900';
          // primary CTA 는 passed 면 "다음으로", 아니면 "다시 발음하기".
          const primaryAdvance = passed;
          return (
            <BotBubble key={item.key}>
              <div className="flex items-start gap-2 mb-1">
                {HeadlineIcon && (
                  <HeadlineIcon size={20} className={`${headlineIconClass} flex-shrink-0 mt-0.5`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-semibold leading-relaxed ${headlineColor}`}>
                    {headline}
                  </p>
                  {item.score !== null && (
                    <p className={`text-2xl font-bold leading-tight ${scoreColor}`}>
                      {item.score.toFixed(1)}<span className="text-sm font-medium text-gray-500 ml-1">점</span>
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                {item.guidanceKr || ' '}
              </p>
              {item.weaknesses.length > 0 && (
                <ul className="mb-3 text-xs text-gray-600 list-disc pl-5 space-y-0.5">
                  {item.weaknesses.map((w, i) => (
                    <li key={`weak-${item.key}-${i}`}>{w}</li>
                  ))}
                </ul>
              )}
              {item.phonemeTips.length > 0 && (
                <div className="mb-3 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 space-y-1">
                  {item.phonemeTips.map((tip, i) => (
                    <p key={`tip-${item.key}-${i}`} className="text-xs text-sky-900 leading-snug">
                      <span className="font-bold mr-1">{tip.phoneme}</span>
                      {tip.koreanCue && <span className="mr-1">({tip.koreanCue})</span>}
                      <span>{tip.tip}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="mb-3">
                <PhonemeAlignment
                  targetText={item.alignment.targetText}
                  canonical={item.alignment.canonical}
                  perceived={item.alignment.perceived}
                  errors={item.alignment.errors}
                  wrongWords={item.alignment.wrongWords}
                />
              </div>
              {isActive && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRetry}
                    disabled={busyStep}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-11 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${
                      primaryAdvance
                        ? 'bg-white border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50 text-gray-900'
                        : 'bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-500'
                    }`}
                  >
                    <RotateCcw size={16} className={primaryAdvance ? 'text-orange-500' : 'text-white'} />
                    <span>다시 발음하기</span>
                  </button>
                  <button
                    onClick={handleAdvance}
                    disabled={busyStep}
                    className={`flex-1 h-11 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${
                      primaryAdvance
                        ? 'bg-sky-500 hover:bg-sky-600 text-white'
                        : 'bg-white border-2 border-gray-300 hover:border-sky-400 hover:bg-sky-50 text-gray-900'
                    }`}
                  >
                    {isLast ? finalAdvanceLabel : advanceLabel}
                  </button>
                </div>
              )}
            </BotBubble>
          );
        }

        // bot-prompt
        const p = item.prompt;
        const isPromptActive =
          idx === chat.length - 1 && showRecordButton && p.id === currentPrompt?.id;
        return (
          <BotBubble key={item.key}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-base text-gray-900 leading-relaxed flex-1">
                {p.instruction}
                {p.target && (
                  <span className="block mt-2 text-lg font-bold">{p.target}</span>
                )}
              </p>
              {p.ttsText && (
                <button
                  onClick={() => tts.play(p.ttsText)}
                  className="p-2 bg-sky-500 hover:bg-sky-600 rounded-full transition-colors flex-shrink-0"
                  aria-label="예시 음성 듣기"
                >
                  <Volume2 size={18} className="text-white" />
                </button>
              )}
            </div>
            {isPromptActive && (
              <RecordButton
                isRecording={recorder.isRecording}
                busy={busyStep}
                onStart={handleStartRecording}
                onStop={handleStopRecording}
                busyLabel="업로드 중..."
              />
            )}
          </BotBubble>
        );
      })}
      <div ref={chatBottomRef} />
    </>
  );
}

// 첫 RECORD 가 등장할 때까지의 INTRO 들 + 그 RECORD 까지를 한 묶음으로 보여준다.
// 모두 INTRO 라면 전체를 한 번에 보여주고 cursor 는 끝으로 이동한다.
function buildInitial(prompts: LearningPrompt[]): { items: ChatItem[]; cursor: number } {
  const items: ChatItem[] = [];
  let cursor = 0;
  while (cursor < prompts.length) {
    const p = prompts[cursor];
    items.push({ kind: 'bot-prompt', key: `p-${p.id}-${cursor}`, prompt: p });
    if (p.canRecord) break;
    cursor += 1;
  }
  return { items, cursor };
}
