// 회원 탈퇴 모달.
//   - 비밀번호 기반 계정은 현재 비밀번호 재입력으로 본인 확인 (사고성 탈퇴 방지).
//   - OAuth 전용 계정은 입력 칸을 숨기고 명시적 "탈퇴" 클릭만 요구.
//   - 탈퇴는 soft delete 라 30일 grace period 동안 학습 기록이 보존됨을 미리 알린다.

import { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { authApi } from '../../api/auth';
import { notifyApiError } from '../../lib/notify';

interface Props {
  open: boolean;
  hasPassword: boolean;
  onClose: () => void;
  onWithdrawn: () => void;
}

export default function WithdrawDialog({ open, hasPassword, onClose, onWithdrawn }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) return;
    setCurrentPassword('');
    setShow(false);
    setAcknowledged(false);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (hasPassword && !currentPassword) return;
    if (!acknowledged) return;
    setSubmitting(true);
    try {
      await authApi.withdraw(hasPassword ? currentPassword : undefined);
      toast.success('회원 탈퇴가 완료되었습니다.');
      onWithdrawn();
    } catch (err) {
      notifyApiError(err, '회원 탈퇴에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="회원 탈퇴"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-red-600">회원 탈퇴</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 leading-relaxed">
            탈퇴하면 로그인할 수 없게 되며, 학습 기록과 녹음 데이터는 개인정보처리방침에 따라
            <span className="font-semibold"> 30일 후 영구 삭제</span>됩니다. 30일 안에 같은 이메일로
            다시 가입하면 데이터를 복구할 수 없습니다.
          </div>

          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="wd-current" className="text-gray-700">현재 비밀번호</Label>
              <div className="relative">
                <Input
                  id="wd-current"
                  type={show ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-12 pr-10 border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {show ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1"
            />
            <span>위 안내를 읽고 이해했으며, 회원 탈퇴에 동의합니다.</span>
          </label>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={
                submitting
                || (hasPassword && !currentPassword)
                || !acknowledged
              }
              className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
            >
              {submitting ? '처리 중...' : '탈퇴'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
