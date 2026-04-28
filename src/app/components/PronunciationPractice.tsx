// 추천 학습 unit 진입 페이지. URL ?scriptId=N 으로 받은 학습 unit 의 단계를
// 백엔드에서 받아 채팅 흐름을 그리고, 단계별로 녹음 → 업로드 → 점수 표시 → 다음 단계로 진행.
// 마지막 단계 완료 시 종합 피드백을 생성해 FeedbackFlow 로 자연스럽게 이어진다.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Home, Mic, User, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import { BotBubble, UserBubble } from './ChatBubble';
import FeedbackFlow from './FeedbackFlow';
import {
  ApiException,
  feedbackApi,
  recordingsApi,
  scriptsApi,
  ttsApi,
  type Feedback,
  type LearningStep,
  type ScriptDetail,
} from '../api';
import { useRecorder } from '../hooks/useRecorder';

type ChatItem =
  | { kind: 'bot-step'; step: LearningStep }
  | { kind: 'user-record'; key: string; score: number | null };

const NO_SCRIPT_FALLBACK_ID = 1;

export default function PronunciationPractice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scriptId = useMemo(() => {
    const raw = searchParams.get('scriptId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : NO_SCRIPT_FALLBACK_ID;
  }, [searchParams]);

  const recorder = useRecorder();

  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [recordingIds, setRecordingIds] = useState<number[]>([]);
  const [unitDone, setUnitDone] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busyStep, setBusyStep] = useState(false);

  useEffect(() => {
    let cancelled = false;
    scriptsApi
      .detail(scriptId)
      .then((data) => {
        if (cancelled) return;
        setScript(data);
        // 첫 진입 시 INTRO 메시지들과 첫 RECORD 메시지까지 미리 노출.
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
          setLoadError(err instanceof ApiException ? err.message : '학습 자료를 불러오지 못했습니다.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  const currentStep = script && stepIndex < script.steps.length ? script.steps[stepIndex] : null;

  const handlePlayAudio = async (text: string | null) => {
    if (!text) return;
    try {
      const blob = await ttsApi.synthesize(text);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.addEventListener('ended', () => URL.revokeObjectURL(url));
      void audio.play();
    } catch (err) {
      const message = err instanceof ApiException ? err.message : '음성 재생에 실패했습니다.';
      alert(message);
    }
  };

  const advanceAfterRecord = () => {
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
      setRecordingIds((prev) => [...prev, uploaded.id]);
      setChat((prev) => [
        ...prev,
        { kind: 'user-record', key: `u-${uploaded.id}`, score: uploaded.stepScore ?? null },
      ]);
      advanceAfterRecord();
    } catch (err) {
      const message = err instanceof ApiException ? err.message : '녹음 업로드에 실패했습니다.';
      alert(message);
    } finally {
      setBusyStep(false);
    }
  };

  useEffect(() => {
    if (!unitDone || feedback || generating || !script) return;
    setGenerating(true);
    feedbackApi
      .generate({ scriptId: script.id, recordingIds })
      .then(setFeedback)
      .catch((err: unknown) => {
        const message = err instanceof ApiException ? err.message : '피드백 생성에 실패했습니다.';
        alert(message);
      })
      .finally(() => setGenerating(false));
  }, [unitDone, feedback, generating, script, recordingIds]);

  const handleEndLearning = () => {
    if (confirm('학습을 끝내시겠습니까?')) {
      navigate('/recommended-learning');
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{loadError}</p>
          <Button onClick={() => navigate('/recommended-learning')}>돌아가기</Button>
        </div>
      </div>
    );
  }

  if (!script) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">불러오는 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex justify-end mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{script.title}</h1>
        </div>

        <div className="space-y-4">
          {chat.map((item, idx) => {
            if (item.kind === 'user-record') {
              const scoreLabel = item.score !== null ? ` · ${item.score.toFixed(1)}점` : '';
              return <UserBubble key={item.key}>녹음 완료!{scoreLabel}</UserBubble>;
            }
            const step = item.step;
            const isLatestRecordPrompt =
              step.kind === 'RECORD' &&
              !unitDone &&
              currentStep !== null &&
              step.id === currentStep.id &&
              idx === chat.length - 1;
            return (
              <BotBubble key={`step-${step.id}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-base text-gray-900 leading-relaxed flex-1">
                    {step.prompt}
                    {step.targetText && (
                      <span className="block mt-2 text-lg font-bold">{step.targetText}</span>
                    )}
                  </p>
                  {step.kind === 'RECORD' && step.targetText && (
                    <button
                      onClick={() => handlePlayAudio(step.targetText)}
                      className="p-2 bg-sky-500 hover:bg-sky-600 rounded-full transition-colors flex-shrink-0"
                    >
                      <Volume2 size={18} className="text-white" />
                    </button>
                  )}
                </div>
                {isLatestRecordPrompt && (
                  <button
                    onClick={recorder.isRecording ? handleStopRecording : handleStartRecording}
                    disabled={busyStep}
                    className={`w-full flex items-center justify-center gap-2 h-12 bg-white border-2 ${
                      recorder.isRecording
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 hover:border-sky-500 hover:bg-sky-50'
                    } text-gray-900 font-medium rounded-xl transition-colors disabled:opacity-50`}
                  >
                    <Mic
                      size={20}
                      className={recorder.isRecording ? 'text-red-500 animate-pulse' : 'text-gray-600'}
                    />
                    <span>{recorder.isRecording ? '녹음 끝내기' : '녹음 시작'}</span>
                  </button>
                )}
              </BotBubble>
            );
          })}

          {generating && (
            <BotBubble>
              <p className="text-sm text-gray-500">종합 피드백을 생성하는 중...</p>
            </BotBubble>
          )}
          {feedback && <FeedbackFlow feedback={feedback} />}
        </div>

        {!unitDone && (
          <div className="mt-8">
            <Button
              onClick={handleEndLearning}
              variant="outline"
              className="w-full h-12 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl"
            >
              학습 끝내기
            </Button>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-20">
          <button
            onClick={() => navigate('/main')}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-sky-500 transition-colors"
          >
            <Home size={28} />
            <span className="text-xs font-medium mt-1">홈</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-sky-500 transition-colors"
          >
            <User size={28} />
            <span className="text-xs font-medium mt-1">프로필</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
