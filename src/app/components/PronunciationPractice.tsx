// 챕터 학습 화면. URL 쿼리 ?scriptId=N (필수) + ?trackId=M&chapterIndex=K (트랙 모드에서만)
//
// 흐름
//   bot-step(RECORD) 노출 → 사용자 녹음 → POST /api/recordings →
//   user-record 버블(점수) + bot-feedback 버블(한국어 가이드 + 다음/다시 버튼) 노출 →
//   사용자가 "다음 단계" 또는 "다시 발음하기" 선택. 같은 step 의 재녹음은 누적되며,
//   종합 피드백 generate 호출 시에는 step 별 마지막 시도의 recordingId 만 전달한다.
//
// 트랙 모드의 학습 완료 처리
//   FeedbackFlow 의 EXP 팝업 닫기 hook 으로
//     - 다음 챕터가 있으면: 같은 트랙의 다음 챕터로 navigate (chapterIndex + 1)
//     - 마지막 챕터면: trackOverview 화면으로 돌아가기
//   단일 모드(트랙 컨텍스트 없음)일 때는 FeedbackFlow 기본 동작(=랭킹 이동) 을 그대로 사용한다.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { BotBubble, UserBubble } from './ChatBubble';
import FeedbackFlow from './FeedbackFlow';
import RecordButton from './RecordButton';
import {
  feedbackApi,
  recordingsApi,
  scriptsApi,
  tracksApi,
  type Feedback,
  type LearningStep,
  type ScriptDetail,
  type TrackDetail,
} from '../api';
import { useRecorder } from '../hooks/useRecorder';
import { useTtsPlayer } from '../hooks/useTtsPlayer';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

type ChatItem =
  | { kind: 'bot-step'; step: LearningStep }
  | { kind: 'user-record'; key: string; recordingId: number; stepId: number; score: number | null }
  | { kind: 'bot-feedback'; key: string; stepId: number; guidanceKr: string; score: number | null };

type TrackContext = { trackId: number; chapterIndex: number };

