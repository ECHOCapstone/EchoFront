import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Home, LineChart, User } from 'lucide-react';
import StatusHeader from './StatusHeader';
import { ApiException, statsApi, type Stats as StatsData } from '../api';

export default function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    statsApi
      .me()
      .then((data) => !cancelled && setStats(data))
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiException ? err.message : '통계를 불러오지 못했습니다.');
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date();
  const currentDay = today.getDate();

  const year = stats?.attendance.year ?? today.getFullYear();
  const month = stats?.attendance.month ?? today.getMonth() + 1;
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const days = stats?.attendance.days ?? {};

  const weeklyErrors = stats?.weeklyErrors ?? [];
  const maxErrorCount = weeklyErrors.length > 0 ? Math.max(...weeklyErrors.map((e) => e.count)) : 1;
  const badges = stats?.badges ?? [];

  const getAttendanceColor = (streakDays: number) => {
    if (streakDays === 0) return 'bg-gray-100';
    if (streakDays === 1) return 'bg-sky-100';
    if (streakDays === 2) return 'bg-sky-200';
    if (streakDays === 3) return 'bg-sky-300';
    if (streakDays === 4) return 'bg-sky-400';
    if (streakDays === 5) return 'bg-sky-500';
    if (streakDays === 6) return 'bg-sky-600';
    return 'bg-sky-700';
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 p-6 pb-24 overflow-y-auto">
        <StatusHeader />

        {loading && <p className="text-gray-500">불러오는 중...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {year}년 {month}월
          </h2>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-2">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const streakDays = Number(days[String(day)] ?? 0);
                const isToday = day === currentDay;
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors ${getAttendanceColor(
                      streakDays
                    )} ${isToday ? 'ring-1 ring-sky-500 ring-offset-1' : ''} ${
                      streakDays > 0 ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-1">연속 출석 단계</p>
              <div className="flex items-center gap-1 flex-wrap">
                {[1, 3, 5, 7].map((d) => (
                  <div key={d} className="flex items-center gap-0.5">
                    <div className={`w-3 h-3 rounded ${getAttendanceColor(d)}`}></div>
                    <span className="text-xs text-gray-600">{d}일{d === 7 ? '+' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">지난 일주일간 많이 틀린 발음</h2>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            {weeklyErrors.length === 0 ? (
              <p className="text-sm text-gray-500">집계된 오류가 아직 없어요.</p>
            ) : (
              <div className="space-y-4">
                {weeklyErrors.map((item) => (
                  <div key={item.sound} className="flex items-center gap-4">
                    <div className="w-12 text-center">
                      <span className="text-lg font-bold text-gray-900">{item.sound}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                        <div
                          className="bg-sky-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${(item.count / maxErrorCount) * 100}%` }}
                        >
                          <span className="text-xs font-medium text-white">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">업적</h2>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="grid grid-cols-3 gap-4">
              {badges.map((badge) => (
                <div key={badge.id} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center ${
                      badge.achieved
                        ? 'bg-gradient-to-br from-sky-100 to-sky-200'
                        : 'bg-gray-100'
                    }`}
                  >
                    <div
                      className={`w-16 h-16 rounded-full ${
                        badge.achieved ? 'bg-white' : 'bg-gray-50'
                      }`}
                    />
                  </div>
                  <p
                    className={`text-xs font-medium text-center ${
                      badge.achieved ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {badge.achieved ? badge.name : '???'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
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
            onClick={() => navigate('/stats')}
            className="flex flex-col items-center justify-center flex-1 h-full text-sky-500"
          >
            <LineChart size={28} strokeWidth={2.5} />
            <span className="text-xs font-medium mt-1">통계</span>
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
