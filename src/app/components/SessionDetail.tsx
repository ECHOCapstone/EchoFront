// 사용자 맞춤 학습 세션 상세. URL ?sessionId=N 으로 진입한다.
//   1. 세션 로드 → 사용자 입력 대본 표시
//   2. 대본 입력/수정 → PATCH 로 저장
//   3. 녹음 → POST /api/recordings (sessionId)
//   4. 녹음 결과 → POST /api/feedback/generate (sessionId, recordingIds=[uploaded])
//   5. FeedbackFlow 노출

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Home, Mic, Pencil, User, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import StatusHeader from './StatusHeader';
import { BotBubble, UserBubble } from './ChatBubble';
import FeedbackFlow from './FeedbackFlow';
import {
  ApiException,
  feedbackApi,
  recordingsApi,
  sessionsApi,
  ttsApi,
  type Feedback,
  type Session,
} from '../api';
import { useRecorder } from '../hooks/useRecorder';

export default function SessionDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = useMemo(() => {
    const raw = searchParams.get('sessionId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const recorder = useRecorder();
  const [session, setSession] = useState<Session | null>(null);
  const [scriptDraft, setScriptDraft] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionId === null) {
      navigate('/custom-learning', { replace: true });
      return;
    }
    let cancelled = false;
    sessionsApi
      .get(sessionId)
      .then((data) => {
        if (cancelled) return;
        setSession(data);
        setScriptDraft(data.scriptText);
        setSubmitted(data.scriptText.trim().length > 0);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          alert(err instanceof ApiException ? err.message : '세션을 불러오지 못했습니다.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  const handleTitleEdit = async () => {
    if (!session) return;
    const newTitle = prompt('세션 제목을 입력하세요:', session.title);
    if (!newTitle || !newTitle.trim()) return;
    try {
      const updated = await sessionsApi.update(session.id, { title: newTitle.trim() });
      setSession(updated);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : '제목 수정에 실패했습니다.');
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
      setSubmitted(true);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : '대본 저장에 실패했습니다.');
    }
  };

  const handlePlayAudio = async () => {
    if (!session?.scriptText) return;
    try {
      const blob = await ttsApi.synthesize(session.scriptText);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.addEventListener('ended', () => URL.revokeObjectURL(url));
      void audio.play();
    } catch (err) {
      alert(err instanceof ApiException ? err.message : '음성 재생에 실패했습니다.');
    }
  };

  const handleStart = async () => {
    if (busy) return;
    await recorder.start();
  };

  const handleStop = async () => {
    if (!session || busy) return;
    setBusy(true);
    const result = await recorder.stop();
    if (!result) {
      setBusy(false);
      return;
    }
    try {
      const uploaded = await recordingsApi.upload({
        audio: result.blob,
        filename: 'session.wav',
        sessionId: session.id,
      });
      setRecordingId(uploaded.id);
      const generated = await feedbackApi.generate({
        sessionId: session.id,
        recordingIds: [uploaded.id],
      });
      setFeedback(generated);
    } catch (err) {
      alert(err instanceof ApiException ? err.message : '평가에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleEndLearning = () => {
    if (confirm('학습을 끝내시겠습니까?')) {
      navigate('/custom-learning');
    }
  };

  if (!session) {
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
            <button
              onClick={handleTitleEdit}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Pencil size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <BotBubble>
            <p className="text-gray-800 leading-relaxed">
              안녕하세요! 오늘 연습할 대본을 입력해 주세요.
            </p>
          </BotBubble>

          <BotBubble>
            <p className="text-gray-800 mb-3">
              아래 입력창에 연습할 문장을 적어주세요.
            </p>
            <Textarea
              value={scriptDraft}
              onChange={(e) => setScriptDraft(e.target.value)}
              placeholder="여기에 대본을 입력하세요..."
              disabled={submitted}
              className="w-full h-32 p-3 border-2 border-gray-300 rounded-xl focus:border-sky-500 focus:ring-sky-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
            {!submitted && (
              <Button
                onClick={handleSubmitScript}
                className="w-full h-11 mt-3 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl"
              >
                대본 입력 완료
              </Button>
            )}
          </BotBubble>

          {submitted && (
            <>
              <UserBubble>{session.scriptText}</UserBubble>

              <BotBubble>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-base text-gray-900 leading-relaxed flex-1">
                    좋아요! 위 대본을 녹음해 보세요.
                  </p>
                  <button
                    onClick={handlePlayAudio}
                    className="p-2 bg-sky-500 hover:bg-sky-600 rounded-full transition-colors flex-shrink-0"
                  >
                    <Volume2 size={18} className="text-white" />
                  </button>
                </div>
                {recordingId === null && (
                  <button
                    onClick={recorder.isRecording ? handleStop : handleStart}
                    disabled={busy}
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
            </>
          )}

          {recordingId !== null && <UserBubble>녹음 완료!</UserBubble>}
          {feedback && <FeedbackFlow feedback={feedback} />}
        </div>

        {!feedback && (
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