function readPositiveInt(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readNonNegativeInt(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export default function PronunciationPractice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const scriptId = useMemo(() => readPositiveInt(searchParams.get('scriptId')), [searchParams]);
  const trackContext = useMemo<TrackContext | null>(() => {
    const trackId = readPositiveInt(searchParams.get('trackId'));
    const chapterIndex = readNonNegativeInt(searchParams.get('chapterIndex'));
    if (trackId === null || chapterIndex === null) return null;
    return { trackId, chapterIndex };
  }, [searchParams]);

  const recorder = useRecorder();
  const tts = useTtsPlayer();

  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  // step.id → 가장 마지막 시도의 recordingId. 종합 피드백 generate 시 그대로 전송된다.
  const [latestRecordingByStep, setLatestRecordingByStep] = useState<Record<number, number>>({});
  const [unitDone, setUnitDone] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busyStep, setBusyStep] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // scriptId 가 비어 있거나 잘못된 경우는 트랙 목록(트랙 모드일 땐 트랙 상세) 으로 되돌린다.
  useEffect(() => {
    if (scriptId === null) {
      navigate(trackContext ? paths.trackOverview(trackContext.trackId) : paths.tracks, { replace: true });
    }
  }, [scriptId, trackContext, navigate]);

  // 챕터 자체 로드. URL 의 scriptId 가 바뀌면 채팅과 진행 상태가 모두 초기화된다.
  useEffect(() => {
    if (scriptId === null) return;
    let cancelled = false;
    setScript(null);
    setLoadError(null);
    setChat([]);
    setStepIndex(0);
    setLatestRecordingByStep({});
    setUnitDone(false);
    setFeedback(null);
    setGenerating(false);

    scriptsApi
      .detail(scriptId)
      .then((data) => {
        if (cancelled) return;
        setScript(data);
        const initial: ChatItem[] = [];
        let cursor = 0;
        while (cursor < data.steps.length) {
          initial.push({ kind: 'bot-step', step: data.steps[cursor] });
          if (data.steps[cursor].kind === 'RECORD') break;
          cursor += 1;
        }
        setChat(initial);
        setStepIndex(cursor);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : '학습 자료를 불러오지 못했습니다.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  // 트랙 모드일 때만 트랙 상세를 부수적으로 가져와 헤더 진행 상황과 다음 챕터 분기에 사용한다.
  useEffect(() => {
    if (!trackContext) {
      setTrack(null);
      return;
    }
    let cancelled = false;
    tracksApi
      .detail(trackContext.trackId)
      .then((data) => !cancelled && setTrack(data))
      .catch(() => {
        // 트랙 메타 실패는 학습 흐름 자체를 막지 않는다. 헤더 진행 표시만 비워진다.
        if (!cancelled) setTrack(null);
      });
    return () => {
      cancelled = true;
    };
  }, [trackContext]);

  // 새 채팅 메시지가 추가되면 자동으로 화면 가장 아래로 스크롤한다.
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.length, feedback, generating]);

  const currentStep = script && stepIndex < script.steps.length ? script.steps[stepIndex] : null;
  // 가장 최근 bot-feedback 만 액션 가능. 그 이전 시도의 버튼들은 비활성화된다.
  const latestFeedbackKey = useMemo(() => {
    for (let i = chat.length - 1; i >= 0; i -= 1) {
      const item = chat[i];
      if (item.kind === 'bot-feedback') return item.key;
    }
    return null;
  }, [chat]);

  const handleStartRecording = async () => {
    await recorder.start();
  };

  const handleStopRecording = async () => {
    if (!currentStep || currentStep.kind !== 'RECORD' || !script || busyStep) return;
    setBusyStep(true);
    const result = await recorder.stop();
    if (!result) {
      setBusyStep(false);
      return;
    }
    try {
      const uploaded = await recordingsApi.upload({
        audio: result.blob,
        filename: `step-${currentStep.id}.wav`,
        scriptId: script.id,
        stepId: currentStep.id,
      });
      setLatestRecordingByStep((prev) => ({ ...prev, [currentStep.id]: uploaded.id }));
      setChat((prev) => [
        ...prev,
        {
          kind: 'user-record',
          key: `u-${uploaded.id}`,
          recordingId: uploaded.id,
          stepId: currentStep.id,
          score: uploaded.stepScore ?? null,
        },
        {
          kind: 'bot-feedback',
          key: `f-${uploaded.id}`,
          stepId: currentStep.id,
          guidanceKr: uploaded.guidanceKr ?? '',
          score: uploaded.stepScore ?? null,
        },
      ]);
    } catch (err) {
      notifyApiError(err, '녹음 업로드에 실패했습니다.');
    } finally {
      setBusyStep(false);
    }
  };

  const handleAdvance = () => {
    if (!script) return;
    const next: ChatItem[] = [];
    let cursor = stepIndex + 1;
    while (cursor < script.steps.length) {
      next.push({ kind: 'bot-step', step: script.steps[cursor] });
      if (script.steps[cursor].kind === 'RECORD') break;
      cursor += 1;
    }
    if (next.length > 0) {
      setChat((prev) => [...prev, ...next]);
      setStepIndex(cursor);
    } else {
      setStepIndex(cursor);
      setUnitDone(true);
    }
  };

  // 같은 step 을 다시 녹음하기 위해 현재 step prompt 를 채팅 끝에 한 번 더 노출한다.
  const handleRetry = () => {
    if (!currentStep) return;
    setChat((prev) => [...prev, { kind: 'bot-step', step: currentStep }]);
  };

  useEffect(() => {
    if (!unitDone || feedback || generating || !script) return;
    const recordingIds = Object.values(latestRecordingByStep);
    if (recordingIds.length === 0) return;
    setGenerating(true);
    feedbackApi
      .generate({ scriptId: script.id, recordingIds })
      .then(setFeedback)
      .catch((err: unknown) => notifyApiError(err, '피드백 생성에 실패했습니다.'))
      .finally(() => setGenerating(false));
  }, [unitDone, feedback, generating, script, latestRecordingByStep]);

  // 학습 도중 "학습 끝내기" 버튼이 눌렸을 때 어디로 빠져나갈지. 트랙 모드면 트랙 상세, 아니면 트랙 목록.
  const exitDestination = trackContext ? paths.trackOverview(trackContext.trackId) : paths.tracks;
  const handleEndLearning = () => {
    if (confirm('학습을 끝내시겠습니까?')) {
      navigate(exitDestination);
    }
  };

  // 트랙 모드에서 다음 챕터/완주 처리. 단일 모드일 때는 undefined 를 반환하여
  // FeedbackFlow 기본 동작(=랭킹 이동) 이 그대로 적용된다.
  const trackProgress = trackContext && track
    ? { current: trackContext.chapterIndex + 1, total: track.chapters.length }
    : null;
  const isLastChapter = trackContext && track
    ? trackContext.chapterIndex >= track.chapters.length - 1
    : false;

  const onCompleteHandler = trackContext
    ? () => {
        if (!track) {
          navigate(paths.trackOverview(trackContext.trackId));
          return;
        }
        if (isLastChapter) {
          alert(`${track.title} 트랙을 완주했어요! 수고하셨어요.`);
          navigate(paths.trackOverview(trackContext.trackId));
          return;
        }
        const nextIndex = trackContext.chapterIndex + 1;
        const nextChapter = track.chapters[nextIndex];
        navigate(
          paths.pronunciationPractice({
            scriptId: nextChapter.scriptId,
            trackId: trackContext.trackId,
            chapterIndex: nextIndex,
          }),
          { replace: true }
        );
      }
    : undefined;
  const completeLabel = trackContext ? (isLastChapter ? '트랙 완주!' : '다음 챕터로') : undefined;

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{loadError}</p>
          <Button onClick={() => navigate(exitDestination)}>돌아가기</Button>
        </div>
      </div>
    );
  }

  if (!script) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">불러오는 중...</div>;
  }

  // 채팅의 가장 마지막 bot-step 이 현재 step 과 같고 RECORD 인 경우에만 녹음 버튼을 활성화한다.
  // bot-feedback 이 그 다음에 붙어 있으면 사용자는 "다음/다시" 버튼으로 흐름을 결정한다.
  const lastChatItem = chat[chat.length - 1];
  const showRecordButton =
    !unitDone &&
    !feedback &&
    !generating &&
    currentStep !== null &&
    currentStep.kind === 'RECORD' &&
    lastChatItem !== undefined &&
    lastChatItem.kind === 'bot-step' &&
    lastChatItem.step.id === currentStep.id;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex justify-end mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        <div className="mb-6">
          {trackProgress && track && (
            <p className="text-xs font-medium text-sky-600 mb-1">
              {track.title} · 챕터 {trackProgress.current}/{trackProgress.total}
            </p>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{script.title}</h1>
        </div>

        <div className="space-y-4">
          {chat.map((item, idx) => {
            if (item.kind === 'user-record') {
              const scoreLabel = item.score !== null ? ` · ${item.score.toFixed(1)}점` : '';
              return <UserBubble key={item.key}>녹음 완료!{scoreLabel}</UserBubble>;
            }
            if (item.kind === 'bot-feedback') {
              // 액션 버튼은 (1) 가장 최근 피드백이고 (2) 그 피드백이 현재 step 의 결과일 때만 활성화한다.
              // 이미 "다음 단계로" 를 눌러 cursor 가 이동했으면 stepId 가 일치하지 않아 자동으로 비활성된다.
              const isActive =
                item.key === latestFeedbackKey
                && currentStep !== null
                && item.stepId === currentStep.id
                && !unitDone
                && !feedback
                && !generating;
              return (
                <BotBubble key={item.key}>
                  <p className="text-base text-gray-900 leading-relaxed mb-3">
                    {item.guidanceKr || '발음 결과를 확인했어요.'}
                  </p>
                  {isActive && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleRetry}
                        disabled={busyStep}
                        className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-white border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50 text-gray-900 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={16} className="text-orange-500" />
                        <span>다시 발음하기</span>
                      </button>
                      <button
                        onClick={handleAdvance}
                        disabled={busyStep}
                        className="flex-1 h-11 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        다음 단계로
                      </button>
                    </div>
                  )}
                </BotBubble>
              );
            }
            const step = item.step;
            const isPrompt =
              step.kind === 'RECORD' && idx === chat.length - 1 && showRecordButton;
            return (
              <BotBubble key={`step-${step.id}-${idx}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-base text-gray-900 leading-relaxed flex-1">
                    {step.prompt}
                    {step.targetText && (
                      <span className="block mt-2 text-lg font-bold">{step.targetText}</span>
                    )}
                  </p>
                  {step.kind === 'RECORD' && step.targetText && (
                    <button
                      onClick={() => tts.play(step.targetText)}
                      className="p-2 bg-sky-500 hover:bg-sky-600 rounded-full transition-colors flex-shrink-0"
                      aria-label="예시 음성 듣기"
                    >
                      <Volume2 size={18} className="text-white" />
                    </button>
                  )}
                </div>
                {isPrompt && (
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

          {generating && (
            <BotBubble>
              <p className="text-sm text-gray-500">종합 피드백을 생성하는 중...</p>
            </BotBubble>
          )}
          {feedback && (
            <FeedbackFlow
              feedback={feedback}
              onComplete={onCompleteHandler}
              completeLabel={completeLabel}
            />
          )}
          <div ref={chatBottomRef} />
        </div>

        <div className="mt-8">
          <Button
            onClick={handleEndLearning}
            variant="outline"
            className="w-full h-12 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl"
          >
            학습 끝내기
          </Button>
        </div>
      </div>

      <BottomNav variant="study" active="home" />
    </div>
  );
}
