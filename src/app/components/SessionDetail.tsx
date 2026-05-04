// 사용자 맞춤 학습 세션 상세. URL ?sessionId=N 으로 진입한다.
//
// 흐름
//   1. 세션 로드 → 대본이 비어있으면 입력 화면, 있으면 LearningChatFlow 로 한 문장씩 학습
//   2. 대본 제출 → PATCH /api/sessions/{id} → 백엔드 SentenceSplitter 가 자동 분할
//   3. 마지막 문장 통과 후 LearningChatFlow 가 onUnitComplete 호출 → POST /api/feedback/generate
//   4. FeedbackFlow 노출 → 학습 완료 시 EXP/streak 보상 + customLearning 으로 복귀
//
// 채팅 흐름은 PronunciationPractice 와 LearningChatFlow 컴포넌트를 공유한다.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { BotBubble, UserBubble } from './ChatBubble';
import FeedbackFlow from './FeedbackFlow';
import LearningChatFlow, { type LearningPrompt } from './learning/LearningChatFlow';
import TextEditDialog from './TextEditDialog';
import {
  feedbackApi,
  recordingsApi,
  sessionsApi,
  type Feedback,
  type Session,
  type SessionSentence,
} from '../api';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

// 문장 한 개를 LearningChatFlow 가 받는 prompt 로 변환한다. 매 prompt 가 RECORD 라
// canRecord/ttsText 모두 항상 채워진다.
function toLearningPrompt(sentence: SessionSentence): LearningPrompt {
  return {
    id: sentence.id,
    instruction: '아래 문장을 또렷하게 발음해 보세요.',
    target: sentence.text,
    canRecord: true,
    ttsText: sentence.text,
  };
}

export default function SessionDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = useMemo(() => {
    const raw = searchParams.get('sessionId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const [session, setSession] = useState<Session | null>(null);
  const [scriptDraft, setScriptDraft] = useState('');
  const [editingScript, setEditingScript] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [generating, setGenerating] = useState(false);
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);

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
        setEditingScript(data.sentences.length === 0);
      })
      .catch((err: unknown) => {
        if (!cancelled) notifyApiError(err, '세션을 불러오지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  const sentences = session?.sentences ?? [];
  const prompts = useMemo<LearningPrompt[]>(
    () => sentences.map(toLearningPrompt),
    [sentences]
  );
  // sentences 가 바뀌면 LearningChatFlow 를 리마운트해 채팅을 초기화한다.
  const chatKey = useMemo(() => prompts.map((p) => p.id).join(','), [prompts]);

  const upload = useCallback(
    async (audio: Blob, prompt: LearningPrompt) => {
      return recordingsApi.upload({
        audio,
        filename: `sentence-${prompt.id}.wav`,
        sessionId: session!.id,
        sessionSentenceId: prompt.id,
      });
    },
    [session]
  );

  const handleUnitComplete = useCallback(
    (recordingIds: number[]) => {
      if (!session || recordingIds.length === 0) return;
      setGenerating(true);
      feedbackApi
        .generate({ sessionId: session.id, recordingIds })
        .then(setFeedback)
        .catch((err: unknown) => notifyApiError(err, '피드백 생성에 실패했습니다.'))
        .finally(() => setGenerating(false));
    },
    [session]
  );

  const openTitleDialog = () => {
    if (!session) return;
    setTitleDialogOpen(true);
  };

  const handleTitleSubmit = async (newTitle: string) => {
    if (!session || newTitle === session.title) return;
    try {
      const updated = await sessionsApi.update(session.id, { title: newTitle });
      setSession(updated);
    } catch (err) {
      notifyApiError(err, '제목 수정에 실패했습니다.');
    }
  };

  const handleSubmitScript = async () => {
    if (!session) return;
    if (!scriptDraft.trim()) return;
    try {
      const updated = await sessionsApi.update(session.id, { scriptText: scriptDraft });
      setSession(updated);
      setEditingScript(false);
      // 대본이 갱신되면 이전 학습 흐름은 모두 초기화된다 (chatKey 가 바뀌어 채팅 컴포넌트도 리마운트된다).
      setFeedback(null);
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

  const handleEndLearning = () => {
    if (confirm('학습을 끝내시겠습니까?')) {
      navigate(paths.customLearning);
    }
  };

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">불러오는 중...</div>;
  }

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
              onClick={openTitleDialog}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="제목 수정"
            >
              <Pencil size={20} className="text-gray-600" />
            </button>
          </div>
          {sentences.length > 0 && !editingScript && (
            <p className="text-xs font-medium text-sky-600 mt-1">
              {sentences.length}문장
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
                  disabled={!scriptDraft.trim()}
                  className="w-full h-11 mt-3 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl disabled:opacity-50"
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

              <LearningChatFlow
                key={chatKey}
                prompts={prompts}
                upload={upload}
                onUnitComplete={handleUnitComplete}
                disabled={generating || feedback !== null}
                advanceLabel="다음 문장으로"
              />

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

      <TextEditDialog
        open={titleDialogOpen}
        onOpenChange={setTitleDialogOpen}
        title="세션 제목 변경"
        initialValue={session.title}
        placeholder="세션 제목을 입력하세요"
        maxLength={100}
        submitLabel="저장"
        onSubmit={handleTitleSubmit}
      />
    </div>
  );
}
