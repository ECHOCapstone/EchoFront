import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Volume2, Home, Mic, User, ArrowRight, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import StatusHeader from './StatusHeader';

export default function TongueTwister() {
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = location.state?.nickname || '사용자';
  
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [hasCompletedRecording, setHasCompletedRecording] = useState(false);

  // DB에서 가져올 랜덤 문장 (현재는 예시)
  const challengeSentence = "I slit the sheet, the sheet I slit, and on the slitted sheet I sit.";

  const handleNavigation = (path: string) => {
    navigate(path, { state: { nickname } });
  };

  const handlePlayAudio = () => {
    console.log('음성 재생:', challengeSentence);
    alert('음성 재생 기능은 실제 구현 시 TTS API를 사용합니다.');
  };

  const handleEndLearning = () => {
    if (confirm('학습을 끝내시겠습니까?')) {
      navigate('/recommended-learning', { state: { nickname } });
    }
  };

  const handleOpenRecordModal = () => {
    setShowRecordModal(true);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setHasRecording(false);
    console.log('녹음 시작');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setHasRecording(true);
    setHasCompletedRecording(true);
    console.log('녹음 완료');
  };

  const handleDiscardRecording = () => {
    setHasRecording(false);
    console.log('녹음 폐기');
  };

  const handleUseRecording = () => {
    if (!hasRecording) {
      alert('녹음을 먼저 완료해주세요.');
      return;
    }
    setShowRecordModal(false);
    setHasCompletedRecording(true);
    alert('녹음이 저장되었습니다!');
  };

  const handleGoToFeedback = () => {
    navigate('/feedbacks', { state: { nickname } });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 p-6 pb-24">
        {/* 상태 헤더 */}
        <StatusHeader streak={5} exp={250} />
        
        {/* 뒤로가기 버튼 */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        {/* 세션 제목 및 스피커 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">영어 잰말놀이</h1>
            </div>
            <button
              onClick={handlePlayAudio}
              className="p-3 bg-sky-500 hover:bg-sky-600 rounded-full transition-colors"
            >
              <Volume2 size={24} className="text-white" />
            </button>
          </div>
        </div>

        {/* 챌린지 번호 */}
        <div className="mb-2">
          <p className="text-lg font-bold text-gray-700">#1</p>
        </div>

        {/* 챌린지 문장 표시 */}
        <div className="mb-4">
          <div className="w-full min-h-64 p-4 border-2 border-gray-300 rounded-2xl bg-gray-50">
            <p className="text-lg text-gray-900 leading-relaxed">{challengeSentence}</p>
          </div>
        </div>

        {/* 안내 문구 */}
        <p className="text-sm text-gray-500 mb-6">
          하단의 녹음 버튼을 누르고 지시에 따라 발음해 보세요.
        </p>

        {/* 버튼들 */}
        <div className="space-y-3">
          {hasCompletedRecording && (
            <Button
              onClick={handleGoToFeedback}
              className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <span>피드백 보러 가기</span>
              <ArrowRight size={20} />
            </Button>
          )}
          <Button
            onClick={handleEndLearning}
            variant="outline"
            className="w-full h-12 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl"
          >
            학습 끝내기
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

          {/* 녹음 (통계 대신) */}
          <button
            onClick={handleOpenRecordModal}
            disabled={isRecording}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isRecording
                ? 'text-red-500'
                : 'text-gray-400 hover:text-sky-500'
            }`}
          >
            <div className={`${isRecording ? 'animate-pulse' : ''}`}>
              <Mic size={28} />
            </div>
            <span className="text-xs font-medium mt-1">
              {isRecording ? '녹음중...' : '녹음'}
            </span>
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

      {/* 녹음 모달 */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">녹음</h2>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-700" />
              </button>
            </div>

            {/* 녹음 상태 표시 */}
            {hasRecording && (
              <div className="mb-4 flex items-center gap-2 bg-sky-50 p-4 rounded-xl">
                <Check size={24} className="text-sky-500" />
                <p className="text-gray-900 font-medium">녹음 완료!</p>
              </div>
            )}

            {/* 녹음 시작/끝내기 버튼 */}
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-full h-14 flex items-center justify-center gap-3 bg-white border-2 ${
                isRecording 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-300 hover:border-sky-500 hover:bg-sky-50'
              } text-gray-900 font-medium rounded-xl transition-colors mb-6`}
            >
              <Mic size={24} className={`${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-600'}`} />
              <span>{isRecording ? '녹음 끝내기' : hasRecording ? '다시 녹음하기' : '녹음 시작'}</span>
            </button>

            {/* 사용하기 버튼 */}
            <Button
              onClick={handleUseRecording}
              disabled={!hasRecording}
              className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <span>사용하기</span>
              <ArrowRight size={24} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}