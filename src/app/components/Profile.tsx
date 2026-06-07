import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, FileText, Lock, LogOut, Pencil, ShieldCheck, UserX } from 'lucide-react';
import booProfile from '@/assets/boo-pic/BOO23.png';
import StatusHeader from './StatusHeader';
import BottomNav from './layout/BottomNav';
import Footer from './Footer';
import TextEditDialog from './TextEditDialog';
import ChangePasswordDialog from './auth/ChangePasswordDialog';
import WithdrawDialog from './auth/WithdrawDialog';
import TermsModal from './auth/TermsModal';
import { authApi, legalApi, type TermsResponse } from '../api/auth';
import { useAuth } from '../auth/useAuth';
import { paths } from '../lib/paths';
import { notifyApiError, notifyInfo } from '../lib/notify';
import { useConfirm } from './ConfirmProvider';

// 알림 토글의 영속 키. localStorage 가 비활성화된 환경 (시크릿 모드 등) 에서도 안전한 기본값을 유지한다.
const NOTIFICATION_STORAGE_KEY = 'echo.notificationEnabled';

function readNotificationEnabled(): boolean {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refresh } = useAuth();
  const confirm = useConfirm();
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(readNotificationEnabled);
  const [updatingNickname, setUpdatingNickname] = useState(false);
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  // 약관 본문은 lazy 로드 — Profile 진입마다 받지 않고 사용자가 항목을 누른 시점에 한 번 가져온다.
  const [terms, setTerms] = useState<TermsResponse | null>(null);
  const [termsModal, setTermsModal] = useState<{ title: string; body: string } | null>(null);

  const nickname = user?.nickname ?? '사용자';
  const email = user?.email ?? '';
  // OAuth 전용 계정은 비밀번호 변경 / 본인 확인 칸을 가린다 — 백엔드 응답의 hasPassword 가 단일 출처.
  // user 가 아직 로드 안 됐을 때(undefined)는 true 로 가정해 메뉴를 빈 상태로 두지 않는다.
  const hasPassword = user?.hasPassword ?? true;

  const handlePasswordChange = () => {
    if (!hasPassword) {
      notifyInfo('소셜 로그인 전용 계정은 비밀번호가 없어요. 비밀번호 변경 대신 소셜 계정에서 보안을 관리해 주세요.');
      return;
    }
    setPasswordDialogOpen(true);
  };
  const handleNotificationToggle = () => {
    setNotificationEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, String(next));
      } catch {
        // localStorage 비활성화 환경 (시크릿 모드 등) 은 무시한다.
      }
      return next;
    });
  };

  // 사용자가 항목을 누른 시점에 약관 본문을 가져오고, 이미 받아 둔 캐시가 있으면 재사용한다.
  const openTerms = async (kind: 'service' | 'privacy') => {
    let data = terms;
    if (!data) {
      try {
        data = await legalApi.terms();
        setTerms(data);
      } catch (err) {
        notifyApiError(err, '약관을 불러오지 못했습니다.');
        return;
      }
    }
    setTermsModal({
      title: kind === 'service' ? '서비스 이용약관' : '개인정보처리방침',
      body: data.bodies[kind] ?? '약관 본문을 불러오지 못했습니다.',
    });
  };


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

  const handleDeleteAccount = () => setWithdrawDialogOpen(true);

  // 탈퇴 성공 후 호출되는 콜백. 토큰을 정리하고 로그인 화면으로 보낸다.
  const handleWithdrawn = async () => {
    setWithdrawDialogOpen(false);
    await logout();
    navigate(paths.login, { replace: true });
  };

  const handleLogout = async () => {
    const ok = await confirm({ title: '로그아웃', description: '로그아웃 하시겠습니까?', confirmLabel: '로그아웃' });
    if (!ok) return;
    await logout();
    navigate(paths.login, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto md:shadow-xl flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <StatusHeader />

        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img src={booProfile} alt="프로필" className="w-full h-full object-contain" />
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
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">닉네임</p>
            <p className="text-gray-900 font-medium">
              {updatingNickname ? '저장 중...' : nickname}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => navigate(paths.admin)}
              className="w-full bg-brand-50 hover:bg-brand-100 rounded-xl p-4 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-brand-100 rounded-full p-2">
                  <ShieldCheck size={20} className="text-brand-500" />
                </div>
                <span className="font-medium text-gray-900">관리자</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          )}

          <button
            onClick={handlePasswordChange}
            className={`w-full rounded-xl p-4 flex items-center justify-between transition-colors ${
              hasPassword ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${hasPassword ? 'bg-brand-100' : 'bg-gray-200'}`}>
                <Lock size={20} className={hasPassword ? 'text-brand-500' : 'text-gray-500'} />
              </div>
              <div className="text-left">
                <span className="block font-medium text-gray-900">비밀번호 변경</span>
                {!hasPassword && (
                  <span className="block text-xs text-gray-500">소셜 로그인 계정은 사용 불가</span>
                )}
              </div>
            </div>
            <span className="text-gray-400">›</span>
          </button>

          <button
            onClick={handleNotificationToggle}
            className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-brand-100 rounded-full p-2">
                <Bell size={20} className="text-brand-500" />
              </div>
              <span className="font-medium text-gray-900">알림</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{notificationEnabled ? 'ON' : 'OFF'}</span>
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  notificationEnabled ? 'bg-brand-500' : 'bg-gray-300'
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

          <div className="space-y-2">
            <button
              onClick={() => openTerms('service')}
              className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-brand-100 rounded-full p-2">
                  <FileText size={20} className="text-brand-500" />
                </div>
                <span className="font-medium text-gray-900">이용약관</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            <button
              onClick={() => openTerms('privacy')}
              className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-brand-100 rounded-full p-2">
                  <FileText size={20} className="text-brand-500" />
                </div>
                <span className="font-medium text-gray-900">개인정보처리방침</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          </div>

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

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />

      <WithdrawDialog
        open={withdrawDialogOpen}
        hasPassword={hasPassword}
        onClose={() => setWithdrawDialogOpen(false)}
        onWithdrawn={handleWithdrawn}
      />

      {termsModal && (
        <TermsModal
          title={termsModal.title}
          body={termsModal.body}
          onClose={() => setTermsModal(null)}
        />
      )}
    </div>
  );
}
