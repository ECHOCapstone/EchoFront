import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { rankingApi } from '../api';
import { useApiResource } from '../hooks/useApiResource';
import { paths } from '../lib/paths';

export default function Ranking() {
  const navigate = useNavigate();
  const { data, loading, error } = useApiResource(
    () => rankingApi.today(),
    [],
    { errorFallback: '랭킹을 불러오지 못했습니다.' }
  );

  const visible = useMemo(() => {
    if (!data) return [];
    const myIdx = data.entries.findIndex((e) => e.isMe);
    if (myIdx < 0) return data.entries.slice(0, 5);
    const start = Math.max(0, myIdx - 2);
    const end = Math.min(data.entries.length, myIdx + 3);
    return data.entries.slice(start, end);
  }, [data]);

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

        <div className="flex items-center gap-3 mb-2">
          <Trophy size={32} className="text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">오늘의 랭킹</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          오늘의 추천 학습 ·{' '}
          <span className="font-medium text-gray-700">{data?.unitTitle ?? '...'}</span>
        </p>

        {loading && <p className="text-gray-500">불러오는 중...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {data && (
          <>
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-5 mb-6 text-white shadow-lg">
              <p className="text-sm opacity-90 mb-1">내 순위</p>
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{data.myRank}</span>
                  <span className="text-lg opacity-90">위 / {data.totalUsers}명</span>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-90">정확도</p>
                  <p className="text-2xl font-bold">{data.myAccuracy.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {visible.map((u) => (
                <div
                  key={u.rank}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 ${
                    u.isMe ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        u.isMe ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.rank}
                    </div>
                    <p
                      className={`text-lg ${
                        u.isMe ? 'font-bold text-brand-700' : 'font-medium text-gray-900'
                      }`}
                    >
                      {u.nickname}
                      {u.isMe && <span className="ml-2 text-xs text-brand-500">(나)</span>}
                    </p>
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      u.isMe ? 'text-brand-700' : 'text-gray-700'
                    }`}
                  >
                    {u.accuracy.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Button
                onClick={() => navigate(paths.main)}
                className="w-full h-14 bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold rounded-2xl"
              >
                홈으로 돌아가기
              </Button>
            </div>
          </>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
