// "오늘의 챌린지" 진입 화면. 활성 챌린지가 있으면 문장 + 본인 best + 도전 카운트 + 랭킹 미니뷰를 한
// 화면에 담고, 사용자가 도전 버튼을 눌러 발음 결과를 즉시 받을 수 있게 한다.
// 활성 챌린지가 없으면 빈 상태 + "지난 챌린지 보기" 만 노출한다.

import { useCallback, useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import RecordButton from './RecordButton';
import MicPermissionModal from './learning/MicPermissionModal';
import PhonemeAlignment from './PhonemeAlignment';
import { challengeApi } from '../api';
import type { ChallengeAttempt, ChallengeCurrent, ChallengeRanking } from '../api';
import { useRecorder } from '../hooks/useRecorder';
import { useRecordingLock } from '../hooks/useRecordingLock';
import { notifyApiError } from '../lib/notify';
import { paths } from '../lib/paths';

type LoadState = { loading: boolean; error: string | null };

export default function Challenge() {
  const navigate = useNavigate();
  const recorder = useRecorder();
  // 동시 녹음 1개 제한에 가입한다. PracticeItemCard 와 같은 패턴 — 카드별 고유 키를 잡고 푼다.
  const lockKey = useId();
  const lock = useRecordingLock();
  const [current, setCurrent] = useState<ChallengeCurrent | null>(null);
  const [ranking, setRanking] = useState<ChallengeRanking | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ loading: true, error: null });
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<ChallengeAttempt | null>(null);
  const [micModalDismissed, setMicModalDismissed] = useState(false);

  // 메인 데이터 로딩. current 와 랭킹은 서로 독립이라 병렬로 받는다 — 활성 없으면 ranking 은 null 로 둔다.
  const load = useCallback(async () => {
    setLoadState({ loading: true, error: null });
    try {
      const currentResp = await challengeApi.current();
      const rankResp = currentResp ? await challengeApi.currentRanking() : null;
      setCurrent(currentResp);
      setRanking(rankResp);
      setLoadState({ loading: false, error: null });
    } catch (err) {
      notifyApiError(err, '챌린지를 불러오지 못했습니다.');
      setLoadState({ loading: false, error: '챌린지를 불러오지 못했습니다.' });
    }
  }, []);

  // current 가 이미 있을 때의 새 도전 직후 reload — 두 호출을 병렬로 묶는다.
  const reloadAfterAttempt = useCallback(async () => {
    try {
      const [currentResp, rankResp] = await Promise.all([
        challengeApi.current(),
        challengeApi.currentRanking(),
      ]);
      setCurrent(currentResp);
      setRanking(rankResp);
    } catch (err) {
      notifyApiError(err, '챌린지 정보를 갱신하지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // unmount 시 자신이 보유한 lock 을 자동 해제한다.
  useEffect(() => () => lock.release(lockKey), [lock, lockKey]);

  // 권한이 다시 잡히면 dismiss 플래그를 풀어 안내가 한 번 더 뜰 수 있게 한다.
  useEffect(() => {
    if (recorder.status === 'idle' || recorder.status === 'recording') {
      setMicModalDismissed(false);
    }
  }, [recorder.status]);
  const showMicModal =
    !micModalDismissed && (recorder.status === 'denied' || recorder.status === 'unsupported');

  const handleStart = async (): Promise<boolean> => {
    if (busy) return false;
    if (!lock.acquire(lockKey)) {
      toast.info('다른 곳에서 녹음 중이에요. 끝나면 다시 시도해 주세요.');
      return false;
    }
    const started = await recorder.start();
    if (!started) {
      lock.release(lockKey);
    }
    return started;
  };

  const handleStop = async () => {
    if (busy) return;
    setBusy(true);
    const result = await recorder.stop();
    lock.release(lockKey);
    if (!result) {
      setBusy(false);
      return;
    }
    try {
      const attempt = await challengeApi.attempt(result.blob);
      setLastResult(attempt);
      // 새 도전이 끝나면 본인 best / 카운트 / 랭킹이 변경되었으므로 다시 받아온다.
      await reloadAfterAttempt();
    } catch (err) {
      notifyApiError(err, '도전 결과 처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const attemptsRemaining = current ? Math.max(0, current.attemptsLimit - current.attemptsToday) : 0;

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex justify-start mb-4">
          <button
            onClick={() => navigate(paths.main)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Trophy size={32} className="text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">오늘의 챌린지</h1>
        </div>

        {loadState.loading && <p className="text-gray-500">불러오는 중...</p>}
        {loadState.error && <p className="text-red-500">{loadState.error}</p>}

        {!loadState.loading && !current && <EmptyState onHistory={() => navigate(paths.pastChallenges)} />}

        {current && (
          <>
            <ChallengeCard challenge={current} attemptsRemaining={attemptsRemaining} />
            <div className="mt-4">
              {attemptsRemaining === 0 ? (
                <button
                  disabled
                  className="w-full h-12 bg-gray-200 text-gray-500 font-medium rounded-xl"
                >
                  오늘 도전 횟수를 모두 사용했어요
                </button>
              ) : (
                <RecordButton
                  isRecording={recorder.status === 'recording'}
                  busy={busy}
                  onStart={handleStart}
                  onStop={handleStop}
                  idleLabel="도전하기"
                  busyLabel="채점 중..."
                />
              )}
            </div>
            {lastResult && <AttemptResult result={lastResult} targetText={current.targetText} />}
            <div className="mt-8">
              <RankingMini ranking={ranking} />
            </div>
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => navigate(paths.pastChallenges)}
                className="w-full h-12"
              >
                지난 챌린지 보기
              </Button>
            </div>
          </>
        )}
      </div>

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

      <BottomNav active="challenge" />
    </div>
  );
}

// 챌린지 본문 카드. 영문 + 한국어 + 본인 best + 잔여 도전 횟수를 한 묶음으로 보여 준다.
function ChallengeCard({
  challenge,
  attemptsRemaining,
}: {
  challenge: ChallengeCurrent;
  attemptsRemaining: number;
}) {
  return (
    <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-5 shadow-sm">
      <p className="text-xs font-medium text-brand-700 mb-2">도전 문장</p>
      <p className="text-xl font-bold text-gray-900 leading-relaxed">{challenge.targetText}</p>
      {challenge.koreanTranslation && (
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{challenge.koreanTranslation}</p>
      )}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div>
          <p className="text-gray-500">내 최고 점수</p>
          <p className="text-lg font-bold text-brand-700">
            {challenge.myBestScore !== null ? `${challenge.myBestScore.toFixed(1)}점` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">오늘 남은 도전</p>
          <p className="text-lg font-bold text-gray-900">
            {attemptsRemaining}/{challenge.attemptsLimit}
          </p>
        </div>
      </div>
    </div>
  );
}

// 직전 도전 결과. 점수와 best 갱신 여부에 더해, 응답에 음소 정렬 정보가 들어 있으면 함께 노출해
// 학습자가 약점 음소를 즉시 확인할 수 있게 한다.
function AttemptResult({ result, targetText }: { result: ChallengeAttempt; targetText: string }) {
  const passed = result.score >= result.passThreshold;
  const hasAlignment = result.canonical.length > 0 || result.perceived.length > 0;
  return (
    <div
      className={`mt-4 rounded-2xl p-4 border-2 ${
        passed ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'
      }`}
    >
      <p className="text-sm text-gray-600">방금 점수</p>
      <div className="flex items-baseline justify-between">
        <p className={`text-3xl font-bold ${passed ? 'text-green-700' : 'text-orange-700'}`}>
          {result.score.toFixed(1)}점
        </p>
        {result.isMyNewBest && (
          <span className="px-2 py-1 text-xs font-bold text-white bg-brand-500 rounded-full">
            최고점 갱신
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">합격선 {result.passThreshold.toFixed(0)}점</p>
      {hasAlignment && (
        <div className="mt-3">
          <PhonemeAlignment
            targetText={targetText}
            canonical={result.canonical}
            perceived={result.perceived}
            errors={result.errors}
            wrongWords={[]}
          />
        </div>
      )}
    </div>
  );
}

// 챌린지 랭킹 미니뷰. 본인이 Top N 밖이면 별도 줄로 본인 행을 노출한다.
function RankingMini({ ranking }: { ranking: ChallengeRanking | null }) {
  if (!ranking) {
    return <p className="text-sm text-gray-500">랭킹 정보를 불러오는 중...</p>;
  }
  if (ranking.totalRanked === 0) {
    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 text-center text-gray-500">
        아직 도전한 사람이 없어요. 첫 번째 1등이 되어 보세요!
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">랭킹</h2>
        <p className="text-xs text-gray-500">{ranking.totalRanked}명 참여</p>
      </div>
      <div className="space-y-2">
        {ranking.entries.map((entry) => (
          <RankRow
            key={entry.rank}
            rank={entry.rank}
            nickname={entry.nickname}
            bestScore={entry.bestScore}
            attempts={entry.attempts}
            isMe={entry.isMe}
          />
        ))}
        {!ranking.myEntryShown && ranking.myRank > 0 && ranking.myBestScore !== null && (
          <>
            <p className="text-center text-xs text-gray-400 py-1">···</p>
            <RankRow
              rank={ranking.myRank}
              nickname="나"
              bestScore={ranking.myBestScore}
              attempts={ranking.myAttempts}
              isMe
            />
          </>
        )}
      </div>
    </div>
  );
}

function RankRow({
  rank,
  nickname,
  bestScore,
  attempts,
  isMe,
}: {
  rank: number;
  nickname: string;
  bestScore: number;
  attempts: number;
  isMe: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border-2 ${
        isMe ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
            isMe ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {rank}
        </div>
        <div>
          <p
            className={`text-base ${
              isMe ? 'font-bold text-brand-700' : 'font-medium text-gray-900'
            }`}
          >
            {nickname}
            {isMe && <span className="ml-2 text-xs text-brand-500">(나)</span>}
          </p>
          <p className="text-xs text-gray-500">{attempts}회 도전</p>
        </div>
      </div>
      <p className={`text-base font-bold ${isMe ? 'text-brand-700' : 'text-gray-700'}`}>
        {bestScore.toFixed(1)}점
      </p>
    </div>
  );
}

// 활성 챌린지가 없을 때의 빈 상태. 지난 챌린지 페이지 진입만 노출한다.
function EmptyState({ onHistory }: { onHistory: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 text-center">
      <p className="text-gray-700 font-medium">아직 오늘의 챌린지가 없어요</p>
      <p className="text-sm text-gray-500 mt-2">새 챌린지가 등록되면 알려드릴게요.</p>
      <Button variant="outline" onClick={onHistory} className="mt-4">
        지난 챌린지 보기
      </Button>
    </div>
  );
}
