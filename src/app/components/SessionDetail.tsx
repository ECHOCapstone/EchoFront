// 사용자 맞춤 학습 세션 상세. URL ?sessionId=N 으로 진입한다.
//
// 흐름
//   1. 세션 로드 → 대본이 비어있으면 입력 화면, 있으면 step-by-step 학습 화면
//   2. 대본 제출 → PATCH /api/sessions/{id} → 백엔드 SentenceSplitter 가 자동 분할
//   3. 문장 1개씩 노출 → 녹음 → POST /api/recordings (sessionId + sessionSentenceId)
//      → 즉시 가이드 + 다시/다음 버튼 (PronunciationPractice 와 동일 패턴)
//   4. 마지막 문장 통과 후 POST /api/feedback/generate (sessionId, recordingIds=[per-sentence])
//   5. FeedbackFlow 노출 → 학습 완료 시 EXP/streak 보상 + customLearning 으로 복귀

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Pencil, RotateCcw, Trash2, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { BotBubble, UserBubble } from './ChatBubble';
import FeedbackFlow from './FeedbackFlow';
import PhonemeAlignment from './PhonemeAlignment';
import RecordButton from './RecordButton';
import {
  feedbackApi,
  recordingsApi,
  sessionsApi,
  type Feedback,
  type PhonemeError,
  type Session,
  type SessionSentence,
  type WrongWord,
} from '../api';
import { useRecorder } from '../hooks/useRecorder';
import { useTtsPlayer } from '../hooks/useTtsPlayer';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

type AlignmentSnapshot = {
  targetText: string | null;
  perceived: string[];
  canonical: string[];
  errors: PhonemeError[];
  wrongWords: WrongWord[];
};

type ChatItem =
  | { kind: 'bot-sentence'; sentence: SessionSentence }
  | {
      kind: 'user-record';
      key: string;
      recordingId: number;
      sentenceId: number;
      score: number | null;
    }
  | {
      kind: 'bot-feedback';
      key: string;
      sentenceId: number;
      guidanceKr: string;
      score: number | null;
      alignment: AlignmentSnapshot;
    };

