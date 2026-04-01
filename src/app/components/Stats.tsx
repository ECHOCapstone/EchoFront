import { useLocation, useNavigate } from 'react-router';
import { Home, LineChart, User } from 'lucide-react';
import { useState } from 'react';
import StatusHeader from './StatusHeader';

export default function Stats() {
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = location.state?.nickname || '사용자';

  const handleNavigation = (path: string) => {
    navigate(path, { state: { nickname } });
  };

  // 현재 날짜
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  // 이번 달 첫날과 마지막 날
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0: 일요일

  // 출석 데이터 (예시: 특정 날짜에 연속 출석일 수 저장)
  // 실제로는 서버에서 가져와야 함
  const [attendanceData] = useState<{ [key: number]: number }>({
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    10: 1,
    11: 2,
    12: 3,
    15: 1,
    20: 1,
    21: 2,
    22: 3,
    23: 4,
    24: 5,
    25: 6,
    26: 7,
    27: 8,
  });

  // 연속 출석일에 따른 색상
  const getAttendanceColor = (streakDays: number) => {
    if (streakDays === 0) return 'bg-gray-100';
    if (streakDays === 1) return 'bg-sky-100';
    if (streakDays === 2) return 'bg-sky-200';
    if (streakDays === 3) return 'bg-sky-300';
    if (streakDays === 4) return 'bg-sky-400';
    if (streakDays === 5) return 'bg-sky-500';
    if (streakDays === 6) return 'bg-sky-600';
    return 'bg-sky-700'; // 7일 이상
  };

  // 발음 오류 데이터
  const pronunciationErrors = [
    { sound: 'θ', count: 45 },
    { sound: 'ð', count: 38 },
    { sound: 'ʃ', count: 32 },
    { sound: 'ʒ', count: 28 },
    { sound: 'ŋ', count: 22 },
  ];

  const maxErrorCount = Math.max(...pronunciationErrors.map((p) => p.count));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 p-6 pb-24 overflow-y-auto">
        {/* 상태 헤더 */}
        <StatusHeader streak={5} exp={250} />
        
        {/* 출석 달력 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {currentYear}년 {currentMonth + 1}월
          </h2>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-2">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {/* 빈 칸 (월 시작 전) */}
              {Array.from({ length: startDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square"></div>
              ))}

              {/* 날짜 칸 */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const streakDays = attendanceData[day] || 0;
                const isToday = day === currentDate;

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors ${getAttendanceColor(
                      streakDays
                    )} ${
                      isToday ? 'ring-1 ring-sky-500 ring-offset-1' : ''
                    } ${streakDays > 0 ? 'text-white' : 'text-gray-700'}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-1">연속 출석 단계</p>
              <div className="flex items-center gap-1 flex-wrap">
                <div className="flex items-center gap-0.5">
                  <div className="w-3 h-3 rounded bg-sky-100"></div>
                  <span className="text-xs text-gray-600">1일</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-3 h-3 rounded bg-sky-300"></div>
                  <span className="text-xs text-gray-600">3일</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-3 h-3 rounded bg-sky-500"></div>
                  <span className="text-xs text-gray-600">5일</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-3 h-3 rounded bg-sky-700"></div>
                  <span className="text-xs text-gray-600">7일+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 많이 틀린 발음 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            지난 일주일간 많이 틀린 발음
          </h2>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="space-y-4">
              {pronunciationErrors.map((item) => (
                <div key={item.sound} className="flex items-center gap-4">
                  {/* 발음 기호 */}
                  <div className="w-12 text-center">
                    <span className="text-lg font-bold text-gray-900">{item.sound}</span>
                  </div>

                  {/* 막대 그래프 */}
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
          </div>
        </div>

        {/* 업적 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            업적
          </h2>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="grid grid-cols-3 gap-4">
              {/* 예시 배지 1: R/L 마스터 */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-sky-200 rounded-full flex items-center justify-center">
                  {/* 이미지 placeholder */}
                  <div className="w-16 h-16 bg-white rounded-full"></div>
                </div>
                <p className="text-xs font-medium text-gray-900 text-center">R/L 마스터!</p>
              </div>

              {/* 빈 배지 슬롯들 */}
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full"></div>
                  </div>
                  <p className="text-xs font-medium text-gray-400 text-center">???</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 네비게이션 바 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-20">
          {/* 홈 */}
          <button
            onClick={() => handleNavigation('/main')}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-sky-500 transition-colors"
          >
            <Home size={28} />
            <span className="text-xs font-medium mt-1">홈</span>
          </button>

          {/* 통계 */}
          <button
            onClick={() => handleNavigation('/stats')}
            className="flex flex-col items-center justify-center flex-1 h-full text-sky-500"
          >
            <LineChart size={28} strokeWidth={2.5} />
            <span className="text-xs font-medium mt-1">통계</span>
          </button>

          {/* 프로필 */}
          <button
            onClick={() => handleNavigation('/profile')}
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