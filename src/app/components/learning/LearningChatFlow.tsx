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
import { UserBubble } from '../ChatBubble';
import { useRecorder } from '../../hooks/useRecorder';
import { useTtsPlayer } from '../../hooks/useTtsPlayer';
import type { RecordingResult } from '../../api';
import { notifyApiError } from '../../lib/notify';
import FeedbackBubble, { type FeedbackData } from './FeedbackBubble';
import PromptBubble from './PromptBubble';
import MicPermissionModal from './MicPermissionModal';

// 채팅 흐름에 노출되는 한 단계. id 는 부모 도메인 (LearningStep / SessionSentence) 의 식별자를 그대로 쓴다.
export interface LearningPrompt {
  id: number;
  instruction: string;         // 봇 말풍선 본문 (한국어 안내)
  target: string | null;       // 발음할 영문 단어/문장. 없으면 굵게 노출되지 않는다.
  canRecord: boolean;          // false 면 안내만 표시하고 녹음 버튼 자체를 띄우지 않는다.
  ttsText: string | null;      // 우측 스피커 버튼으로 들려줄 텍스트. 없으면 버튼 자체가 사라진다.
  // 영문 target 의 한국어 자막. 백엔드 학습 상세 응답에 함께 실려와 첫 렌더부터 즉시 노출된다.
  // null 이면 PromptBubble 이 자막 줄 자체를 그리지 않는다.
  koreanTranslation: string | null;
}

interface LearningChatFlowProps {
  prompts: LearningPrompt[];
  upload: (audio: Blob, prompt: LearningPrompt) => Promise<RecordingResult>;
  // 마지막 RECORD 까지 끝났을 때 한 번 호출된다. recordingIds 는 prompt 별 가장 마지막 시도의 id 만 모은 것.
  onUnitComplete: (recordingIds: number[]) => void;
  // 매 prompt 완료 (다음 단계로 이동) 시 호출되는 콜백. 부모가 진행 상태를 백엔드에 저장하는 데 사용한다.
  // index 는 방금 완료한 prompt 의 0-based 위치 (prompts 배열 기준). 없으면 호출되지 않는다.
  onStepCompleted?: (completedPromptIndex: number) => void;
  // 부모가 종합 피드백 생성 등 후속 흐름에 들어가 있을 때 액션 버튼을 잠근다.
  disabled?: boolean;
  // "다음으로" 버튼 라벨. 챕터/세션 화면이 다른 명사를 쓰므로 외부 주입.
  advanceLabel?: string;
  // 마지막 prompt 일 때의 라벨.
  finalAdvanceLabel?: string;
  // 이어서 학습 시 시작할 prompt 의 0-based 인덱스. 미지정 시 처음(0)부터 시작한다.
  // 음수 / 범위 초과 값은 무시되어 안전하게 0 으로 정규화된다.
  startFromIndex?: number;
}

// 채팅 흐름의 한 항목. 봇 안내(bot-prompt) · 사용자 녹음 표시(user-record) · 피드백(bot-feedback) 셋 중 하나다.
// 피드백의 실제 표현은 FeedbackBubble 이, 데이터 모양은 FeedbackData 가 책임진다.
type ChatItem =
  | { kind: 'bot-prompt'; key: string; prompt: LearningPrompt }
  | { kind: 'user-record'; key: string; promptId: number; score: number | null }
  | { kind: 'bot-feedback'; key: string; promptId: number; data: FeedbackData };

export default function LearningChatFlow({
  prompts,
  upload,
  onUnitComplete,
  onStepCompleted,
  disabled = false,
  advanceLabel = '다음으로',
  finalAdvanceLabel = '학습 마무리',
  startFromIndex = 0,
}: LearningChatFlowProps) {
  const recorder = useRecorder();
  const tts = useTtsPlayer();

  // prompts 가 바뀌면 부모가 key 로 리마운트한다는 가정 아래, 초기값은 한 번만 계산한다.
  const initial = useMemo(() => buildInitial(prompts, startFromIndex), [prompts, startFromIndex]);
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
          data: {
            guidanceKr: uploaded.guidanceKr ?? '',
            score: uploaded.stepScore ?? null,
            passed: uploaded.passed,
            retryRecommended: uploaded.retryRecommended,
            strengths: uploaded.strengths ?? [],
            weaknesses: uploaded.weaknesses ?? [],
            phonemeTips: uploaded.phonemeTips ?? [],
            speechRate: uploaded.speechRate ?? 'NORMAL',
            alignment: {
              targetText: currentPrompt.target,
              perceived: uploaded.perceived,
              canonical: uploaded.canonical,
              errors: uploaded.errors,
              wrongWords: uploaded.wrongWords,
              canonicalWords: uploaded.canonicalWords ?? [],
            },
            passThreshold: uploaded.passThreshold ?? null,
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
    // 방금 사용자가 "다음으로" 를 눌렀다는 건 promptIndex 위치의 prompt 를 완료했다는 의미.
    // 부모가 백엔드 진행 상태를 갱신할 수 있게 인덱스를 통보한다 (실패해도 학습 흐름은 막지 않는다).
    const completedIndex = promptIndex;
    if (completedIndex >= 0 && completedIndex < prompts.length) {
      onStepCompleted?.(completedIndex);
    }
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
          // 가장 최근 피드백이고 현재 prompt 와 일치할 때만 액션 버튼을 활성화한다.
          const isActive =
            !disabled &&
            !doneSignaled &&
            item.key === latestFeedbackKey &&
            currentPrompt !== null &&
            item.promptId === currentPrompt.id;
          return (
            <FeedbackBubble
              key={item.key}
              data={item.data}
              itemKey={item.key}
              isActive={isActive}
              isLast={promptIndex >= prompts.length - 1}
              busy={busyStep}
              advanceLabel={advanceLabel}
              finalAdvanceLabel={finalAdvanceLabel}
              onRetry={handleRetry}
              onAdvance={handleAdvance}
            />
          );
        }

        // bot-prompt
        const p = item.prompt;
        const isPromptActive =
          idx === chat.length - 1 && showRecordButton && p.id === currentPrompt?.id;
        return (
          <PromptBubble
            key={item.key}
            prompt={p}
            isActive={isPromptActive}
            isRecording={recorder.isRecording}
            busy={busyStep}
            koreanTranslation={p.koreanTranslation ?? undefined}
            onPlayTts={tts.play}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        );
      })}
      <div ref={chatBottomRef} />
    </>
  );
}

// 첫 RECORD 가 등장할 때까지의 INTRO 들 + 그 RECORD 까지를 한 묶음으로 보여준다.
// 모두 INTRO 라면 전체를 한 번에 보여주고 cursor 는 끝으로 이동한다.
// startFromIndex 가 0 보다 크면 그 위치 직전까지의 prompt 들은 건너뛰고, startFromIndex 부터 같은
// "다음 RECORD 까지" 묶음을 만든다 — "이어서" 흐름에서 이미 끝낸 step 을 다시 보여주지 않는다.
function buildInitial(
  prompts: LearningPrompt[],
  startFromIndex: number,
): { items: ChatItem[]; cursor: number } {
  const items: ChatItem[] = [];
  const safeStart = Math.max(0, Math.min(startFromIndex, prompts.length));
  let cursor = safeStart;
  while (cursor < prompts.length) {
    const p = prompts[cursor];
    items.push({ kind: 'bot-prompt', key: `p-${p.id}-${cursor}`, prompt: p });
    if (p.canRecord) break;
    cursor += 1;
  }
  return { items, cursor };
}
