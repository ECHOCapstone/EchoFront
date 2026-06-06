import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { rankingApi } from '../api';
import type { Ranking } from '../api';
import { useApiResource } from '../hooks/useApiResource';
import { paths } from '../lib/paths';

// 주간 발음 정확도 랭킹 화면. 4 가지 본인 상태 (활동 없음 / 임계 미통과 / Top N 안 / Top N 밖) 를
// 백엔드 메타 (myRank, myActivityCount, myEntryShown) 로 분기해 안내 문구를 다르게 노출한다.
export default function Ranking() {
  const navigate = useNavigate();
  const { data, loading, error } = useApiResource(
    () => rankingApi.weekly(),
    [],
    { errorFallback: '랭킹을 불러오지 못했습니다.' }
  );

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="flex justify-start mb-4">
          <button
            onClick={() => navigate(paths.main)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        <RankingHeader data={data} />

        {loading && <p className="text-gray-500">불러오는 중...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {data && <RankingBody data={data} />}

        <div className="mt-8">
          <Button
            onClick={() => navigate(paths.main)}
            className="w-full h-14 bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold rounded-2xl"
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>

      <BottomNav active="ranking" />
    </div>
  );
}

// 화면 상단의 타이틀과 집계 기간 안내. 데이터 로딩 전에는 windowDays 자리에 "..." 만 둔다.
function RankingHeader({ data }: { data: Ranking | null }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Trophy size={32} className="text-yellow-500" />
        <h1 className="text-3xl font-bold text-gray-900">주간 발음 정확도</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        최근 <span className="font-medium text-gray-700">{data?.windowDays ?? '...'}</span>일 ·{' '}
        <span className="font-medium text-gray-700">{data?.period ?? '...'}</span>
      </p>
    </>
  );
}

// 본인 카드 + 랭킹 리스트 + 임계 미통과 시 본인 행 별도 노출까지 묶는다.
function RankingBody({ data }: { data: Ranking }) {
  const ownStatus = useMemo(() => deriveOwnStatus(data), [data]);

  return (
    <>
      <OwnCard data={data} status={ownStatus} />

      {data.entries.length === 0 ? (
        <EmptyEntries minActivityCount={data.minActivityCount} />
      ) : (
        <div className="space-y-2">
          {data.entries.map((entry) => (
            <RankRow
              key={entry.rank}
              rank={entry.rank}
              nickname={entry.nickname}
              accuracy={entry.accuracy}
              activityCount={entry.activityCount}
              isMe={entry.isMe}
            />
          ))}

          {ownStatus.kind === 'qualifiedOutsideTop' && (
            <>
              <p className="text-center text-xs text-gray-400 py-2">···</p>
              <RankRow
                rank={data.myRank}
                nickname="나"
                accuracy={data.myAccuracy}
                activityCount={data.myActivityCount}
                isMe
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

// 본인 상태에 따라 강조 카드를 그린다. 각 케이스마다 안내 문구가 다르다.
function OwnCard({ data, status }: { data: Ranking; status: OwnStatus }) {
  const rankDisplay = data.myRank > 0 ? `${data.myRank}위` : '-';
  const accuracyDisplay = data.myActivityCount > 0 ? `${data.myAccuracy.toFixed(1)}%` : '—';

  return (
    <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-5 mb-6 text-white shadow-lg">
      <p className="text-sm opacity-90 mb-1">내 순위</p>
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold">{rankDisplay}</span>
          <span className="text-lg opacity-90">/ {data.totalRanked}명</span>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-90">평균 정확도</p>
          <p className="text-2xl font-bold">{accuracyDisplay}</p>
        </div>
      </div>
      <OwnStatusNote status={status} data={data} />
    </div>
  );
}

// 본인 상태별 한 줄 안내. 활동 없음 → 시작 권유, 미통과 → 잔여 횟수, 통과 → 격려.
function OwnStatusNote({ status, data }: { status: OwnStatus; data: Ranking }) {
  if (status.kind === 'noActivity') {
    return (
      <p className="mt-3 text-xs opacity-90">
        {data.minActivityCount}회 학습을 완료하면 랭킹에 합류해요.
      </p>
    );
  }
  if (status.kind === 'belowThreshold') {
    const remaining = data.minActivityCount - data.myActivityCount;
    return (
      <p className="mt-3 text-xs opacity-90">
        랭킹 합류까지 {remaining}회 남았어요 · 누적 {data.myActivityCount}회
      </p>
    );
  }
  if (status.kind === 'qualifiedInTop') {
    return (
      <p className="mt-3 text-xs opacity-90">
        주간 학습 {data.myActivityCount}회 · Top {data.entries.length} 안에 있어요
      </p>
    );
  }
  return (
    <p className="mt-3 text-xs opacity-90">
      주간 학습 {data.myActivityCount}회 · Top {data.entries.length} 진입까지 정확도를 높여 보세요
    </p>
  );
}

// 임계를 통과한 사용자가 한 명도 없을 때의 빈 상태.
function EmptyEntries({ minActivityCount }: { minActivityCount: number }) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
      이번 주 랭킹에 오른 사용자가 아직 없어요.
      <br />
      <span className="text-sm text-gray-400">
        {minActivityCount}회 이상 학습한 사용자부터 노출됩니다.
      </span>
    </div>
  );
}

// 랭킹 한 줄. Top N 안의 entries 와 임계 통과한 본인 행 별도 노출 양쪽에서 재사용한다.
function RankRow({
  rank,
  nickname,
  accuracy,
  activityCount,
  isMe,
}: {
  rank: number;
  nickname: string;
  accuracy: number;
  activityCount: number;
  isMe: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-2xl border-2 ${
        isMe ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            isMe ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {rank}
        </div>
        <div>
          <p
            className={`text-lg ${
              isMe ? 'font-bold text-brand-700' : 'font-medium text-gray-900'
            }`}
          >
            {nickname}
            {isMe && <span className="ml-2 text-xs text-brand-500">(나)</span>}
          </p>
          <p className="text-xs text-gray-500">학습 {activityCount}회</p>
        </div>
      </div>
      <p className={`text-lg font-bold ${isMe ? 'text-brand-700' : 'text-gray-700'}`}>
        {accuracy.toFixed(1)}%
      </p>
    </div>
  );
}

// 본인이 처한 상태 — UI 분기와 안내 문구 결정에 동시에 쓰인다.
type OwnStatus =
  | { kind: 'noActivity' }
  | { kind: 'belowThreshold' }
  | { kind: 'qualifiedInTop' }
  | { kind: 'qualifiedOutsideTop' };

function deriveOwnStatus(data: Ranking): OwnStatus {
  if (data.myActivityCount === 0) return { kind: 'noActivity' };
  if (data.myRank === 0) return { kind: 'belowThreshold' };
  if (data.myEntryShown) return { kind: 'qualifiedInTop' };
  return { kind: 'qualifiedOutsideTop' };
}
