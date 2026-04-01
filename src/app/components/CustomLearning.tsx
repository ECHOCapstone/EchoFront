import { useLocation, useNavigate } from 'react-router';
import { Home, LineChart, User, Volume2, CirclePlus } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';

export default function CustomLearning() {
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = location.state?.nickname || '사용자';

  const handleNavigation = (path: string) => {
    navigate(path, { state: { nickname } });
  };

  const handleSessionClick = () => {
    console.log('Untitled Session 클릭');
    navigate('/session-detail', { state: { nickname } });
  };

  const handleAddSession = () => {
    console.log('새 세션 추가');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 p-6 pb-24">
        {/* 상태 헤더 */}
        <StatusHeader streak={5} exp={250} />
        
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Volume2 size={32} className="text-sky-500" />
          <h1 className="text-3xl font-bold text-gray-900">내 학습 목록</h1>
        </div>

        {/* 학습 세션 목록 */}
        <div className="space-y-4">
          {/* Untitled Session 버튼 */}
          <Button
            onClick={handleSessionClick}
            variant="outline"
            className="w-full h-16 border-2 border-gray-300 hover:border-sky-500 hover:bg-sky-50 text-gray-900 text-lg font-medium rounded-2xl"
          >
            Untitled Session
          </Button>

          {/* 새 세션 추가 버튼 */}
          <button
            onClick={handleAddSession}
            className="w-full h-16 flex items-center justify-center text-sky-500 hover:bg-sky-50 rounded-2xl transition-colors"
          >
            <CirclePlus size={40} strokeWidth={2} />
          </button>
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