import { useState } from 'react';
import { ChevronLeft, ChevronRight, Award, Lock } from 'lucide-react';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import { statsApi } from '../api';
import { useApiResource } from '../hooks/useApiResource';
import { useAuth } from '../auth/useAuth';
import { getAttendanceColor } from '../lib/attendance';
import { getBadgeImage } from './badgeImages';

export default function Stats() {
  const today = new Date();
  const { user } = useAuth();
  // 사용자가 보고 있는 캘린더 월. 화살표 클릭으로만 변경되고, 변경되면 새 데이터를 fetch 한다.
  const [calendar, setCalendar] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });
  const { data: stats, loading, error } = useApiResource(
    () => statsApi.me({ year: calendar.year, month: calendar.month }),
    [calendar.year, calendar.month],
    { errorFallback: '통계를 불러오지 못했습니다.' }
  );

  const currentDay = today.getDate();
  const isCurrentMonth =
    calendar.year === today.getFullYear() && calendar.month === today.getMonth() + 1;

  // 응답이 도착하기 전에도 빈 캘린더 골격을 그릴 수 있도록 stats 의존성 없이 calendar 상태만으로 계산한다.
  const year = calendar.year;
  const month = calendar.month;
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const shiftMonth = (delta: number) => {
    setCalendar((prev) => {
      const next = new Date(prev.year, prev.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  };

  // 미래 월로는 더 가지 못하게 한다 — 빈 캘린더만 보여주는 게 의미가 없다.
  const isFutureBlocked =
    calendar.year > today.getFullYear()
    || (calendar.year === today.getFullYear() && calendar.month >= today.getMonth() + 1);

  // 가입 월 이전으로도 갈 수 없다 — 사용자가 가입하지 않은 기간의 빈 캘린더 무한 탐색을 막는다.
  // user 가 아직 로드 안 됐으면 가드를 잠시 비활성화 (UX 손상 방지).
  const joinedAt = user?.createdAt ? new Date(user.createdAt) : null;
  const isPastBlocked = joinedAt
    ? calendar.year < joinedAt.getFullYear()
      || (calendar.year === joinedAt.getFullYear() && calendar.month <= joinedAt.getMonth() + 1)
    : false;

  const days = stats?.attendance.days ?? {};

  const weeklyErrors = stats?.weeklyErrors ?? [];
  const maxErrorCount = weeklyErrors.length > 0 ? Math.max(...weeklyErrors.map((e) => e.count)) : 1;
  const badges = stats?.badges ?? [];

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6 pb-24 overflow-y-auto">
        <StatusHeader />

        {loading && <p className="text-gray-500">불러오는 중...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => shiftMonth(-1)}
              disabled={isPastBlocked}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="지난 달"
            >
              <ChevronLeft size={22} className="text-gray-700" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {year}년 {month}월
            </h2>
            <button
              onClick={() => shiftMonth(1)}
              disabled={isFutureBlocked}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="다음 달"
            >
              <ChevronRight size={22} className="text-gray-700" />
            </button>
          </div>
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
                // 보고 있는 달이 실제 현재 월일 때만 '오늘' 강조 ring 을 적용한다.
                const isToday = isCurrentMonth && day === currentDay;
                // 배경이 연한 단계(streak 1~3, brand-100~300) 위에 흰 글씨면 가독성이 떨어진다.
                // 진한 배경(streak >= 4, brand-400 이상) 일 때만 흰 글씨를 쓴다.
                const textColor = streakDays >= 4 ? 'text-white' : 'text-gray-900';
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-md flex items-center justify-center text-sm font-medium transition-colors ${getAttendanceColor(
                      streakDays
                    )} ${isToday ? 'ring-1 ring-brand-500 ring-offset-1' : ''} ${textColor}`}
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
                          className="bg-brand-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
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
              {badges.map((badge) => {
                const badgeImage = badge.achieved ? getBadgeImage(badge.id) : undefined;
                return (
                  <div key={badge.id} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden ${
                        badge.achieved
                          ? 'bg-gradient-to-br from-brand-100 to-brand-200'
                          : 'bg-gray-100'
                      }`}
                    >
                      {badge.achieved
                        ? (badgeImage
                            ? <img src={badgeImage} alt={badge.name} className="w-full h-full object-contain" />
                            : <Award size={32} className="text-brand-600" />)
                        : <Lock size={26} className="text-gray-400" />}
                    </div>
                    {/* 미보유 배지의 이름도 회색으로 노출하여 다음 도전 목표가 분명하게 보이도록 한다. */}
                    <p
                      className={`text-xs font-medium text-center break-keep ${
                        badge.achieved ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {badge.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="stats" />
    </div>
  );
}
