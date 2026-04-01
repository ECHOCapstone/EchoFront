import { useLocation, useNavigate } from 'react-router';
import { Home, LineChart, User, Lock, Bell, FileText, UserX, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import StatusHeader from './StatusHeader';

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = location.state?.nickname || '사용자';
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  const handleNavigation = (path: string) => {
    navigate(path, { state: { nickname } });
  };

  const handlePasswordChange = () => {
    alert('비밀번호 변경 기능');
    // 추후 비밀번호 변경 모달 또는 페이지로 연결
  };

  const handleNotificationToggle = () => {
    setNotificationEnabled(!notificationEnabled);
  };

  const handleTermsAndPolicy = () => {
    alert('약관 및 정책 페이지');
    // 추후 약관 페이지로 연결
  };

  const handleDeleteAccount = () => {
    if (confirm('정말로 회원탈퇴 하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      alert('회원탈퇴가 완료되었습니다.');
      navigate('/');
    }
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 p-6 pb-24">
        {/* 상태 헤더 */}
        <StatusHeader streak={5} exp={250} />
        
        {/* 프로필 헤더 */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={48} className="text-sky-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{nickname}</h1>
        </div>

        {/* 사용자 정보 */}
        <div className="mb-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">이메일</p>
            <p className="text-gray-900 font-medium">example@email.com</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">닉네임</p>
            <p className="text-gray-900 font-medium">{nickname}</p>
          </div>
        </div>

        {/* 메뉴 목록 */}
        <div className="space-y-3">
          {/* 비밀번호 설정 */}
          <button
            onClick={handlePasswordChange}
            className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-sky-100 rounded-full p-2">
                <Lock size={20} className="text-sky-500" />
              </div>
              <span className="font-medium text-gray-900">비밀번호 설정</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* 알림 on/off */}
          <button
            onClick={handleNotificationToggle}
            className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-sky-100 rounded-full p-2">
                <Bell size={20} className="text-sky-500" />
              </div>
              <span className="font-medium text-gray-900">알림</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {notificationEnabled ? 'ON' : 'OFF'}
              </span>
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  notificationEnabled ? 'bg-sky-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${
                    notificationEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`}
                />
              </div>
            </div>
          </button>

          {/* 약관 및 정책 */}
          <button
            onClick={handleTermsAndPolicy}
            className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-sky-100 rounded-full p-2">
                <FileText size={20} className="text-sky-500" />
              </div>
              <span className="font-medium text-gray-900">약관 및 정책</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          {/* 회원탈퇴 */}
          <button
            onClick={handleDeleteAccount}
            className="w-full bg-red-50 hover:bg-red-100 rounded-xl p-4 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-100 rounded-full p-2">
                <UserX size={20} className="text-red-500" />
              </div>
              <span className="font-medium text-red-600">회원탈퇴</span>
            </div>
            <span className="text-red-300">›</span>
          </button>
        </div>

        {/* 로그아웃 */}
        <div className="mt-12 text-center">
          <button
            onClick={handleLogout}
            className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 rounded-full p-2">
                <LogOut size={20} className="text-gray-500" />
              </div>
              <span className="font-medium text-gray-900">로그아웃</span>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        </div>

        {/* 저작권 */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-500">© O(1)</p>
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
            className="flex flex-col items-center justify-center flex-1 h-full text-sky-500"
          >
            <User size={28} strokeWidth={2.5} />
            <span className="text-xs font-medium mt-1">프로필</span>
          </button>
        </div>
      </nav>
    </div>
  );
}