import { useLocation, useNavigate } from 'react-router';
import { Home, LineChart, User, Flame, Star } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';

export default function RecommendedLearning() {
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = location.state?.nickname || '사용자';

  const handleNavigation = (path: string) => {
    navigate(path, { state: { nickname } });
  };

  const handleUnitClick = (unitPath: string) => {
    navigate(unitPath, { state: { nickname } });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 p-6 pb-24">
        {/* 상태 헤더 */}
        <StatusHeader streak={5} exp={250} />
        
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Flame size={32} className="text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">오늘의 추천 학습</h1>
        </div>

        {/* 학습 유닛 목록 */}
        <div className="space-y-4">
          {/* 영어 잰말놀이 */}
          <Button
            onClick={() => handleUnitClick('/tongue-twister')}
            variant="outline"
            className="w-full h-24 border-2 border-gray-300 hover:border-sky-500 hover:bg-sky-50 text-gray-900 rounded-2xl flex items-center justify-start px-6"
          >
            <div className="text-left flex items-center gap-3">
              <Star size={24} className="text-sky-500" />
              <div>
                <h3 className="text-xl font-bold mb-1">영어 잰말놀이</h3>
                <p className="text-sm text-gray-600">빠르게 발음 연습하기</p>
              </div>
            </div>
          </Button>

          {/* 발음 연습: R vs L */}
          <Button
            onClick={() => handleUnitClick('/pronunciation-practice')}
            variant="outline"
            className="w-full h-24 border-2 border-gray-300 hover:border-sky-500 hover:bg-sky-50 text-gray-900 rounded-2xl flex items-center justify-start px-6"
          >
            <div className="text-left flex items-center gap-3">
              <Star size={24} className="text-sky-500" />
              <div>
                <h3 className="text-xl font-bold mb-1">발음 연습: R vs L</h3>
                <p className="text-sm text-gray-600">헷갈리는 발음 구별하기</p>
              </div>
            </div>
          </Button>
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
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-sky-500 transition-colors"
          >
            <LineChart size={28} />
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