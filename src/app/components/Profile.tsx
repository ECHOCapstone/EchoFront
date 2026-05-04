import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, FileText, Lock, LogOut, Pencil, User, UserX } from 'lucide-react';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import Footer from './Footer';
import TextEditDialog from './TextEditDialog';
import { authApi } from '../api';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';
import { notifyApiError } from '../lib/notify';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refresh } = useAuth();
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [updatingNickname, setUpdatingNickname] = useState(false);
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);

  const nickname = user?.nickname ?? '사용자';
  const email = user?.email ?? '';

  const handlePasswordChange = () => alert('비밀번호 변경은 추후 제공될 예정입니다.');
  const handleNotificationToggle = () => setNotificationEnabled((v) => !v);
  const handleTermsAndPolicy = () => alert('약관 및 정책은 추후 제공될 예정입니다.');

  const openNicknameDialog = () => {
    if (updatingNickname) return;
    setNicknameDialogOpen(true);
  };

  // 닉네임 변경은 PATCH /api/members/me/nickname → AuthContext.refresh() 한 번이면
  // StatusHeader 와 본 화면 모두 즉시 갱신된다.
  const handleNicknameSubmit = async (next: string) => {
    if (next === nickname) return;
    setUpdatingNickname(true);
    try {
      await authApi.changeNickname(next);
      await refresh();
    } catch (err) {
      notifyApiError(err, '닉네임 변경에 실패했습니다.');
    } finally {
      setUpdatingNickname(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('정말로 회원탈퇴 하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      alert('회원탈퇴는 추후 제공될 예정입니다.');
    }
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate(paths.login, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={48} className="text-sky-500" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{nickname}</h1>
            <button
              onClick={openNicknameDialog}
              disabled={updatingNickname}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              aria-label="닉네임 변경"
            >
              <Pencil size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">이메일</p>
            <p className="text-gray-900 font-medium">{email}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">닉네임</p>
              <p className="text-gray-900 font-medium">{nickname}</p>
            </div>
            <button
              onClick={openNicknameDialog}
              disabled={updatingNickname}
              className="flex items-center gap-1 px-3 h-9 bg-white border-2 border-gray-300 hover:border-sky-500 hover:bg-sky-50 text-gray-900 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Pencil size={14} className="text-gray-600" />
              <span>{updatingNickname ? '저장 중...' : '변경'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
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
              <span className="text-sm text-gray-600">{notificationEnabled ? 'ON' : 'OFF'}</span>
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

        <div className="mt-12">
          <Footer />
        </div>
      </div>

      <BottomNav active="profile" />

      <TextEditDialog
        open={nicknameDialogOpen}
        onOpenChange={setNicknameDialogOpen}
        title="닉네임 변경"
        description="다른 사용자에게 보여질 이름이에요."
        initialValue={nickname}
        placeholder="새 닉네임을 입력하세요"
        maxLength={30}
        submitLabel="저장"
        onSubmit={handleNicknameSubmit}
      />
    </div>
  );
}
