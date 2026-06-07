// 챕터 학습 화면. URL 쿼리 ?scriptId=N (필수) + ?trackId=M&chapterIndex=K (트랙 모드에서만).
//
// 흐름은 LearningChatFlow 가 캡슐화한다. 이 컴포넌트는 자료 로딩, 헤더 / 종료 버튼,
// 트랙 모드의 다음 챕터 분기 같은 챕터 단위 컨텍스트만 책임진다.
//
// 트랙 모드의 학습 완료 처리
//   FeedbackFlow 의 EXP 팝업 닫기 hook 으로
//     - 다음 챕터가 있으면: 같은 트랙의 다음 챕터로 navigate (chapterIndex + 1)
//     - 마지막 챕터면: 트랙 완주 모달 노출 후 트랙 상세로 복귀
//   단일 모드(트랙 컨텍스트 없음)일 때는 FeedbackFlow 기본 동작(=랭킹 이동) 을 그대로 사용한다.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { BotBubble } from './ChatBubble';
import FeedbackFlow from './FeedbackFlow';
import LearningChatFlow, { type LearningPrompt } from './learning/LearningChatFlow';
import {
  feedbackApi,
  progressApi,
  recordingsApi,
  scriptsApi,
  tracksApi,
  type Feedback,
  type LearningStep,
} from '../api';
import { useApiResource } from '../hooks/useApiResource';
import { useLearningSafeguards } from '../hooks/useLearningSafeguards';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';
import { markChapterComplete } from '../lib/trackProgress';
import { celebrateTrack } from '../lib/reward';
import { useConfirm } from './ConfirmProvider';

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

// LearningStep 도메인 객체를 LearningChatFlow 가 받는 일반 prompt 로 정규화한다.
// 백엔드가 미리 채워 보낸 koreanTranslation 을 그대로 전달해 첫 렌더부터 자막이 노출되게 한다.
function toLearningPrompt(step: LearningStep): LearningPrompt {
  return {
    id: step.id,
    instruction: step.prompt,
    target: step.targetText ?? null,
    canRecord: step.kind === 'RECORD',
    ttsText: step.kind === 'RECORD' ? step.targetText : null,
    koreanTranslation: step.koreanTranslation ?? null,
  };
}

