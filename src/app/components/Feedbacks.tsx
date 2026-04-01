import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Check, Home, LineChart, User, Zap } from 'lucide-react';
import StatusHeader from './StatusHeader';
import { Button } from './ui/button';
import { useState } from 'react';

export default function Feedbacks() {
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = location.state?.nickname || '사용자';
  const [showExpPopup, setShowExpPopup] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path, { state: { nickname } });
  };

  const handleCompleteAndGetExp = () => {
    setShowExpPopup(true);
  };

  const handleClosePopup = () => {
    setShowExpPopup(false);
    navigate('/main', { state: { nickname } });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 p-6 pb-24">
        {/* 상태 헤더 */}
        <StatusHeader streak={5} exp={250} />
        
        {/* 뒤로가기 버튼 */}
        <div className="flex justify-start mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
            <Check size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Feedbacks</h1>
        </div>

        {/* 임시 피드백 내용 */}
        <div className="space-y-6">
          <p className="text-gray-700 text-lg">많이 틀린 음소에 대한 피드백을 나열</p>
          <p className="text-gray-700 text-lg">조음 위치 이미지</p>
        </div>

        {/* 학습 완료 버튼 */}
        <div className="mt-8">
          <Button
            onClick={handleCompleteAndGetExp}
            className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white text-lg font-bold rounded-2xl"
          >
            학습 완료하고 경험치 획득
          </Button>
        </div>
      </div>

      {/* 경험치 획득 팝업 */}
      {showExpPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            {/* 이미지 placeholder 영역 */}
            <div className="w-full h-48 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl flex items-center justify-center mb-6">
              <div className="w-32 h-32 bg-white rounded-full"></div>
            </div>

            {/* 경험치 정보 */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Zap size={40} className="text-yellow-500 fill-yellow-500" />
                <span className="text-4xl font-bold text-gray-900">EXP +1000</span>
              </div>
              <p className="text-lg text-gray-600">학습을 완료했습니다!</p>
            </div>

            {/* 확인 버튼 */}
            <Button
              onClick={handleClosePopup}
              className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white text-lg font-bold rounded-2xl"
            >
              확인
            </Button>
          </div>
        </div>
      )}

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