export default function SessionDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = useMemo(() => {
    const raw = searchParams.get('sessionId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const recorder = useRecorder();
  const tts = useTtsPlayer();

  const [session, setSession] = useState<Session | null>(null);
  const [scriptDraft, setScriptDraft] = useState('');
  const [editingScript, setEditingScript] = useState(false);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  // sentence.id → 가장 마지막 시도의 recordingId. 종합 피드백 generate 시 그대로 전송된다.
  const [latestRecordingBySentence, setLatestRecordingBySentence] = useState<Record<number, number>>({});
  const [unitDone, setUnitDone] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busyStep, setBusyStep] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 채팅 흐름은 sentences 가 채워진 시점에 첫 문장 한 개로 시작한다.
  const initializeChat = (sentences: SessionSentence[]) => {
    if (sentences.length === 0) {
      setChat([]);
      setSentenceIndex(0);
      return;
    }
    setChat([{ kind: 'bot-sentence', sentence: sentences[0] }]);
    setSentenceIndex(0);
  };

  useEffect(() => {
    if (sessionId === null) {
      navigate(paths.customLearning, { replace: true });
      return;
    }
    let cancelled = false;
    sessionsApi
      .get(sessionId)
      .then((data) => {
        if (cancelled) return;
        setSession(data);
        setScriptDraft(data.scriptText);
        if (data.sentences.length === 0) {
          setEditingScript(true);
        } else {
          setEditingScript(false);
          initializeChat(data.sentences);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) notifyApiError(err, '세션을 불러오지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  // 새 채팅 메시지가 추가되면 자동으로 화면 가장 아래로 스크롤한다.
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.length, feedback, generating, editingScript]);

  const sentences = session?.sentences ?? [];
  const currentSentence = sentenceIndex < sentences.length ? sentences[sentenceIndex] : null;

  // 가장 최근 bot-feedback 만 액션 가능. 그 외 시도의 버튼들은 sentenceId 일치 조건으로 자동 비활성된다.
  const latestFeedbackKey = useMemo(() => {
    for (let i = chat.length - 1; i >= 0; i -= 1) {
      const item = chat[i];
      if (item.kind === 'bot-feedback') return item.key;
    }
    return null;
  }, [chat]);

  const handleTitleEdit = async () => {
    if (!session) return;
    const newTitle = prompt('세션 제목을 입력하세요:', session.title);
    if (!newTitle || !newTitle.trim()) return;
    try {
      const updated = await sessionsApi.update(session.id, { title: newTitle.trim() });
      setSession(updated);
    } catch (err) {
      notifyApiError(err, '제목 수정에 실패했습니다.');
    }
  };

  const handleSubmitScript = async () => {
    if (!session) return;
    if (!scriptDraft.trim()) {
      alert('대본을 먼저 입력해주세요.');
      return;
    }
    try {
      const updated = await sessionsApi.update(session.id, { scriptText: scriptDraft });
      setSession(updated);
      setEditingScript(false);
      // 대본이 갱신되면 이전 학습 흐름은 모두 초기화한다.
      setLatestRecordingBySentence({});
      setUnitDone(false);
      setFeedback(null);
      initializeChat(updated.sentences);
    } catch (err) {
      notifyApiError(err, '대본 저장에 실패했습니다.');
    }
  };

  // "대본 수정" — 입력란 다시 활성화. 진행 중인 학습 상태는 사용자가 다시 제출할 때 초기화된다.
  const handleEditScript = () => {
    if (!session) return;
    setEditingScript(true);
    setScriptDraft(session.scriptText);
  };

  const handleDeleteSession = async () => {
    if (!session) return;
    if (!confirm(`"${session.title}" 세션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await sessionsApi.delete(session.id);
      navigate(paths.customLearning, { replace: true });
    } catch (err) {
      notifyApiError(err, '세션 삭제에 실패했습니다.');
    }
  };

  const handleStartRecording = async () => {
    await recorder.start();
  };

  const handleStopRecording = async () => {
    if (!session || !currentSentence || busyStep) return;
    setBusyStep(true);
    const result = await recorder.stop();
    if (!result) {
      setBusyStep(false);
      return;
    }
    try {
      const uploaded = await recordingsApi.upload({
        audio: result.blob,
        filename: `sentence-${currentSentence.id}.wav`,
        sessionId: session.id,
        sessionSentenceId: currentSentence.id,
      });
      setLatestRecordingBySentence((prev) => ({ ...prev, [currentSentence.id]: uploaded.id }));
      setChat((prev) => [
        ...prev,
        {
          kind: 'user-record',
          key: `u-${uploaded.id}`,
          recordingId: uploaded.id,
          sentenceId: currentSentence.id,
          score: uploaded.stepScore ?? null,
        },
        {
          kind: 'bot-feedback',
          key: `f-${uploaded.id}`,
          sentenceId: currentSentence.id,
          guidanceKr: uploaded.guidanceKr ?? '',
          score: uploaded.stepScore ?? null,
          alignment: {
            targetText: currentSentence.text,
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

  const handleAdvance = () => {
    if (!session) return;
    const next = sentenceIndex + 1;
    if (next >= sentences.length) {
      setSentenceIndex(next);
      setUnitDone(true);
      return;
    }
    setSentenceIndex(next);
    setChat((prev) => [...prev, { kind: 'bot-sentence', sentence: sentences[next] }]);
  };

  const handleRetry = () => {
    if (!currentSentence) return;
    setChat((prev) => [...prev, { kind: 'bot-sentence', sentence: currentSentence }]);
  };

  useEffect(() => {
    if (!unitDone || feedback || generating || !session) return;
    const recordingIds = Object.values(latestRecordingBySentence);
    if (recordingIds.length === 0) return;
    setGenerating(true);
    feedbackApi
      .generate({ sessionId: session.id, recordingIds })
      .then(setFeedback)
      .catch((err: unknown) => notifyApiError(err, '피드백 생성에 실패했습니다.'))
      .finally(() => setGenerating(false));
  }, [unitDone, feedback, generating, session, latestRecordingBySentence]);

  const handleEndLearning = () => {
    if (confirm('학습을 끝내시겠습니까?')) {
      navigate(paths.customLearning);
    }
  };

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">불러오는 중...</div>;
  }

  // 마지막 채팅이 현재 문장 prompt 이고 그 외 행동이 없을 때만 녹음 버튼을 활성화한다.
  const lastChatItem = chat[chat.length - 1];
  const showRecordButton =
    !editingScript &&
    !unitDone &&
    !feedback &&
    !generating &&
    currentSentence !== null &&
    lastChatItem !== undefined &&
    lastChatItem.kind === 'bot-sentence' &&
    lastChatItem.sentence.id === currentSentence.id;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate(paths.customLearning)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <button
            onClick={handleDeleteSession}
            className="flex items-center gap-1 px-3 py-2 hover:bg-red-50 rounded-full transition-colors text-red-500"
            aria-label="세션 삭제"
          >
            <Trash2 size={18} />
            <span className="text-sm font-medium">세션 삭제</span>
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
            <button
              onClick={handleTitleEdit}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="제목 수정"
            >
              <Pencil size={20} className="text-gray-600" />
            </button>
          </div>
          {sentences.length > 0 && !editingScript && (
            <p className="text-xs font-medium text-sky-600 mt-1">
              문장 {Math.min(sentenceIndex + 1, sentences.length)}/{sentences.length}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {editingScript ? (
            <>
              <BotBubble>
                <p className="text-gray-800 leading-relaxed">
                  안녕하세요! 오늘 연습할 대본을 입력해 주세요. 문장 단위로 자동 분할되어 한 문장씩 학습합니다.
                </p>
              </BotBubble>

              <BotBubble>
                <p className="text-gray-800 mb-3">아래 입력창에 연습할 문장을 적어주세요.</p>
                <Textarea
                  value={scriptDraft}
                  onChange={(e) => setScriptDraft(e.target.value)}
                  placeholder="여기에 대본을 입력하세요..."
                  className="w-full h-32 p-3 border-2 border-gray-300 rounded-xl focus:border-sky-500 focus:ring-sky-500 resize-none"
                />
                <Button
                  onClick={handleSubmitScript}
                  className="w-full h-11 mt-3 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl"
                >
                  대본 입력 완료
                </Button>
              </BotBubble>
            </>
          ) : (
            <>
              <UserBubble>{session.scriptText}</UserBubble>

              <BotBubble>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-700">대본 내용을 바꾸고 싶다면?</p>
                  <button
                    onClick={handleEditScript}
                    className="flex items-center gap-1 px-3 h-9 bg-white border-2 border-gray-300 hover:border-sky-500 hover:bg-sky-50 text-gray-900 text-sm font-medium rounded-xl transition-colors"
                  >
                    <Pencil size={14} className="text-gray-600" />
                    <span>대본 수정</span>
                  </button>
                </div>
              </BotBubble>

              {chat.map((item, idx) => {
                if (item.kind === 'user-record') {
                  const scoreLabel = item.score !== null ? ` · ${item.score.toFixed(1)}점` : '';
                  return <UserBubble key={item.key}>녹음 완료!{scoreLabel}</UserBubble>;
                }
                if (item.kind === 'bot-feedback') {
                  const isActive =
                    item.key === latestFeedbackKey
                    && currentSentence !== null
                    && item.sentenceId === currentSentence.id
                    && !unitDone
                    && !feedback
                    && !generating;
                  return (
                    <BotBubble key={item.key}>
                      <p className="text-base text-gray-900 leading-relaxed mb-3">
                        {item.guidanceKr || '발음 결과를 확인했어요.'}
                      </p>
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
                            {sentenceIndex >= sentences.length - 1 ? '학습 마무리' : '다음 문장으로'}
                          </button>
                        </div>
                      )}
                    </BotBubble>
                  );
                }
                const sentence = item.sentence;
                const isPrompt = idx === chat.length - 1 && showRecordButton;
                return (
                  <BotBubble key={`sentence-${sentence.id}-${idx}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-base text-gray-900 leading-relaxed flex-1">
                        아래 문장을 또렷하게 발음해 보세요.
                        <span className="block mt-2 text-lg font-bold">{sentence.text}</span>
                      </p>
                      <button
                        onClick={() => tts.play(sentence.text)}
                        className="p-2 bg-sky-500 hover:bg-sky-600 rounded-full transition-colors flex-shrink-0"
                        aria-label="예시 음성 듣기"
                      >
                        <Volume2 size={18} className="text-white" />
                      </button>
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
                  onComplete={() => navigate(paths.customLearning)}
                  completeLabel="목록으로"
                />
              )}
            </>
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