export default function PronunciationPractice() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [searchParams] = useSearchParams();

  const scriptId = useMemo(() => readPositiveInt(searchParams.get('scriptId')), [searchParams]);
  const trackContext = useMemo<TrackContext | null>(() => {
    const trackId = readPositiveInt(searchParams.get('trackId'));
    const chapterIndex = readNonNegativeInt(searchParams.get('chapterIndex'));
    if (trackId === null || chapterIndex === null) return null;
    return { trackId, chapterIndex };
  }, [searchParams]);

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [generating, setGenerating] = useState(false);
  const [trackCompleteOpen, setTrackCompleteOpen] = useState(false);
  // 진행 중인 종합 피드백 생성 요청을 추적해 컴포넌트 unmount 시 fetch 를 끊는다 — 메모리 누수 / 잔여 setState 차단.
  const generateAbortRef = useRef<AbortController | null>(null);

  // scriptId 가 비어 있거나 잘못된 경우 트랙 목록(트랙 모드일 땐 트랙 상세) 으로 되돌린다.
  useEffect(() => {
    if (scriptId === null) {
      navigate(trackContext ? paths.trackOverview(trackContext.trackId) : paths.tracks, { replace: true });
    }
  }, [scriptId, trackContext, navigate]);

  // 진입 시 진행 상태를 백엔드에서 로드한다. exists=true 이면 "이어서 / 처음부터" 를 사용자에게 묻는다.
  // null = 미해결 (로딩 중 / 처음 진입 / 사용자가 처음부터 선택). 숫자면 그 인덱스 + 1 부터 학습 재개.
  const [resumeFromIndex, setResumeFromIndex] = useState<number | null>(0);
  useEffect(() => {
    if (scriptId === null) return;
    setResumeFromIndex(null);
    let cancelled = false;
    progressApi.chapter
      .get(scriptId)
      .then(async (progress) => {
        if (cancelled) return;
        if (!progress.exists || progress.lastCompletedIndex < 0) {
          setResumeFromIndex(0);
          return;
        }
        const proceed = await confirm({
          title: '이어서 학습',
          description: '이전 진행이 남아 있습니다. 이어서 학습하시겠습니까?',
          confirmLabel: '이어서',
          cancelLabel: '처음부터',
        });
        if (cancelled) return;
        if (proceed) {
          setResumeFromIndex(progress.lastCompletedIndex + 1);
        } else {
          await progressApi.chapter.reset(scriptId).catch(() => {});
          if (!cancelled) setResumeFromIndex(0);
        }
      })
      .catch(() => {
        // 진행 상태 조회 실패는 학습을 막지 않는다 — 처음부터 시작 가정.
        if (!cancelled) setResumeFromIndex(0);
      });
    return () => {
      cancelled = true;
    };
  }, [scriptId, confirm]);

  // 트랙 모드의 "다음 챕터로" 는 같은 라우트의 searchParams 만 바꾸므로 컴포넌트가 unmount 되지 않는다.
  // scriptId 가 바뀌면 단위 학습 로컬 상태를 명시적으로 초기화해 이전 챕터의 피드백/모달이 새 챕터에 잔류하지 않게 한다.
  useEffect(() => {
    setFeedback(null);
    setGenerating(false);
    setTrackCompleteOpen(false);
  }, [scriptId]);

  // 챕터 자체 로드. URL 의 scriptId 가 바뀌면 LearningChatFlow 도 같이 리마운트되어 채팅이 초기화된다.
  const { data: script, error: loadError } = useApiResource(
    () => scriptsApi.detail(scriptId!),
    [scriptId],
    {
      enabled: scriptId !== null,
      errorFallback: '학습 자료를 불러오지 못했습니다.',
    }
  );

  // 트랙 모드일 때만 트랙 상세를 부수적으로 가져와 헤더 진행 상황과 다음 챕터 분기에 사용한다.
  // 실패는 학습 흐름을 막지 않고 헤더 진행 표시만 비워둔다.
  const { data: track } = useApiResource(
    () => tracksApi.detail(trackContext!.trackId),
    [trackContext?.trackId],
    {
      enabled: trackContext !== null,
      onError: () => {},
    }
  );

  const prompts = useMemo<LearningPrompt[]>(
    () => (script ? script.steps.map(toLearningPrompt) : []),
    [script]
  );

  const upload = useCallback(
    async (audio: Blob, prompt: LearningPrompt) => {
      // script 가 없는 상태에서는 LearningChatFlow 가 마운트되지 않으므로 이 경로에 도달하지 않는다.
      return recordingsApi.upload({
        audio,
        filename: `step-${prompt.id}.wav`,
        scriptId: script!.id,
        stepId: prompt.id,
      });
    },
    [script]
  );

  // 마지막 RECORD 가 끝났을 때 종합 피드백 생성 진입. AbortController 로 진행 중 요청을 추적해
  // 컴포넌트 unmount 시 fetch 를 끊는다.
  const handleUnitComplete = useCallback(
    (recordingIds: number[]) => {
      if (!script || recordingIds.length === 0) return;
      generateAbortRef.current?.abort();
      const controller = new AbortController();
      generateAbortRef.current = controller;
      setGenerating(true);
      feedbackApi
        .generate({ scriptId: script.id, recordingIds }, controller.signal)
        .then(setFeedback)
        // ApiException(ABORTED) 는 notifyApiError 가 알아서 무시한다.
        .catch((err: unknown) => notifyApiError(err, '피드백 생성에 실패했습니다.'))
        .finally(() => {
          if (generateAbortRef.current === controller) {
            generateAbortRef.current = null;
            setGenerating(false);
          }
        });
    },
    [script]
  );

  // 컴포넌트 unmount 시 진행 중인 generate 요청을 일괄 차단한다.
  useEffect(() => () => generateAbortRef.current?.abort(), []);

  // 학습 도중 "학습 끝내기" 버튼이 눌렸을 때 어디로 빠져나갈지. 트랙 모드면 트랙 상세, 아니면 트랙 목록.
  const exitDestination = trackContext ? paths.trackOverview(trackContext.trackId) : paths.tracks;
  // 학습이 실제로 진행 중이면 새로고침 / 뒤로가기에 안전망을 건다. 종합 피드백 단계는 학습 자체가 끝났으므로 풀어 준다.
  const learningInProgress = feedback === null && !generating;
  const handleEndLearning = useCallback(async () => {
    const ok = await confirm({
      title: '학습 종료',
      description: '진행한 내용이 저장되지 않을 수 있습니다. 학습을 끝내시겠습니까?',
      confirmLabel: '끝내기',
    });
    if (ok) navigate(exitDestination);
  }, [confirm, navigate, exitDestination]);
  useLearningSafeguards({ dirty: learningInProgress, onAttemptLeave: handleEndLearning });

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
        // 방금 끝낸 챕터를 완료 처리(지도의 잠금 해제·체크 표시 근거).
        // 챕터 confetti 는 FeedbackFlow 의 EXP 팝업이 뜰 때 이미 터졌으므로 여기선 진행 처리만.
        markChapterComplete(trackContext.trackId, trackContext.chapterIndex);
        if (!track) {
          navigate(paths.trackOverview(trackContext.trackId));
          return;
        }
        if (isLastChapter) {
          // 트랙 완주는 한 번뿐인 이벤트라 inline navigate 보다 모달로 명확히 마무리한다.
          celebrateTrack();
          setTrackCompleteOpen(true);
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

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto md:shadow-xl flex flex-col">
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
            <p className="text-xs font-medium text-brand-600 mb-1">
              {track.title} · 챕터 {trackProgress.current}/{trackProgress.total}
            </p>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{script.title}</h1>
        </div>

        <div className="space-y-4">
          {resumeFromIndex !== null && (
            <LearningChatFlow
              key={script.id}
              prompts={prompts}
              upload={upload}
              onUnitComplete={handleUnitComplete}
              onStepCompleted={(idx) => {
                // 진행 상태 갱신은 학습 흐름과 무관한 보조 신호 — 실패해도 사용자에게 알리지 않는다.
                void progressApi.chapter.advance(script.id, idx).catch(() => {});
              }}
              startFromIndex={resumeFromIndex}
              disabled={generating || feedback !== null}
              advanceLabel="다음 단계로"
            />
          )}
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

      {/* 트랙 마지막 챕터까지 끝낸 직후의 축하 모달. 닫으면 트랙 상세로 이동. */}
      <AlertDialog open={trackCompleteOpen} onOpenChange={setTrackCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>트랙 완주!</AlertDialogTitle>
            <AlertDialogDescription>
              {track ? `${track.title} 트랙을 모두 끝냈어요. 수고하셨어요.` : '트랙을 모두 끝냈어요. 수고하셨어요.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                if (trackContext) navigate(paths.trackOverview(trackContext.trackId));
              }}
            >
              트랙 상세로
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
